import { eq } from 'drizzle-orm';
import { db } from '../database/db.js';
import { guilds, welcomeSettings } from '../database/schema/index.js';

export class GuildService {
  static async ensureGuild(guildId: string, name: string) {
    const existing = await db.select().from(guilds).where(eq(guilds.id, guildId)).get();
    if (!existing) {
      await db.insert(guilds).values({ id: guildId, name }).run();
      await db.insert(welcomeSettings).values({ guildId }).run();
    }
  }

  static async getWelcomeSettings(guildId: string) {
    return await db.select().from(welcomeSettings).where(eq(welcomeSettings.guildId, guildId)).get();
  }

  static async updateWelcomeSettings(guildId: string, data: Partial<typeof welcomeSettings.$inferInsert>) {
    const existing = await this.getWelcomeSettings(guildId);
    if (!existing) {
      await db.insert(welcomeSettings).values({ guildId, ...data }).run();
    } else {
      await db.update(welcomeSettings).set(data).where(eq(welcomeSettings.guildId, guildId)).run();
    }
  }
}
