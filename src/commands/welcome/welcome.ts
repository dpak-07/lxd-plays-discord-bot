import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ChatInputCommandInteraction,
  GuildMember,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  AttachmentBuilder,
} from 'discord.js';
import { Command } from '../../types/command.js';
import { GuildService } from '../../services/guildService.js';
import { CustomEmbed, COLORS } from '../../utils/embeds.js';
import { generateWelcomeCard } from '../../utils/cardGenerator.js';

export const welcomeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configure and test welcome greetings for new members')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('Configure the welcome channel, message, title, and rules URL')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel where welcome messages will be posted')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('message')
            .setDescription('Message format ({user}, {username}, {server}, {memberCount})')
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt.setName('title').setDescription('Embed title (e.g., Welcome to our community!)').setRequired(false)
        )
        .addStringOption((opt) =>
          opt.setName('color').setDescription('Hex color code (e.g. #5865F2)').setRequired(false)
        )
        .addBooleanOption((opt) =>
          opt.setName('dm').setDescription('Send welcome message directly in user DM').setRequired(false)
        )
        .addStringOption((opt) =>
          opt.setName('image').setDescription('Banner image URL (e.g., https://.../banner.png)').setRequired(false)
        )
        .addStringOption((opt) =>
          opt.setName('rules_url').setDescription('URL link for rules or verification button').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('toggle')
        .setDescription('Enable or disable welcome messages')
        .addBooleanOption((opt) =>
          opt.setName('enabled').setDescription('Enable or disable').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('preview').setDescription('Preview your server welcome embed')
    )
    .addSubcommand((sub) =>
      sub.setName('test').setDescription('Send a test welcome message to the configured channel')
    ),

  category: 'welcome',
  userPermissions: [PermissionFlagsBits.Administrator],

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'setup') {
      const channel = interaction.options.getChannel('channel', true);
      const message = interaction.options.getString('message');
      const title = interaction.options.getString('title');
      const color = interaction.options.getString('color');
      const dm = interaction.options.getBoolean('dm');
      const image = interaction.options.getString('image');
      const rulesUrl = interaction.options.getString('rules_url');

      await GuildService.updateWelcomeSettings(guildId, {
        welcomeEnabled: true,
        welcomeChannelId: channel.id,
        ...(message && { welcomeMessage: message }),
        ...(title && { welcomeTitle: title }),
        ...(color && { welcomeColor: color }),
        ...(dm !== null && { welcomeDm: dm }),
        ...(image && { welcomeImageUrl: image }),
        ...(rulesUrl && { rulesUrl }),
      });

      const embed = CustomEmbed.success(
        'Welcome System Configured',
        `Welcome announcements have been set to <#${channel.id}> and enabled!\n\nUse \`/welcome preview\` to preview the card or \`/welcome test\` to test delivery.`
      );
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (sub === 'toggle') {
      const enabled = interaction.options.getBoolean('enabled', true);
      await GuildService.updateWelcomeSettings(guildId, { welcomeEnabled: enabled });

      const embed = CustomEmbed.info(
        'Welcome System Status',
        `Welcome messages are now **${enabled ? 'ENABLED' : 'DISABLED'}**.`
      );
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (sub === 'preview' || sub === 'test') {
      const settings = await GuildService.getWelcomeSettings(guildId);
      const member = interaction.member as GuildMember;

      const rawMsg = settings?.welcomeMessage || 'Welcome {user} to {server}! You are member #{memberCount}.';
      const formatted = rawMsg
        .replace(/{user}/g, `<@${interaction.user.id}>`)
        .replace(/{username}/g, interaction.user.username)
        .replace(/{server}/g, interaction.guild.name)
        .replace(/{memberCount}/g, interaction.guild.memberCount.toString());

      const embed = new CustomEmbed()
        .setTitle(settings?.welcomeTitle || 'Welcome to the server!')
        .setDescription(formatted)
        .setColor((settings?.welcomeColor as any) || COLORS.PRIMARY)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: `${interaction.guild.name} • Member #${interaction.guild.memberCount}` });

      // Generate card dynamically in-memory buffer (zero disk accumulation)
      const imageBuffer = await generateWelcomeCard({
        avatarUrl: member.user.displayAvatarURL({ extension: 'png', size: 256 }),
        username: member.user.username,
        guildName: interaction.guild.name,
        memberCount: interaction.guild.memberCount,
        customBannerPathOrUrl: settings?.welcomeImageUrl || undefined,
      });

      const attachment = new AttachmentBuilder(imageBuffer, { name: 'welcome-card.png' });
      embed.setImage('attachment://welcome-card.png');

      const row = new ActionRowBuilder<ButtonBuilder>();
      if (settings?.rulesUrl) {
        row.addComponents(
          new ButtonBuilder()
            .setLabel('Read Rules & Guidelines')
            .setStyle(ButtonStyle.Link)
            .setURL(settings.rulesUrl)
        );
      }

      if (sub === 'preview') {
        await interaction.reply({
          content: '👁️ **Preview Mode:** Here is how new members will see the welcome greeting:',
          embeds: [embed],
          files: [attachment],
          components: settings?.rulesUrl ? [row] : [],
          ephemeral: true,
        });
      } else {
        if (!settings?.welcomeChannelId) {
          await interaction.reply({
            embeds: [CustomEmbed.error('Error', 'No welcome channel is configured yet! Use `/welcome setup`.')],
            ephemeral: true,
          });
          return;
        }

        const channel = interaction.guild.channels.cache.get(settings.welcomeChannelId);
        if (!channel || !channel.isTextBased()) {
          await interaction.reply({
            embeds: [CustomEmbed.error('Channel Error', 'Configured channel could not be found or is not a text channel.')],
            ephemeral: true,
          });
          return;
        }

        await (channel as any).send({
          embeds: [embed],
          files: [attachment],
          components: settings?.rulesUrl ? [row] : [],
        });

        await interaction.reply({
          embeds: [CustomEmbed.success('Test Delivered', `Dispatched test welcome greeting to <#${settings.welcomeChannelId}>.`)],
          ephemeral: true,
        });
      }
    }
  },
};
