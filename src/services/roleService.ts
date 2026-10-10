import { eq } from 'drizzle-orm';
import { db } from '../database/db.js';
import { verificationSettings, autoRoles, roleMenus } from '../database/schema/index.js';

export class RoleService {
  static async getVerificationSettings(guildId: string) {
    let settings = await db.select().from(verificationSettings).where(eq(verificationSettings.guildId, guildId)).get();
    if (!settings) {
      await db.insert(verificationSettings).values({ guildId }).run();
      settings = await db.select().from(verificationSettings).where(eq(verificationSettings.guildId, guildId)).get();
    }
    return settings!;
  }

  static async updateVerificationSettings(guildId: string, data: Partial<typeof verificationSettings.$inferInsert>) {
    await this.getVerificationSettings(guildId);
    await db.update(verificationSettings).set(data).where(eq(verificationSettings.guildId, guildId)).run();
  }

  static async getAutoRoles(guildId: string): Promise<string[]> {
    const roles = await db.select().from(autoRoles).where(eq(autoRoles.guildId, guildId)).all();
    return roles.map((r) => r.roleId);
  }

  static async addAutoRole(guildId: string, roleId: string) {
    const id = `${guildId}_${roleId}`;
    await db.insert(autoRoles).values({ id, guildId, roleId }).onConflictDoNothing().run();
  }

  static async removeAutoRole(guildId: string, roleId: string) {
    const id = `${guildId}_${roleId}`;
    await db.delete(autoRoles).where(eq(autoRoles.id, id)).run();
  }

  static async saveRoleMenu(guildId: string, channelId: string, messageId: string, title: string, roles: Array<{ label: string; roleId: string; emoji?: string }>) {
    await db.insert(roleMenus).values({
      id: messageId,
      guildId,
      channelId,
      messageId,
      title,
      rolesJson: JSON.stringify(roles),
    }).run();
  }

  static async getRoleMenu(messageId: string) {
    return await db.select().from(roleMenus).where(eq(roleMenus.id, messageId)).get();
  }
}
