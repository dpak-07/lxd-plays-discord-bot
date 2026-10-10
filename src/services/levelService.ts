import { eq, and, desc } from 'drizzle-orm';
import { db } from '../database/db.js';
import { levelSettings, memberXp, levelRewards, xpExceptions, xpMultipliers } from '../database/schema/index.js';

export interface AddXpResult {
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  currentXp: number;
  rewardRoleId?: string;
}

export class LevelService {
  /**
   * Standard documented formula:
   * XP needed for Level L = 100 * (L ^ 1.5) or Level = floor((XP / 100) ^ (1 / 1.5))
   */
  static xpForLevel(level: number): number {
    if (level <= 0) return 0;
    return Math.floor(100 * Math.pow(level, 1.5));
  }

  static levelFromXp(xp: number): number {
    if (xp <= 0) return 0;
    let lvl = 0;
    while (this.xpForLevel(lvl + 1) <= xp) {
      lvl++;
    }
    return lvl;
  }

  static async getSettings(guildId: string) {
    let settings = await db.select().from(levelSettings).where(eq(levelSettings.guildId, guildId)).get();
    if (!settings) {
      await db.insert(levelSettings).values({ guildId }).run();
      settings = await db.select().from(levelSettings).where(eq(levelSettings.guildId, guildId)).get();
    }
    return settings!;
  }

  static async updateSettings(guildId: string, data: Partial<typeof levelSettings.$inferInsert>) {
    await this.getSettings(guildId);
    await db.update(levelSettings).set(data).where(eq(levelSettings.guildId, guildId)).run();
  }

  static async isIgnored(guildId: string, channelId: string, roleIds: string[]): Promise<boolean> {
    const exceptions = await db.select().from(xpExceptions).where(eq(xpExceptions.guildId, guildId)).all();
    for (const exp of exceptions) {
      if (exp.type === 'channel' && exp.targetId === channelId) return true;
      if (exp.type === 'role' && roleIds.includes(exp.targetId)) return true;
    }
    return false;
  }

  static async getMultiplier(guildId: string, roleIds: string[]): Promise<number> {
    const multipliers = await db.select().from(xpMultipliers).where(eq(xpMultipliers.guildId, guildId)).all();
    let maxMultiplier = 1;
    for (const m of multipliers) {
      if (roleIds.includes(m.roleId) && m.multiplier > maxMultiplier) {
        maxMultiplier = m.multiplier;
      }
    }
    return maxMultiplier;
  }

  static async processMessage(
    guildId: string,
    userId: string,
    content: string,
    channelId: string,
    roleIds: string[]
  ): Promise<AddXpResult | null> {
    const settings = await this.getSettings(guildId);
    if (!settings.enabled) return null;

    if (await this.isIgnored(guildId, channelId, roleIds)) return null;

    const recordId = `${guildId}_${userId}`;
    let member = await db.select().from(memberXp).where(eq(memberXp.id, recordId)).get();

    const now = Math.floor(Date.now() / 1000);

    if (member) {
      // Cooldown check
      if (now - member.lastMessageTimestamp < settings.cooldownSeconds) {
        return null;
      }
      // Anti-spam repeated content check
      if (member.lastMessageContent && member.lastMessageContent.trim().toLowerCase() === content.trim().toLowerCase()) {
        return null;
      }
    }

    const multiplier = await this.getMultiplier(guildId, roleIds);
    const baseXp = Math.floor(Math.random() * (settings.maxXp - settings.minXp + 1)) + settings.minXp;
    const gainedXp = baseXp * multiplier;

    const currentTotalXp = (member?.xp ?? 0) + gainedXp;
    const oldLevel = member?.level ?? 0;
    const newLevel = this.levelFromXp(currentTotalXp);

    if (!member) {
      await db.insert(memberXp).values({
        id: recordId,
        guildId,
        userId,
        xp: currentTotalXp,
        level: newLevel,
        lastMessageTimestamp: now,
        lastMessageContent: content.slice(0, 200),
      }).run();
    } else {
      await db.update(memberXp).set({
        xp: currentTotalXp,
        level: newLevel,
        lastMessageTimestamp: now,
        lastMessageContent: content.slice(0, 200),
        updatedAt: new Date(),
      }).where(eq(memberXp.id, recordId)).run();
    }

    let rewardRoleId: string | undefined;
    if (newLevel > oldLevel) {
      const reward = await db
        .select()
        .from(levelRewards)
        .where(and(eq(levelRewards.guildId, guildId), eq(levelRewards.level, newLevel)))
        .get();
      if (reward) rewardRoleId = reward.roleId;
    }

    return {
      leveledUp: newLevel > oldLevel,
      oldLevel,
      newLevel,
      currentXp: currentTotalXp,
      rewardRoleId,
    };
  }

  static async getMemberRank(guildId: string, userId: string) {
    const recordId = `${guildId}_${userId}`;
    const userStats = await db.select().from(memberXp).where(eq(memberXp.id, recordId)).get();
    if (!userStats) return null;

    const allMembers = await db
      .select()
      .from(memberXp)
      .where(eq(memberXp.guildId, guildId))
      .orderBy(desc(memberXp.xp))
      .all();

    const rank = allMembers.findIndex((m) => m.userId === userId) + 1;
    const currentLevel = userStats.level;
    const currentLevelXp = this.xpForLevel(currentLevel);
    const nextLevelXp = this.xpForLevel(currentLevel + 1);

    return {
      userId,
      xp: userStats.xp,
      level: currentLevel,
      rank,
      totalMembers: allMembers.length,
      currentLevelXp,
      nextLevelXp,
      progressXp: userStats.xp - currentLevelXp,
      neededXp: nextLevelXp - currentLevelXp,
    };
  }

  static async getLeaderboard(guildId: string, page: number = 1, pageSize: number = 10) {
    const offset = (page - 1) * pageSize;
    const members = await db
      .select()
      .from(memberXp)
      .where(eq(memberXp.guildId, guildId))
      .orderBy(desc(memberXp.xp))
      .limit(pageSize)
      .offset(offset)
      .all();

    const totalCount = (await db.select().from(memberXp).where(eq(memberXp.guildId, guildId)).all()).length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;

    return {
      members,
      page,
      totalPages,
      totalCount,
    };
  }

  static async setXp(guildId: string, userId: string, xp: number) {
    const recordId = `${guildId}_${userId}`;
    const level = this.levelFromXp(xp);
    const existing = await db.select().from(memberXp).where(eq(memberXp.id, recordId)).get();
    if (existing) {
      await db.update(memberXp).set({ xp, level }).where(eq(memberXp.id, recordId)).run();
    } else {
      await db.insert(memberXp).values({
        id: recordId,
        guildId,
        userId,
        xp,
        level,
        lastMessageTimestamp: 0,
      }).run();
    }
    return { xp, level };
  }

  static async resetGuildXp(guildId: string) {
    await db.delete(memberXp).where(eq(memberXp.guildId, guildId)).run();
  }
}
