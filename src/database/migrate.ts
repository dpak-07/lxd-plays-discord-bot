import { client } from './db.js';
import { logger } from '../utils/logger.js';

export async function runMigrations() {
  logger.info('Running database schema initialization / migrations...');

  // Initialize tables directly via DDL for seamless standalone setup without complex migration steps
  const statements = [
    `CREATE TABLE IF NOT EXISTS guilds (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      prefix TEXT DEFAULT '/',
      created_at INTEGER,
      updated_at INTEGER
    );`,

    `CREATE TABLE IF NOT EXISTS welcome_settings (
      guild_id TEXT PRIMARY KEY REFERENCES guilds(id) ON DELETE CASCADE,
      welcome_enabled INTEGER DEFAULT 0 NOT NULL,
      welcome_channel_id TEXT,
      welcome_message TEXT DEFAULT 'Welcome {user} to {server}! You are member #{memberCount}.',
      welcome_title TEXT DEFAULT 'Welcome to the server!',
      welcome_color TEXT DEFAULT '#5865F2',
      welcome_dm INTEGER DEFAULT 0 NOT NULL,
      welcome_image_url TEXT,
      rules_url TEXT,
      goodbye_enabled INTEGER DEFAULT 0 NOT NULL,
      goodbye_channel_id TEXT,
      goodbye_message TEXT DEFAULT '{username} has left {server}. We now have {memberCount} members.',
      goodbye_color TEXT DEFAULT '#ED4245',
      goodbye_image_url TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS level_settings (
      guild_id TEXT PRIMARY KEY REFERENCES guilds(id) ON DELETE CASCADE,
      enabled INTEGER DEFAULT 1 NOT NULL,
      min_xp INTEGER DEFAULT 15 NOT NULL,
      max_xp INTEGER DEFAULT 25 NOT NULL,
      cooldown_seconds INTEGER DEFAULT 60 NOT NULL,
      announcement_channel_id TEXT,
      announcement_message TEXT DEFAULT '🎉 Congratulations {user}, you leveled up to **Level {level}**!'
    );`,

    `CREATE TABLE IF NOT EXISTS member_xp (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      xp INTEGER DEFAULT 0 NOT NULL,
      level INTEGER DEFAULT 0 NOT NULL,
      last_message_timestamp INTEGER DEFAULT 0 NOT NULL,
      last_message_content TEXT,
      updated_at INTEGER
    );`,

    `CREATE TABLE IF NOT EXISTS level_rewards (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
      level INTEGER NOT NULL,
      role_id TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS xp_exceptions (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
      target_id TEXT NOT NULL,
      type TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS xp_multipliers (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
      role_id TEXT NOT NULL,
      multiplier INTEGER DEFAULT 2 NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS moderation_settings (
      guild_id TEXT PRIMARY KEY REFERENCES guilds(id) ON DELETE CASCADE,
      mod_log_channel_id TEXT,
      anti_spam_enabled INTEGER DEFAULT 0 NOT NULL,
      spam_threshold INTEGER DEFAULT 5 NOT NULL,
      anti_raid_enabled INTEGER DEFAULT 0 NOT NULL,
      panic_mode INTEGER DEFAULT 0 NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS moderation_cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
      case_number INTEGER NOT NULL,
      action TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_tag TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      moderator_tag TEXT NOT NULL,
      reason TEXT NOT NULL,
      duration_minutes INTEGER,
      created_at INTEGER
    );`,

    `CREATE TABLE IF NOT EXISTS verification_settings (
      guild_id TEXT PRIMARY KEY REFERENCES guilds(id) ON DELETE CASCADE,
      enabled INTEGER DEFAULT 0 NOT NULL,
      channel_id TEXT,
      verified_role_id TEXT,
      instruction_message TEXT DEFAULT 'Click the button below to verify yourself and gain server access.',
      button_label TEXT DEFAULT 'Verify'
    );`,

    `CREATE TABLE IF NOT EXISTS auto_roles (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
      role_id TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS role_menus (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
      channel_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      title TEXT NOT NULL,
      roles_json TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS ticket_settings (
      guild_id TEXT PRIMARY KEY REFERENCES guilds(id) ON DELETE CASCADE,
      channel_id TEXT,
      category_id TEXT,
      support_role_id TEXT,
      log_channel_id TEXT,
      enabled INTEGER DEFAULT 0 NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
      ticket_number INTEGER NOT NULL,
      channel_id TEXT NOT NULL,
      creator_id TEXT NOT NULL,
      claimed_by_id TEXT,
      status TEXT DEFAULT 'OPEN' NOT NULL,
      created_at INTEGER,
      closed_at INTEGER
    );`,

    `CREATE TABLE IF NOT EXISTS suggestion_settings (
      guild_id TEXT PRIMARY KEY REFERENCES guilds(id) ON DELETE CASCADE,
      channel_id TEXT NOT NULL,
      enabled INTEGER DEFAULT 1 NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
      suggestion_number INTEGER NOT NULL,
      message_id TEXT NOT NULL,
      userId TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING' NOT NULL,
      response_reason TEXT,
      created_at INTEGER
    );`,

    `CREATE TABLE IF NOT EXISTS starboard_settings (
      guild_id TEXT PRIMARY KEY REFERENCES guilds(id) ON DELETE CASCADE,
      channel_id TEXT NOT NULL,
      min_stars INTEGER DEFAULT 3 NOT NULL,
      enabled INTEGER DEFAULT 0 NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS starboard_messages (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      starboard_message_id TEXT NOT NULL,
      stars_count INTEGER DEFAULT 1 NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message TEXT NOT NULL,
      trigger_at INTEGER NOT NULL,
      completed INTEGER DEFAULT 0 NOT NULL
    );`,

    // Create Indexes for high performance
    `CREATE INDEX IF NOT EXISTS idx_member_xp_guild_xp ON member_xp (guild_id, xp DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_mod_cases_guild ON moderation_cases (guild_id, case_number DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_reminders_trigger ON reminders (completed, trigger_at ASC);`
  ];

  for (const statement of statements) {
    await client.execute(statement);
  }

  // Gracefully add image columns to existing databases if they don't exist yet
  try {
    await client.execute('ALTER TABLE welcome_settings ADD COLUMN welcome_image_url TEXT;');
  } catch {}
  try {
    await client.execute('ALTER TABLE welcome_settings ADD COLUMN goodbye_image_url TEXT;');
  } catch {}

  logger.info('Database migration and schema verification completed successfully.');
}

if (process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error({ err }, 'Migration failed');
      process.exit(1);
    });
}
