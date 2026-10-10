import {
  Client,
  GatewayIntentBits,
  Partials,
  ActivityType,
  Events,
  Options,
} from 'discord.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { runMigrations } from './database/migrate.js';
import { deployCommands } from './scripts/deploy-commands.js';
import { interactionCreateEvent } from './events/interactionCreate.js';
import { guildMemberAddEvent, guildMemberRemoveEvent } from './events/memberLifecycle.js';
import { messageCreateEvent } from './events/messageCreate.js';
import { startReminderScheduler } from './jobs/reminderJob.js';
import { GuildService } from './services/guildService.js';

export function createBotClient(): Client {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers, // Privileged intent for welcome/goodbye/autoroles/rank
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent, // Privileged intent for chat XP
      GatewayIntentBits.GuildVoiceStates, // For music playback
      GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.GuildMember, Partials.User],
    // Low-Memory Caching Sweepers
    makeCache: Options.cacheWithLimits({
      ...Options.DefaultMakeCacheSettings,
      MessageManager: 50, // Keep only 50 messages per channel in RAM (default was 200)
      UserManager: 100, // Cap user cache
      GuildMemberManager: 200, // Cap guild member cache
      ReactionManager: 0, // Do not cache reactions
      ThreadManager: 0,
      ThreadMemberManager: 0,
      VoiceStateManager: 50,
      StageInstanceManager: 0,
    }),
    sweepers: {
      ...Options.DefaultSweeperSettings,
      messages: {
        interval: 300, // Sweep unused messages every 5 minutes
        lifetime: 600, // Remove messages older than 10 minutes
      },
      users: {
        interval: 300,
        filter: () => (user) => !user.bot,
      },
    },
  });
}

export async function startBot() {
  logger.info('Initializing All-in-One Discord Bot system...');

  // 1. Run Database Migrations
  await runMigrations();

  // 2. Instantiate Client
  const client = createBotClient();

  // 3. Register Gateway Event Listeners
  client.on(interactionCreateEvent.name, (...args) => interactionCreateEvent.execute(...args));
  client.on(guildMemberAddEvent.name, (...args) => guildMemberAddEvent.execute(...args));
  client.on(guildMemberRemoveEvent.name, (...args) => guildMemberRemoveEvent.execute(...args));
  client.on(messageCreateEvent.name, (...args) => messageCreateEvent.execute(...args));

  client.once(Events.ClientReady, async (readyClient) => {
    logger.info(`🚀 Logged in and ready as ${readyClient.user.tag}!`);
    logger.info(`Serving ${readyClient.guilds.cache.size} guilds and ${readyClient.users.cache.size} cached users.`);

    // Set dynamic rich presence activity
    readyClient.user.setPresence({
      activities: [{ name: '/help | Managing Servers', type: ActivityType.Custom }],
      status: 'online',
    });

    // Ensure guilds are initialized in database
    for (const [id, guild] of readyClient.guilds.cache) {
      await GuildService.ensureGuild(id, guild.name).catch(() => {});
    }

    // Register Slash Commands
    await deployCommands();

    // Start background cron / schedulers
    startReminderScheduler(readyClient);
  });

  client.on(Events.GuildCreate, async (guild) => {
    logger.info({ guildName: guild.name, guildId: guild.id }, 'Joined new guild');
    await GuildService.ensureGuild(guild.id, guild.name).catch(() => {});
  });

  // Graceful Shutdown & Process Recovery Handlers
  const handleShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Gracefully shutting down...`);
    client.destroy();
    process.exit(0);
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, 'Unhandled Promise Rejection');
  });

  process.on('uncaughtException', (error) => {
    logger.error({ error }, 'Uncaught Exception');
  });

  // 4. Log in to Discord Gateway
  if (!env.DISCORD_TOKEN || env.DISCORD_TOKEN.includes('placeholder')) {
    logger.warn('DISCORD_TOKEN is not set or using placeholder. Bot gateway connection skipped for offline environments.');
  } else {
    await client.login(env.DISCORD_TOKEN);
  }

  return client;
}

if (process.argv[1]?.endsWith('bot.ts') || process.argv[1]?.endsWith('bot.js')) {
  startBot().catch((err) => {
    logger.fatal({ err }, 'Failed to start bot');
    process.exit(1);
  });
}
