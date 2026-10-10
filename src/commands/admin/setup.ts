import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { Command } from '../../types/command.js';
import { CustomEmbed, COLORS } from '../../utils/embeds.js';
import { GuildService } from '../../services/guildService.js';
import { LevelService } from '../../services/levelService.js';
import { ModerationService } from '../../services/moderationService.js';
import { RoleService } from '../../services/roleService.js';

export const setupCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Guided administrator dashboard and initial server setup wizard')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  category: 'admin',
  userPermissions: [PermissionFlagsBits.Administrator],

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const guild = interaction.guild;
    const botMember = guild.members.me;

    // Permissions check
    const requiredPerms = [
      PermissionFlagsBits.ManageGuild,
      PermissionFlagsBits.ManageRoles,
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.ModerateMembers,
      PermissionFlagsBits.KickMembers,
      PermissionFlagsBits.BanMembers,
    ];

    const missingPerms = requiredPerms.filter((p) => !botMember?.permissions.has(p));

    const welcome = await GuildService.getWelcomeSettings(guild.id);
    const leveling = await LevelService.getSettings(guild.id);
    const mod = await ModerationService.getSettings(guild.id);
    const verify = await RoleService.getVerificationSettings(guild.id);

    const embed = new CustomEmbed()
      .setTitle(`🛠️ Server Setup & Health Dashboard — ${guild.name}`)
      .setColor(missingPerms.length === 0 ? COLORS.SUCCESS : COLORS.WARNING)
      .setDescription(
        'Use this overview to verify bot configuration, module statuses, and ensure the bot has all required permissions.'
      )
      .addFields(
        {
          name: '🔐 Bot Permission Health',
          value:
            missingPerms.length === 0
              ? '✅ **All essential bot permissions granted**'
              : `⚠️ **Missing Permissions:** Need Manage Roles/Channels/Members to execute full features!`,
          inline: false,
        },
        {
          name: '👋 Welcome Module',
          value: welcome?.welcomeEnabled ? `✅ Enabled (<#${welcome.welcomeChannelId}>)` : '❌ Disabled (`/welcome setup`)',
          inline: true,
        },
        {
          name: '⭐ Leveling Module',
          value: leveling?.enabled ? `✅ Enabled (${leveling.minXp}-${leveling.maxXp} XP)` : '❌ Disabled (`/level configure`)',
          inline: true,
        },
        {
          name: '🛡️ Moderation Shields',
          value: mod?.modLogChannelId ? `✅ Log: <#${mod.modLogChannelId}>` : '❌ Log not set (`/security configure`)',
          inline: true,
        },
        {
          name: '🏷️ Verification Gate',
          value: verify?.enabled ? `✅ Active (<#${verify.channelId}>)` : '❌ Inactive (`/verify setup`)',
          inline: true,
        },
        {
          name: '🚀 Quick Action Commands',
          value:
            '• `/welcome setup` — Configure arrival announcements\n' +
            '• `/verify setup` — Deploy click-to-verify gate\n' +
            '• `/security configure` — Set moderation audit log\n' +
            '• `/level configure` — Fine-tune chat XP rates\n' +
            '• `/ticket setup` — Deploy support desk',
          inline: false,
        }
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
