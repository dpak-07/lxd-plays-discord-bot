import { Collection } from 'discord.js';
import { Command } from '../types/command.js';
import { welcomeCommand } from './welcome/welcome.js';
import { goodbyeCommand } from './welcome/goodbye.js';
import { rankCommand } from './leveling/rank.js';
import { leaderboardCommand } from './leveling/leaderboard.js';
import { levelAdminCommand } from './leveling/level.js';
import { modCommand } from './moderation/mod.js';
import { securityCommand } from './moderation/security.js';
import { verifyCommand } from './roles/verify.js';
import { rolesCommand } from './roles/roles.js';
import { ticketCommand } from './tickets/ticket.js';
import {
  serverinfoCommand,
  userinfoCommand,
  avatarCommand,
  botinfoCommand,
} from './general/utility.js';
import { suggestCommand, announceCommand, remindCommand } from './general/features.js';
import { musicCommand } from './music/music.js';
import { helpCommand } from './general/help.js';
import { setupCommand } from './admin/setup.js';

export const commands = new Collection<string, Command>();

const commandList: Command[] = [
  welcomeCommand,
  goodbyeCommand,
  rankCommand,
  leaderboardCommand,
  levelAdminCommand,
  modCommand,
  securityCommand,
  verifyCommand,
  rolesCommand,
  ticketCommand,
  serverinfoCommand,
  userinfoCommand,
  avatarCommand,
  botinfoCommand,
  suggestCommand,
  announceCommand,
  remindCommand,
  musicCommand,
  helpCommand,
  setupCommand,
];

for (const cmd of commandList) {
  commands.set(cmd.data.name, cmd);
}
