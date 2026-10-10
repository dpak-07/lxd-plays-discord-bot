import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Guild Configuration
export const guilds = sqliteTable('guilds', {
  id: text('id').primaryKey(), // Discord Guild ID
  name: text('name').notNull(),
  prefix: text('prefix').default('/'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Welcome / Goodbye Module Settings
export const welcomeSettings = sqliteTable('welcome_settings', {
  guildId: text('guild_id').primaryKey().references(() => guilds.id, { onDelete: 'cascade' }),
  welcomeEnabled: integer('welcome_enabled', { mode: 'boolean' }).default(false).notNull(),
  welcomeChannelId: text('welcome_channel_id'),
  welcomeMessage: text('welcome_message').default('Welcome {user} to {server}! You are member #{memberCount}.'),
  welcomeTitle: text('welcome_title').default('Welcome to the server!'),
  welcomeColor: text('welcome_color').default('#5865F2'),
  welcomeDm: integer('welcome_dm', { mode: 'boolean' }).default(false).notNull(),
  welcomeImageUrl: text('welcome_image_url'),
  rulesUrl: text('rules_url'),
  
  goodbyeEnabled: integer('goodbye_enabled', { mode: 'boolean' }).default(false).notNull(),
  goodbyeChannelId: text('goodbye_channel_id'),
  goodbyeMessage: text('goodbye_message').default('{username} has left {server}. We now have {memberCount} members.'),
  goodbyeColor: text('goodbye_color').default('#ED4245'),
  goodbyeImageUrl: text('goodbye_image_url'),
});

// Leveling System Settings
export const levelSettings = sqliteTable('level_settings', {
  guildId: text('guild_id').primaryKey().references(() => guilds.id, { onDelete: 'cascade' }),
  enabled: integer('enabled', { mode: 'boolean' }).default(true).notNull(),
  minXp: integer('min_xp').default(15).notNull(),
  maxXp: integer('max_xp').default(25).notNull(),
  cooldownSeconds: integer('cooldown_seconds').default(60).notNull(),
  announcementChannelId: text('announcement_channel_id'),
  announcementMessage: text('announcement_message').default('🎉 Congratulations {user}, you leveled up to **Level {level}**!'),
});

// Member XP Records
export const memberXp = sqliteTable('member_xp', {
  id: text('id').primaryKey(), // `${guildId}_${userId}`
  guildId: text('guild_id').notNull().references(() => guilds.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  xp: integer('xp').default(0).notNull(),
  level: integer('level').default(0).notNull(),
  lastMessageTimestamp: integer('last_message_timestamp').default(0).notNull(),
  lastMessageContent: text('last_message_content'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Level Rewards (Roles granted at level thresholds)
export const levelRewards = sqliteTable('level_rewards', {
  id: text('id').primaryKey(), // `${guildId}_${level}`
  guildId: text('guild_id').notNull().references(() => guilds.id, { onDelete: 'cascade' }),
  level: integer('level').notNull(),
  roleId: text('role_id').notNull(),
});

// Ignored Channels / Roles for XP
export const xpExceptions = sqliteTable('xp_exceptions', {
  id: text('id').primaryKey(), // `${guildId}_${targetId}`
  guildId: text('guild_id').notNull().references(() => guilds.id, { onDelete: 'cascade' }),
  targetId: text('target_id').notNull(), // Channel ID or Role ID
  type: text('type').notNull(), // 'channel' | 'role'
});

// XP Multipliers for roles
export const xpMultipliers = sqliteTable('xp_multipliers', {
  id: text('id').primaryKey(), // `${guildId}_${roleId}`
  guildId: text('guild_id').notNull().references(() => guilds.id, { onDelete: 'cascade' }),
  roleId: text('role_id').notNull(),
  multiplier: integer('multiplier').default(2).notNull(), // 2x, 3x, etc.
});

// Moderation Settings
export const moderationSettings = sqliteTable('moderation_settings', {
  guildId: text('guild_id').primaryKey().references(() => guilds.id, { onDelete: 'cascade' }),
  modLogChannelId: text('mod_log_channel_id'),
  antiSpamEnabled: integer('anti_spam_enabled', { mode: 'boolean' }).default(false).notNull(),
  spamThreshold: integer('spam_threshold').default(5).notNull(), // messages in 5s
  antiRaidEnabled: integer('anti_raid_enabled', { mode: 'boolean' }).default(false).notNull(),
  panicMode: integer('panic_mode', { mode: 'boolean' }).default(false).notNull(),
});

// Moderation Cases
export const moderationCases = sqliteTable('moderation_cases', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  guildId: text('guild_id').notNull().references(() => guilds.id, { onDelete: 'cascade' }),
  caseNumber: integer('case_number').notNull(),
  action: text('action').notNull(), // 'WARN' | 'TIMEOUT' | 'KICK' | 'BAN' | 'UNBAN'
  targetId: text('target_id').notNull(),
  targetTag: text('target_tag').notNull(),
  moderatorId: text('moderator_id').notNull(),
  moderatorTag: text('moderator_tag').notNull(),
  reason: text('reason').notNull(),
  durationMinutes: integer('duration_minutes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Verification Settings
export const verificationSettings = sqliteTable('verification_settings', {
  guildId: text('guild_id').primaryKey().references(() => guilds.id, { onDelete: 'cascade' }),
  enabled: integer('enabled', { mode: 'boolean' }).default(false).notNull(),
  channelId: text('channel_id'),
  verifiedRoleId: text('verified_role_id'),
  instructionMessage: text('instruction_message').default('Click the button below to verify yourself and gain server access.'),
  buttonLabel: text('button_label').default('Verify'),
});

// Autoroles
export const autoRoles = sqliteTable('auto_roles', {
  id: text('id').primaryKey(), // `${guildId}_${roleId}`
  guildId: text('guild_id').notNull().references(() => guilds.id, { onDelete: 'cascade' }),
  roleId: text('role_id').notNull(),
});

// Self-Assignable Roles (Button/Menu Roles)
export const roleMenus = sqliteTable('role_menus', {
  id: text('id').primaryKey(), // messageId
  guildId: text('guild_id').notNull().references(() => guilds.id, { onDelete: 'cascade' }),
  channelId: text('channel_id').notNull(),
  messageId: text('message_id').notNull(),
  title: text('title').notNull(),
  rolesJson: text('roles_json').notNull(), // JSON array of { label: string, roleId: string, emoji?: string }
});

// Support Ticket System
export const ticketSettings = sqliteTable('ticket_settings', {
  guildId: text('guild_id').primaryKey().references(() => guilds.id, { onDelete: 'cascade' }),
  channelId: text('channel_id'),
  categoryId: text('category_id'),
  supportRoleId: text('support_role_id'),
  logChannelId: text('log_channel_id'),
  enabled: integer('enabled', { mode: 'boolean' }).default(false).notNull(),
});

export const tickets = sqliteTable('tickets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  guildId: text('guild_id').notNull().references(() => guilds.id, { onDelete: 'cascade' }),
  ticketNumber: integer('ticket_number').notNull(),
  channelId: text('channel_id').notNull(),
  creatorId: text('creator_id').notNull(),
  claimedById: text('claimed_by_id'),
  status: text('status').default('OPEN').notNull(), // 'OPEN' | 'CLOSED'
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  closedAt: integer('closed_at', { mode: 'timestamp' }),
});

// Suggestions System
export const suggestionSettings = sqliteTable('suggestion_settings', {
  guildId: text('guild_id').primaryKey().references(() => guilds.id, { onDelete: 'cascade' }),
  channelId: text('channel_id').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).default(true).notNull(),
});

export const suggestions = sqliteTable('suggestions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  guildId: text('guild_id').notNull().references(() => guilds.id, { onDelete: 'cascade' }),
  suggestionNumber: integer('suggestion_number').notNull(),
  messageId: text('message_id').notNull(),
  userId: text('user_id').notNull(),
  content: text('content').notNull(),
  status: text('status').default('PENDING').notNull(), // 'PENDING' | 'APPROVED' | 'REJECTED'
  responseReason: text('response_reason'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Starboard Settings
export const starboardSettings = sqliteTable('starboard_settings', {
  guildId: text('guild_id').primaryKey().references(() => guilds.id, { onDelete: 'cascade' }),
  channelId: text('channel_id').notNull(),
  minStars: integer('min_stars').default(3).notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).default(false).notNull(),
});

export const starboardMessages = sqliteTable('starboard_messages', {
  id: text('id').primaryKey(), // originalMessageId
  guildId: text('guild_id').notNull(),
  starboardMessageId: text('starboard_message_id').notNull(),
  starsCount: integer('stars_count').default(1).notNull(),
});

// Scheduled Reminders
export const reminders = sqliteTable('reminders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  channelId: text('channel_id').notNull(),
  message: text('message').notNull(),
  triggerAt: integer('trigger_at', { mode: 'timestamp' }).notNull(),
  completed: integer('completed', { mode: 'boolean' }).default(false).notNull(),
});
