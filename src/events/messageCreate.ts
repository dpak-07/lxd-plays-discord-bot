import { Events, Message, PermissionFlagsBits } from 'discord.js';
import { Event } from '../types/event.js';
import { LevelService } from '../services/levelService.js';
import { ModerationService } from '../services/moderationService.js';
import { CustomEmbed, COLORS } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';

// Anti-spam in-memory tracking: Map<`${guildId}_${userId}`, timestamp[]>
const userMessageTimes = new Map<string, number[]>();

export const messageCreateEvent: Event<Events.MessageCreate> = {
  name: Events.MessageCreate,
  async execute(message: Message) {
    if (message.author.bot || !message.guild) return;

    const guildId = message.guild.id;
    const userId = message.author.id;
    const key = `${guildId}_${userId}`;
    const now = Date.now();

    // 1. Anti-Spam Rate Limiter Shield
    try {
      const modSettings = await ModerationService.getSettings(guildId);
      if (modSettings.antiSpamEnabled && !message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
        let timestamps = userMessageTimes.get(key) || [];
        timestamps = timestamps.filter((t) => now - t < 5000); // 5-second window
        timestamps.push(now);
        userMessageTimes.set(key, timestamps);

        if (timestamps.length > modSettings.spamThreshold) {
          // Timeout user for spamming
          await message.delete().catch(() => {});
          await message.member?.timeout(60000, 'Automated Anti-Spam Trigger').catch(() => {});
          await (message.channel as any).send({
            content: `⚠️ <@${userId}> has been muted for 1 minute due to rapid message spam.`,
          });
          return;
        }
      }
    } catch (err) {
      logger.error({ err }, 'Error in anti-spam rate limiter');
    }

    // 2. Chat Leveling and XP Processing
    try {
      const roleIds = message.member?.roles.cache.map((r) => r.id) || [];
      const result = await LevelService.processMessage(
        guildId,
        userId,
        message.content,
        message.channel.id,
        roleIds
      );

      if (result && result.leveledUp) {
        const settings = await LevelService.getSettings(guildId);

        // Grant role reward if any
        if (result.rewardRoleId && message.member) {
          await message.member.roles.add(result.rewardRoleId).catch((err) => {
            logger.warn({ err }, 'Could not assign level up role reward');
          });
        }

        // Announce Level Up
        const rawMsg = settings.announcementMessage || '🎉 Congratulations {user}, you leveled up to **Level {level}**!';
        const formatted = rawMsg
          .replace(/{user}/g, `<@${userId}>`)
          .replace(/{level}/g, result.newLevel.toString());

        const embed = new CustomEmbed()
          .setTitle('⭐ Level Up!')
          .setDescription(formatted)
          .setColor(COLORS.SUCCESS)
          .setThumbnail(message.author.displayAvatarURL());

        const targetChannel = settings.announcementChannelId
          ? message.guild.channels.cache.get(settings.announcementChannelId)
          : message.channel;

        if (targetChannel && targetChannel.isTextBased()) {
          await (targetChannel as any).send({ embeds: [embed] }).catch(() => {});
        }
      }
    } catch (err) {
      logger.error({ err }, 'Error in leveling message processor');
    }
  },
};
