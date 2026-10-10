import { REST, Routes } from 'discord.js';
import { commands } from '../commands/index.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export async function deployCommands() {
  if (!env.DISCORD_TOKEN || env.DISCORD_TOKEN.includes('placeholder')) {
    logger.warn('Skipping slash command deployment: DISCORD_TOKEN is not configured.');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);
  const commandData = commands.map((c) => c.data.toJSON());

  try {
    logger.info(`Started refreshing ${commandData.length} application (/) commands.`);

    if (env.GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(env.CLIENT_ID, env.GUILD_ID), {
        body: commandData,
      });
      logger.info(`Successfully registered commands to guild: ${env.GUILD_ID}`);
    } else {
      await rest.put(Routes.applicationCommands(env.CLIENT_ID), {
        body: commandData,
      });
      logger.info('Successfully registered global application (/) commands.');
    }
  } catch (error) {
    logger.error({ error }, 'Failed to deploy slash commands');
  }
}

if (process.argv[1]?.endsWith('deploy-commands.ts') || process.argv[1]?.endsWith('deploy-commands.js')) {
  deployCommands();
}
