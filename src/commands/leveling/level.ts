import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  ChannelType,
} from 'discord.js';
import { Command } from '../../types/command.js';
import { LevelService } from '../../services/levelService.js';
import { CustomEmbed } from '../../utils/embeds.js';
import { db } from '../../database/db.js';
import { levelRewards, xpExceptions, xpMultipliers } from '../../database/schema/index.js';
import { eq, and } from 'drizzle-orm';

export const levelAdminCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Configure XP rates, cooldowns, multipliers, and manage member levels')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('configure')
        .setDescription('Configure XP rewards and announcements')
        .addBooleanOption((opt) => opt.setName('enabled').setDescription('Enable leveling').setRequired(false))
        .addIntegerOption((opt) => opt.setName('min_xp').setDescription('Minimum XP per message').setRequired(false))
        .addIntegerOption((opt) => opt.setName('max_xp').setDescription('Maximum XP per message').setRequired(false))
        .addIntegerOption((opt) => opt.setName('cooldown').setDescription('Cooldown in seconds').setRequired(false))
        .addChannelOption((opt) =>
          opt
            .setName('announcement_channel')
            .setDescription('Channel for level up alerts')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('Set a user XP directly')
        .addUserOption((opt) => opt.setName('user').setDescription('Target user').setRequired(true))
        .addIntegerOption((opt) => opt.setName('xp').setDescription('XP amount').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('reset')
        .setDescription('Reset XP for a specific user or the whole server')
        .addUserOption((opt) => opt.setName('user').setDescription('Target user (leave blank for whole server)').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('reward')
        .setDescription('Assign a role reward for reaching a level')
        .addIntegerOption((opt) => opt.setName('level').setDescription('Target Level').setRequired(true))
        .addRoleOption((opt) => opt.setName('role').setDescription('Role to award').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('multiplier')
        .setDescription('Set XP multiplier for a role')
        .addRoleOption((opt) => opt.setName('role').setDescription('Target Role').setRequired(true))
        .addIntegerOption((opt) => opt.setName('multiplier').setDescription('Multiplier factor (e.g. 2 for 2x)').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('ignore-channel')
        .setDescription('Toggle XP earning in a specific channel')
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('Channel to ignore/unignore').addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('ignore-role')
        .setDescription('Toggle XP earning for a specific role')
        .addRoleOption((opt) => opt.setName('role').setDescription('Role to ignore/unignore').setRequired(true))
    ),

  category: 'leveling',
  userPermissions: [PermissionFlagsBits.Administrator],

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'configure') {
      const enabled = interaction.options.getBoolean('enabled');
      const minXp = interaction.options.getInteger('min_xp');
      const maxXp = interaction.options.getInteger('max_xp');
      const cooldown = interaction.options.getInteger('cooldown');
      const announcementChannel = interaction.options.getChannel('announcement_channel');

      await LevelService.updateSettings(guildId, {
        ...(enabled !== null && { enabled }),
        ...(minXp !== null && { minXp }),
        ...(maxXp !== null && { maxXp }),
        ...(cooldown !== null && { cooldownSeconds: cooldown }),
        ...(announcementChannel && { announcementChannelId: announcementChannel.id }),
      });

      await interaction.reply({
        embeds: [CustomEmbed.success('Leveling Configured', 'Leveling settings successfully updated.')],
        ephemeral: true,
      });
    } else if (sub === 'set') {
      const targetUser = interaction.options.getUser('user', true);
      const xp = interaction.options.getInteger('xp', true);
      const res = await LevelService.setXp(guildId, targetUser.id, xp);

      await interaction.reply({
        embeds: [
          CustomEmbed.success(
            'XP Updated',
            `Set <@${targetUser.id}>'s XP to **${res.xp.toLocaleString()}** (Calculated Level: **${res.level}**).`
          ),
        ],
        ephemeral: true,
      });
    } else if (sub === 'reset') {
      const targetUser = interaction.options.getUser('user');
      if (targetUser) {
        await LevelService.setXp(guildId, targetUser.id, 0);
        await interaction.reply({
          embeds: [CustomEmbed.success('XP Reset', `Reset XP and level for <@${targetUser.id}> to 0.`)],
          ephemeral: true,
        });
      } else {
        await LevelService.resetGuildXp(guildId);
        await interaction.reply({
          embeds: [CustomEmbed.warn('Server XP Reset', 'All member XP and rankings for this server have been reset to 0.')],
          ephemeral: true,
        });
      }
    } else if (sub === 'reward') {
      const level = interaction.options.getInteger('level', true);
      const role = interaction.options.getRole('role', true);
      const id = `${guildId}_${level}`;

      await db.insert(levelRewards).values({ id, guildId, level, roleId: role.id }).onConflictDoUpdate({
        target: levelRewards.id,
        set: { roleId: role.id },
      }).run();

      await interaction.reply({
        embeds: [CustomEmbed.success('Level Reward Configured', `Members reaching **Level ${level}** will now automatically receive the <@&${role.id}> role.`)],
        ephemeral: true,
      });
    } else if (sub === 'multiplier') {
      const role = interaction.options.getRole('role', true);
      const multiplier = interaction.options.getInteger('multiplier', true);
      const id = `${guildId}_${role.id}`;

      await db.insert(xpMultipliers).values({ id, guildId, roleId: role.id, multiplier }).onConflictDoUpdate({
        target: xpMultipliers.id,
        set: { multiplier },
      }).run();

      await interaction.reply({
        embeds: [CustomEmbed.success('Multiplier Set', `Role <@&${role.id}> will now receive **${multiplier}x** XP bonus!`)],
        ephemeral: true,
      });
    } else if (sub === 'ignore-channel') {
      const channel = interaction.options.getChannel('channel', true);
      const id = `${guildId}_${channel.id}`;
      const existing = await db.select().from(xpExceptions).where(eq(xpExceptions.id, id)).get();

      if (existing) {
        await db.delete(xpExceptions).where(eq(xpExceptions.id, id)).run();
        await interaction.reply({
          embeds: [CustomEmbed.info('Channel Unignored', `<#${channel.id}> will now award XP again.`)],
          ephemeral: true,
        });
      } else {
        await db.insert(xpExceptions).values({ id, guildId, targetId: channel.id, type: 'channel' }).run();
        await interaction.reply({
          embeds: [CustomEmbed.info('Channel Ignored', `<#${channel.id}> is now excluded from awarding XP.`)],
          ephemeral: true,
        });
      }
    } else if (sub === 'ignore-role') {
      const role = interaction.options.getRole('role', true);
      const id = `${guildId}_${role.id}`;
      const existing = await db.select().from(xpExceptions).where(eq(xpExceptions.id, id)).get();

      if (existing) {
        await db.delete(xpExceptions).where(eq(xpExceptions.id, id)).run();
        await interaction.reply({
          embeds: [CustomEmbed.info('Role Unignored', `Members with <@&${role.id}> will now earn XP.`)],
          ephemeral: true,
        });
      } else {
        await db.insert(xpExceptions).values({ id, guildId, targetId: role.id, type: 'role' }).run();
        await interaction.reply({
          embeds: [CustomEmbed.info('Role Ignored', `Members with <@&${role.id}> are now excluded from gaining XP.`)],
          ephemeral: true,
        });
      }
    }
  },
};
