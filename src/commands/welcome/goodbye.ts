import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ChatInputCommandInteraction,
  GuildMember,
} from 'discord.js';
import { Command } from '../../types/command.js';
import { GuildService } from '../../services/guildService.js';
import { CustomEmbed, COLORS } from '../../utils/embeds.js';

export const goodbyeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('goodbye')
    .setDescription('Configure and test departure goodbye messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('Configure departure channel, message, and embed color')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel where goodbye messages will be posted')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('message')
            .setDescription('Message format ({username}, {server}, {memberCount})')
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt.setName('color').setDescription('Hex color code (e.g. #ED4245)').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('toggle')
        .setDescription('Enable or disable goodbye messages')
        .addBooleanOption((opt) =>
          opt.setName('enabled').setDescription('Enable or disable').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('test').setDescription('Send a test departure message to the configured channel')
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
      const color = interaction.options.getString('color');

      await GuildService.updateWelcomeSettings(guildId, {
        goodbyeEnabled: true,
        goodbyeChannelId: channel.id,
        ...(message && { goodbyeMessage: message }),
        ...(color && { goodbyeColor: color }),
      });

      const embed = CustomEmbed.success(
        'Goodbye System Configured',
        `Departure announcements have been set to <#${channel.id}> and enabled!`
      );
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (sub === 'toggle') {
      const enabled = interaction.options.getBoolean('enabled', true);
      await GuildService.updateWelcomeSettings(guildId, { goodbyeEnabled: enabled });

      const embed = CustomEmbed.info(
        'Goodbye System Status',
        `Goodbye messages are now **${enabled ? 'ENABLED' : 'DISABLED'}**.`
      );
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (sub === 'test') {
      const settings = await GuildService.getWelcomeSettings(guildId);
      if (!settings?.goodbyeChannelId) {
        await interaction.reply({
          embeds: [CustomEmbed.error('Error', 'No goodbye channel is configured yet! Use `/goodbye setup`.')],
          ephemeral: true,
        });
        return;
      }

      const channel = interaction.guild.channels.cache.get(settings.goodbyeChannelId);
      if (!channel || !channel.isTextBased()) {
        await interaction.reply({
          embeds: [CustomEmbed.error('Channel Error', 'Configured channel could not be found or is not a text channel.')],
          ephemeral: true,
        });
        return;
      }

      const member = interaction.member as GuildMember;
      const rawMsg = settings.goodbyeMessage || '{username} has left {server}. We now have {memberCount} members.';
      const formatted = rawMsg
        .replace(/{username}/g, interaction.user.username)
        .replace(/{server}/g, interaction.guild.name)
        .replace(/{memberCount}/g, interaction.guild.memberCount.toString());

      const embed = new CustomEmbed()
        .setTitle('Member Departed')
        .setDescription(formatted)
        .setColor((settings.goodbyeColor as any) || COLORS.ERROR)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: `${interaction.guild.name} • Remaining: ${interaction.guild.memberCount}` });

      await (channel as any).send({ embeds: [embed] });
      await interaction.reply({
        embeds: [CustomEmbed.success('Test Delivered', `Dispatched test departure message to <#${settings.goodbyeChannelId}>.`)],
        ephemeral: true,
      });
    }
  },
};
