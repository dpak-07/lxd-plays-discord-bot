import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { Command } from '../../types/command.js';
import { RoleService } from '../../services/roleService.js';
import { CustomEmbed, COLORS } from '../../utils/embeds.js';

export const verifyCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Configure and test button-based server verification')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('Create a verification gate with a clickable button')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Verification channel')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addRoleOption((opt) =>
          opt.setName('role').setDescription('Verified role given to members').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('message').setDescription('Custom verification instructions').setRequired(false)
        )
        .addStringOption((opt) =>
          opt.setName('button_label').setDescription('Button text label (default: Verify)').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Check verification system status')
    ),

  category: 'roles',
  userPermissions: [PermissionFlagsBits.Administrator],

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'setup') {
      const channel = interaction.options.getChannel('channel', true);
      const role = interaction.options.getRole('role', true);
      const instruction = interaction.options.getString('message') || 'Click the button below to verify yourself and gain server access.';
      const buttonLabel = interaction.options.getString('button_label') || 'Verify';

      await RoleService.updateVerificationSettings(guildId, {
        enabled: true,
        channelId: channel.id,
        verifiedRoleId: role.id,
        instructionMessage: instruction,
        buttonLabel,
      });

      const embed = new CustomEmbed()
        .setTitle('🛡️ Member Verification')
        .setDescription(instruction)
        .setColor(COLORS.PRIMARY);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`verify_action_${guildId}`)
          .setLabel(buttonLabel)
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success)
      );

      const targetChannel = interaction.guild.channels.cache.get(channel.id);
      if (targetChannel && targetChannel.isTextBased()) {
        await (targetChannel as any).send({ embeds: [embed], components: [row] });
      }

      await interaction.reply({
        embeds: [CustomEmbed.success('Verification Deployed', `Verification gate published to <#${channel.id}>. Members will be assigned <@&${role.id}> on click.`)],
        ephemeral: true,
      });
    } else if (sub === 'status') {
      const settings = await RoleService.getVerificationSettings(guildId);
      const embed = new CustomEmbed()
        .setTitle('Verification System Status')
        .addFields(
          { name: 'Status', value: settings.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'Channel', value: settings.channelId ? `<#${settings.channelId}>` : 'None', inline: true },
          { name: 'Role Awarded', value: settings.verifiedRoleId ? `<@&${settings.verifiedRoleId}>` : 'None', inline: true }
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
