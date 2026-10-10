import { Client, ActivityType } from 'discord.js';
import { db } from '../database/db.js';
import { reminders } from '../database/schema/index.js';
import { eq, and, lte } from 'drizzle-orm';
import { CustomEmbed, COLORS } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';

export function startReminderScheduler(client: Client) {
  logger.info('Starting persistent background reminder scheduler...');

  setInterval(async () => {
    try {
      const now = new Date();
      const dueReminders = await db
        .select()
        .from(reminders)
        .where(and(eq(reminders.completed, false), lte(reminders.triggerAt, now)))
        .all();

      for (const item of dueReminders) {
        try {
          const channel = client.channels.cache.get(item.channelId);
          if (channel && channel.isTextBased()) {
            const embed = new CustomEmbed()
              .setTitle('⏰ Reminder Alert')
              .setDescription(`🔔 <@${item.userId}>, here is your scheduled reminder:\n\n**${item.message}**`)
              .setColor(COLORS.WARNING);

            await (channel as any).send({ content: `<@${item.userId}>`, embeds: [embed] });
          } else {
            // Fallback to DM if channel is gone
            const user = await client.users.fetch(item.userId).catch(() => null);
            if (user) {
              await user.send(`🔔 **Reminder:** ${item.message}`).catch(() => {});
            }
          }
        } catch (err) {
          logger.warn({ err, reminderId: item.id }, 'Failed to dispatch reminder');
        } finally {
          await db.update(reminders).set({ completed: true }).where(eq(reminders.id, item.id)).run();
        }
      }
    } catch (err) {
      logger.error({ err }, 'Error in reminder scheduler loop');
    }
  }, 15000); // Check every 15 seconds
}
