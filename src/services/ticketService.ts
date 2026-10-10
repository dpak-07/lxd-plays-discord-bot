import { eq, desc } from 'drizzle-orm';
import { db } from '../database/db.js';
import { ticketSettings, tickets } from '../database/schema/index.js';

export class TicketService {
  static async getSettings(guildId: string) {
    let settings = await db.select().from(ticketSettings).where(eq(ticketSettings.guildId, guildId)).get();
    if (!settings) {
      await db.insert(ticketSettings).values({ guildId }).run();
      settings = await db.select().from(ticketSettings).where(eq(ticketSettings.guildId, guildId)).get();
    }
    return settings!;
  }

  static async updateSettings(guildId: string, data: Partial<typeof ticketSettings.$inferInsert>) {
    await this.getSettings(guildId);
    await db.update(ticketSettings).set(data).where(eq(ticketSettings.guildId, guildId)).run();
  }

  static async createTicket(guildId: string, channelId: string, creatorId: string) {
    const lastTicket = await db
      .select({ ticketNumber: tickets.ticketNumber })
      .from(tickets)
      .where(eq(tickets.guildId, guildId))
      .orderBy(desc(tickets.ticketNumber))
      .limit(1)
      .get();

    const ticketNumber = (lastTicket?.ticketNumber ?? 0) + 1;

    await db.insert(tickets).values({
      guildId,
      channelId,
      creatorId,
      ticketNumber,
      status: 'OPEN',
      createdAt: new Date(),
    }).run();

    return ticketNumber;
  }

  static async getTicketByChannel(channelId: string) {
    return await db.select().from(tickets).where(eq(tickets.channelId, channelId)).get();
  }

  static async closeTicket(channelId: string) {
    await db.update(tickets).set({ status: 'CLOSED', closedAt: new Date() }).where(eq(tickets.channelId, channelId)).run();
  }

  static async claimTicket(channelId: string, claimedById: string) {
    await db.update(tickets).set({ claimedById }).where(eq(tickets.channelId, channelId)).run();
  }
}
