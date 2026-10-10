import { CommandInteraction, GuildMember } from 'discord.js';
import { CustomEmbed } from '../utils/embeds.js';

export function checkPermissions(
  interaction: CommandInteraction,
  requiredPermissions?: bigint[]
): boolean {
  if (!interaction.guild || !requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }

  const member = interaction.member as GuildMember;
  if (!member) return false;

  for (const perm of requiredPermissions) {
    if (!member.permissions.has(perm)) {
      return false;
    }
  }

  return true;
}

export function checkBotPermissions(
  interaction: CommandInteraction,
  requiredPermissions?: bigint[]
): boolean {
  if (!interaction.guild || !requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }

  const botMember = interaction.guild.members.me;
  if (!botMember) return false;

  for (const perm of requiredPermissions) {
    if (!botMember.permissions.has(perm)) {
      return false;
    }
  }

  return true;
}

export function canModerate(moderator: GuildMember, target: GuildMember): { canMod: boolean; reason?: string } {
  if (moderator.id === target.id) {
    return { canMod: false, reason: 'You cannot perform moderation actions on yourself.' };
  }

  if (target.id === target.guild.ownerId) {
    return { canMod: false, reason: 'You cannot moderate the server owner.' };
  }

  if (moderator.id !== target.guild.ownerId && moderator.roles.highest.position <= target.roles.highest.position) {
    return { canMod: false, reason: 'You cannot moderate a member with an equal or higher role than yours.' };
  }

  const botMember = target.guild.members.me;
  if (botMember && botMember.roles.highest.position <= target.roles.highest.position) {
    return { canMod: false, reason: 'My highest role is equal to or lower than the target member.' };
  }

  return { canMod: true };
}
