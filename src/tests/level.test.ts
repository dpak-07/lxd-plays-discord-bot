import { describe, it, expect, beforeAll } from 'vitest';
import { LevelService } from '../services/levelService.js';
import { GuildService } from '../services/guildService.js';
import { runMigrations } from '../database/migrate.js';

describe('Leveling System Service', () => {
  beforeAll(async () => {
    await runMigrations();
  });

  it('correctly calculates XP required for levels', () => {
    expect(LevelService.xpForLevel(0)).toBe(0);
    expect(LevelService.xpForLevel(1)).toBe(100);
    expect(LevelService.xpForLevel(2)).toBe(282); // 100 * 2^1.5 = 282.84 -> 282
    expect(LevelService.xpForLevel(5)).toBe(1118); // 100 * 5^1.5 = 1118
    expect(LevelService.xpForLevel(6)).toBe(1469); // 100 * 6^1.5 = 1469.69 -> 1469
  });

  it('correctly derives level from cumulative XP', () => {
    expect(LevelService.levelFromXp(0)).toBe(0);
    expect(LevelService.levelFromXp(99)).toBe(0);
    expect(LevelService.levelFromXp(100)).toBe(1);
    expect(LevelService.levelFromXp(281)).toBe(1);
    expect(LevelService.levelFromXp(282)).toBe(2);
    // 1500 XP is >= 1469 (Level 6 threshold), so level is 6
    expect(LevelService.levelFromXp(1500)).toBe(6);
    expect(LevelService.levelFromXp(1118)).toBe(5);
  });

  it('persists XP updates and calculates member ranks', async () => {
    const guildId = 'test_guild_123';
    const userA = 'user_a';
    const userB = 'user_b';

    // Ensure parent guild exists to satisfy foreign key constraint
    await GuildService.ensureGuild(guildId, 'Test Server');

    await LevelService.setXp(guildId, userA, 500);
    await LevelService.setXp(guildId, userB, 1200);

    const rankA = await LevelService.getMemberRank(guildId, userA);
    const rankB = await LevelService.getMemberRank(guildId, userB);

    expect(rankB?.rank).toBe(1);
    expect(rankA?.rank).toBe(2);
    expect(rankB?.level).toBeGreaterThan(rankA?.level || 0);

    const leaderboard = await LevelService.getLeaderboard(guildId, 1, 10);
    expect(leaderboard.members.length).toBe(2);
    expect(leaderboard.members[0].userId).toBe(userB);
    expect(leaderboard.members[1].userId).toBe(userA);
  });
});
