import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  PermissionResolvable,
  ButtonInteraction,
  StringSelectMenuInteraction,
} from 'discord.js';

export interface Command {
  data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | any;
  category: 'general' | 'moderation' | 'leveling' | 'welcome' | 'roles' | 'tickets' | 'music' | 'admin' | 'security';
  botPermissions?: PermissionResolvable[];
  userPermissions?: PermissionResolvable[];
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  handleButton?: (interaction: ButtonInteraction) => Promise<void>;
  handleSelectMenu?: (interaction: StringSelectMenuInteraction) => Promise<void>;
}
