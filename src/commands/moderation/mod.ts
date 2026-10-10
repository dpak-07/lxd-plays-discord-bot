import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  GuildMember,
  ChannelType,
} from 'discord.js';
import { Command } from '../../types/command.js';
import { ModerationService } from '../../services/moderationService.js';
import { canModerate } from '../../middleware/permissions.js';
import { CustomEmbed, COLORS } from '../../utils/embeds.js';

export const modCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Server moderation and safety commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((sub) =>
      sub
        .setName('warn')
        .setDescription('Issue a formal warning to a member')
        .addUserOption((opt) => opt.setName('user').setDescription('Target member').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for warning').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('warnings')
        .setDescription('View moderation warning history for a member')
        .addUserOption((opt) => opt.setName('user').setDescription('Target member').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('timeout')
        .setDescription('Temporarily timeout/mute a member')
        .addUserOption((opt) => opt.setName('user').setDescription('Target member').setRequired(true))
        .addIntegerOption((opt) => opt.setName('duration').setDescription('Timeout duration in minutes').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for timeout').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('kick')
        .setDescription('Kick a member from the server')
        .addUserOption((opt) => opt.setName('user').setDescription('Target member').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for kick').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('ban')
        .setDescription('Ban a member from the server')
        .addUserOption((opt) => opt.setName('user').setDescription('Target member').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for ban').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('unban')
        .setDescription('Unban a user by their user ID')
        .addStringOption((opt) => opt.setName('user_id').setDescription('User ID to unban').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for unban').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('purge')
        .setDescription('Bulk delete messages from the current channel (up to 100)')
        .addIntegerOption((opt) => opt.setName('amount').setDescription('Number of messages (1-100)').setMinValue(1).setMaxValue(100).setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('slowmode')
        .setDescription('Set channel slowmode cooldown')
        .addIntegerOption((opt) => opt.setName('seconds').setDescription('Seconds (0 to disable)').setMinValue(0).setMaxValue(21600).setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('lock')
        .setDescription('Lock the current channel to prevent members from sending messages')
    )
    .addSubcommand((sub) =>
      sub
        .setName('unlock')
        .setDescription('Unlock the current channel')
    )
    .addSubcommand((sub) =>
      sub
        .setName('case')
        .setDescription('Look up a moderation case by case number')
        .addIntegerOption((opt) => opt.setName('id').setDescription('Case number').setRequired(true))
    ),

  category: 'moderation',
  userPermissions: [PermissionFlagsBits.ModerateMembers],

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const moderator = interaction.member as GuildMember;

    // Helper for sending mod logs
    const sendModLog = async (embed: CustomEmbed) => {
      const settings = await ModerationService.getSettings(guildId);
      if (settings?.modLogChannelId) {
        const logChannel = interaction.guild!.channels.cache.get(settings.modLogChannelId);
        if (logChannel && logChannel.isTextBased()) {
          await (logChannel as any).send({ embeds: [embed] }).catch(() => {});
        }
      }
    };

    if (sub === 'warn') {
      const targetUser = interaction.options.getUser('user', true);
      const reason = interaction.options.getString('reason', true);
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

      if (targetMember) {
        const check = canModerate(moderator, targetMember);
        if (!check.canMod) {
          await interaction.reply({ embeds: [CustomEmbed.error('Permission Denied', check.reason!)], ephemeral: true });
          return;
        }
      }

      const caseNum = await ModerationService.logCase({
        guildId,
        action: 'WARN',
        targetId: targetUser.id,
        targetTag: targetUser.tag || targetUser.username,
        moderatorId: moderator.id,
        moderatorTag: moderator.user.tag || moderator.user.username,
        reason,
      });

      // Try notifying target in DM
      await targetUser.send(`⚠️ You received a warning in **${interaction.guild.name}** for: *${reason}*`).catch(() => {});

      const embed = CustomEmbed.warn(
        `Case #${caseNum} | Member Warned`,
        `**Target:** <@${targetUser.id}> (${targetUser.id})\n**Moderator:** <@${moderator.id}>\n**Reason:** ${reason}`
      );
      await sendModLog(embed);
      await interaction.reply({ embeds: [embed] });
    } else if (sub === 'warnings') {
      const targetUser = interaction.options.getUser('user', true);
      const warnings = await ModerationService.getWarnings(guildId, targetUser.id);

      const embed = new CustomEmbed()
        .setTitle(`📜 Warning History — ${targetUser.username}`)
        .setColor(COLORS.WARNING)
        .setDescription(
          warnings.length === 0
            ? 'No recorded warnings for this user.'
            : warnings
                .map(
                  (w) =>
                    `• **Case #${w.caseNumber}** (${w.createdAt?.toLocaleDateString()}): ${w.reason} (by <@${w.moderatorId}>)`
                )
                .join('\n')
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (sub === 'timeout') {
      const targetUser = interaction.options.getUser('user', true);
      const minutes = interaction.options.getInteger('duration', true);
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

      if (!targetMember) {
        await interaction.reply({ embeds: [CustomEmbed.error('Error', 'Member is not in the server.')], ephemeral: true });
        return;
      }

      const check = canModerate(moderator, targetMember);
      if (!check.canMod) {
        await interaction.reply({ embeds: [CustomEmbed.error('Permission Denied', check.reason!)], ephemeral: true });
        return;
      }

      await targetMember.timeout(minutes * 60 * 1000, reason);

      const caseNum = await ModerationService.logCase({
        guildId,
        action: 'TIMEOUT',
        targetId: targetUser.id,
        targetTag: targetUser.tag || targetUser.username,
        moderatorId: moderator.id,
        moderatorTag: moderator.user.tag || moderator.user.username,
        reason,
        durationMinutes: minutes,
      });

      const embed = CustomEmbed.warn(
        `Case #${caseNum} | Member Timed Out`,
        `**Target:** <@${targetUser.id}>\n**Duration:** ${minutes} minutes\n**Moderator:** <@${moderator.id}>\n**Reason:** ${reason}`
      );
      await sendModLog(embed);
      await interaction.reply({ embeds: [embed] });
    } else if (sub === 'kick') {
      const targetUser = interaction.options.getUser('user', true);
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

      if (!targetMember) {
        await interaction.reply({ embeds: [CustomEmbed.error('Error', 'Member is not in the server.')], ephemeral: true });
        return;
      }

      const check = canModerate(moderator, targetMember);
      if (!check.canMod) {
        await interaction.reply({ embeds: [CustomEmbed.error('Permission Denied', check.reason!)], ephemeral: true });
        return;
      }

      await targetMember.kick(reason);

      const caseNum = await ModerationService.logCase({
        guildId,
        action: 'KICK',
        targetId: targetUser.id,
        targetTag: targetUser.tag || targetUser.username,
        moderatorId: moderator.id,
        moderatorTag: moderator.user.tag || moderator.user.username,
        reason,
      });

      const embed = CustomEmbed.error(
        `Case #${caseNum} | Member Kicked`,
        `**Target:** <@${targetUser.id}>\n**Moderator:** <@${moderator.id}>\n**Reason:** ${reason}`
      );
      await sendModLog(embed);
      await interaction.reply({ embeds: [embed] });
    } else if (sub === 'ban') {
      const targetUser = interaction.options.getUser('user', true);
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

      if (targetMember) {
        const check = canModerate(moderator, targetMember);
        if (!check.canMod) {
          await interaction.reply({ embeds: [CustomEmbed.error('Permission Denied', check.reason!)], ephemeral: true });
          return;
        }
      }

      await interaction.guild.bans.create(targetUser.id, { reason });

      const caseNum = await ModerationService.logCase({
        guildId,
        action: 'BAN',
        targetId: targetUser.id,
        targetTag: targetUser.tag || targetUser.username,
        moderatorId: moderator.id,
        moderatorTag: moderator.user.tag || moderator.user.username,
        reason,
      });

      const embed = CustomEmbed.error(
        `Case #${caseNum} | Member Banned`,
        `**Target:** ${targetUser.tag || targetUser.username} (${targetUser.id})\n**Moderator:** <@${moderator.id}>\n**Reason:** ${reason}`
      );
      await sendModLog(embed);
      await interaction.reply({ embeds: [embed] });
    } else if (sub === 'unban') {
      const userId = interaction.options.getString('user_id', true);
      const reason = interaction.options.getString('reason') || 'No reason provided';

      await interaction.guild.bans.remove(userId, reason);

      const caseNum = await ModerationService.logCase({
        guildId,
        action: 'UNBAN',
        targetId: userId,
        targetTag: userId,
        moderatorId: moderator.id,
        moderatorTag: moderator.user.tag || moderator.user.username,
        reason,
      });

      const embed = CustomEmbed.success(
        `Case #${caseNum} | User Unbanned`,
        `**Target ID:** ${userId}\n**Moderator:** <@${moderator.id}>\n**Reason:** ${reason}`
      );
      await sendModLog(embed);
      await interaction.reply({ embeds: [embed] });
    } else if (sub === 'purge') {
      const amount = interaction.options.getInteger('amount', true);
      const channel = interaction.channel;
      if (!channel || !channel.isTextBased() || !('bulkDelete' in channel)) {
        await interaction.reply({ embeds: [CustomEmbed.error('Error', 'Cannot purge in this channel.')], ephemeral: true });
        return;
      }

      const deleted = await (channel as any).bulkDelete(amount, true);
      await interaction.reply({
        embeds: [CustomEmbed.success('Purge Complete', `Purged ${deleted.size} messages from <#${channel.id}>.`)],
        ephemeral: true,
      });
    } else if (sub === 'slowmode') {
      const seconds = interaction.options.getInteger('seconds', true);
      const channel = interaction.channel;
      if (!channel || !('setRateLimitPerUser' in channel)) {
        await interaction.reply({ embeds: [CustomEmbed.error('Error', 'Cannot set slowmode in this channel.')], ephemeral: true });
        return;
      }

      await (channel as any).setRateLimitPerUser(seconds);
      await interaction.reply({
        embeds: [
          CustomEmbed.success(
            'Slowmode Updated',
            seconds === 0 ? 'Slowmode has been disabled.' : `Slowmode set to **${seconds} seconds** per member.`
          ),
        ],
      });
    } else if (sub === 'lock') {
      const channel = interaction.channel;
      if (!channel || !('permissionOverwrites' in channel)) {
        await interaction.reply({ embeds: [CustomEmbed.error('Error', 'Cannot lock this channel.')], ephemeral: true });
        return;
      }

      await (channel as any).permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: false,
      });

      await interaction.reply({
        embeds: [CustomEmbed.warn('Channel Locked', 'This channel has been locked. Ordinary members cannot send messages.')],
      });
    } else if (sub === 'unlock') {
      const channel = interaction.channel;
      if (!channel || !('permissionOverwrites' in channel)) {
        await interaction.reply({ embeds: [CustomEmbed.error('Error', 'Cannot unlock this channel.')], ephemeral: true });
        return;
      }

      await (channel as any).permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: null,
      });

      await interaction.reply({
        embeds: [CustomEmbed.success('Channel Unlocked', 'This channel has been unlocked.')],
      });
    } else if (sub === 'case') {
      const caseId = interaction.options.getInteger('id', true);
      const caseData = await ModerationService.getCase(guildId, caseId);

      if (!caseData) {
        await interaction.reply({ embeds: [CustomEmbed.error('Not Found', `Case #${caseId} does not exist.`)], ephemeral: true });
        return;
      }

      const embed = new CustomEmbed()
        .setTitle(`Case #${caseData.caseNumber} — [${caseData.action}]`)
        .setColor(
          caseData.action === 'BAN' || caseData.action === 'KICK'
            ? COLORS.ERROR
            : caseData.action === 'TIMEOUT' || caseData.action === 'WARN'
            ? COLORS.WARNING
            : COLORS.SUCCESS
        )
        .addFields(
          { name: 'Target', value: `<@${caseData.targetId}> (${caseData.targetTag})`, inline: true },
          { name: 'Moderator', value: `<@${caseData.moderatorId}> (${caseData.moderatorTag})`, inline: true },
          { name: 'Date', value: caseData.createdAt?.toLocaleString() || 'Unknown', inline: true },
          { name: 'Reason', value: caseData.reason, inline: false },
          ...(caseData.durationMinutes ? [{ name: 'Duration', value: `${caseData.durationMinutes} minutes`, inline: true }] : [])
        );

      await interaction.reply({ embeds: [embed] });
    }
  },
};
