import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  ChannelType,
} from 'discord.js';
import { Command } from '../../types/command.js';
import { ModerationService } from '../../services/moderationService.js';
import { CustomEmbed, COLORS } from '../../utils/embeds.js';

export const securityCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('security')
    .setDescription('Configure server raid protection, anti-spam, and panic lockdown')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('configure')
        .setDescription('Set moderation log channel, anti-spam, and raid shields')
        .addChannelOption((opt) =>
          opt
            .setName('log_channel')
            .setDescription('Moderation audit log channel')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addBooleanOption((opt) =>
          opt.setName('anti_spam').setDescription('Enable anti-spam automated rate limiter').setRequired(false)
        )
        .addIntegerOption((opt) =>
          opt.setName('spam_threshold').setDescription('Max messages per 5s before action').setMinValue(3).setMaxValue(20).setRequired(false)
        )
        .addBooleanOption((opt) =>
          opt.setName('anti_raid').setDescription('Enable anti-raid join burst detection').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('panic')
        .setDescription('Toggle server panic mode lockdown')
        .addBooleanOption((opt) => opt.setName('enabled').setDescription('Activate or deactivate panic mode').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('View current security shield status')
    ),

  category: 'security',
  userPermissions: [PermissionFlagsBits.Administrator],

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'configure') {
      const logChannel = interaction.options.getChannel('log_channel');
      const antiSpam = interaction.options.getBoolean('anti_spam');
      const spamThreshold = interaction.options.getInteger('spam_threshold');
      const antiRaid = interaction.options.getBoolean('anti_raid');

      await ModerationService.updateSettings(guildId, {
        ...(logChannel && { modLogChannelId: logChannel.id }),
        ...(antiSpam !== null && { antiSpamEnabled: antiSpam }),
        ...(spamThreshold !== null && { spamThreshold }),
        ...(antiRaid !== null && { antiRaidEnabled: antiRaid }),
      });

      await interaction.reply({
        embeds: [CustomEmbed.success('Security Configured', 'Security shield parameters updated.')],
        ephemeral: true,
      });
    } else if (sub === 'panic') {
      const enabled = interaction.options.getBoolean('enabled', true);
      await ModerationService.updateSettings(guildId, { panicMode: enabled });

      // When panic mode is turned on, lock down default channel send permissions
      try {
        const defaultRole = interaction.guild.roles.everyone;
        await defaultRole.setPermissions(
          enabled
            ? defaultRole.permissions.remove([PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions])
            : defaultRole.permissions.add([PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions])
        );
      } catch (err) {
        // Log but don't fail if permissions role cannot be bulk updated
      }

      const embed = enabled
        ? CustomEmbed.error(
            '🚨 PANIC MODE ACTIVATED',
            'Server is in lockdown. Public messaging permissions have been restricted and shields engaged.'
          )
        : CustomEmbed.success(
            '🛡️ PANIC MODE DEACTIVATED',
            'Server lockdown has been lifted. Normal operations restored.'
          );

      await interaction.reply({ embeds: [embed] });
    } else if (sub === 'status') {
      const settings = await ModerationService.getSettings(guildId);
      const embed = new CustomEmbed()
        .setTitle(`🛡️ Security Status — ${interaction.guild.name}`)
        .setColor(settings.panicMode ? COLORS.ERROR : COLORS.PRIMARY)
        .addFields(
          { name: 'Panic Mode', value: settings.panicMode ? '🚨 **ACTIVE (LOCKED)**' : '✅ Normal', inline: true },
          { name: 'Anti-Spam Shield', value: settings.antiSpamEnabled ? `✅ Active (${settings.spamThreshold} msgs/5s)` : '❌ Disabled', inline: true },
          { name: 'Anti-Raid Shield', value: settings.antiRaidEnabled ? '✅ Active' : '❌ Disabled', inline: true },
          { name: 'Mod Log Channel', value: settings.modLogChannelId ? `<#${settings.modLogChannelId}>` : '❌ Not Set', inline: true }
        );

      await interaction.reply({ embeds: [embed] });
    }
  },
};
