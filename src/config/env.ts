import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  DISCORD_TOKEN: z.string().default('placeholder_token_for_offline_scripts'),
  CLIENT_ID: z.string().default('placeholder_client_id'),
  GUILD_ID: z.string().optional(),
  DATABASE_URL: z.string().default('file:./data/bot.sqlite'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MUSIC_ENABLED: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
export type Env = z.infer<typeof envSchema>;
