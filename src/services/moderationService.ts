import { eq, desc, and } from 'drizzle-orm';
import { db } from '../database/db.js';
import { moderationSettings, moderationCases } from '../database/schema/index.js';

export type ModAction = 'WARN' | 'TIMEOUT' | 'KICK' | 'BAN' | 'UNBAN';

export class ModerationService {
  static async getSettings(guildId: string) {
    let settings = await db.select().from(moderationSettings).where(eq(moderationSettings.guildId, guildId)).get();
    if (!settings) {
      await db.insert(moderationSettings).values({ guildId }).run();
      settings = await db.select().from(moderationSettings).where(eq(moderationSettings.guildId, guildId)).get();
    }
    return settings!;
  }

  static async updateSettings(guildId: string, data: Partial<typeof moderationSettings.$inferInsert>) {
    await this.getSettings(guildId);
    await db.update(moderationSettings).set(data).where(eq(moderationSettings.guildId, guildId)).run();
  }

  static async logCase(params: {
    guildId: string;
    action: ModAction;
    targetId: string;
    targetTag: string;
    moderatorId: string;
    moderatorTag: string;
    reason: string;
    durationMinutes?: number;
  }) {
    // Get next case number for this guild
    const lastCase = await db
      .select({ caseNumber: moderationCases.caseNumber })
      .from(moderationCases)
      .where(eq(moderationCases.guildId, params.guildId))
      .orderBy(desc(moderationCases.caseNumber))
      .limit(1)
      .get();

    const caseNumber = (lastCase?.caseNumber ?? 0) + 1;

    await db.insert(moderationCases).values({
      guildId: params.guildId,
      caseNumber,
      action: params.action,
      targetId: params.targetId,
      targetTag: params.targetTag,
      moderatorId: params.moderatorId,
      moderatorTag: params.moderatorTag,
      reason: params.reason,
      durationMinutes: params.durationMinutes,
      createdAt: new Date(),
    }).run();

    return caseNumber;
  }

  static async getWarnings(guildId: string, targetId: string) {
    return await db
      .select()
      .from(moderationCases)
      .where(
        and(
          eq(moderationCases.guildId, guildId),
          eq(moderationCases.targetId, targetId),
          eq(moderationCases.action, 'WARN')
        )
      )
      .orderBy(desc(moderationCases.createdAt))
      .all();
  }

  static async getCase(guildId: string, caseNumber: number) {
    return await db
      .select()
      .from(moderationCases)
      .where(and(eq(moderationCases.guildId, guildId), eq(moderationCases.caseNumber, caseNumber)))
      .get();
  }
}
