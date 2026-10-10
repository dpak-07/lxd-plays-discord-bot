import { Events, GuildMember, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';
import { Event } from '../types/event.js';
import { GuildService } from '../services/guildService.js';
import { RoleService } from '../services/roleService.js';
import { CustomEmbed, COLORS } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';
import { generateWelcomeCard } from '../utils/cardGenerator.js';

export const guildMemberAddEvent: Event<Events.GuildMemberAdd> = {
  name: Events.GuildMemberAdd,
  async execute(member: GuildMember) {
    const guild = member.guild;

    // 1. Assign Autoroles
    try {
      const autoRoles = await RoleService.getAutoRoles(guild.id);
      if (autoRoles.length > 0) {
        await member.roles.add(autoRoles).catch((err) => {
          logger.warn({ err, guildId: guild.id }, 'Could not assign some autoroles');
        });
      }
    } catch (err) {
      logger.error({ err }, 'Error assigning autoroles');
    }

    // 2. Send Welcome Message
    try {
      const settings = await GuildService.getWelcomeSettings(guild.id);
      if (!settings || !settings.welcomeEnabled) return;

      const rawMsg = settings.welcomeMessage || 'Welcome {user} to {server}! You are member #{memberCount}.';
      const formatted = rawMsg
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{username}/g, member.user.username)
        .replace(/{server}/g, guild.name)
        .replace(/{memberCount}/g, guild.memberCount.toString());

      const embed = new CustomEmbed()
        .setTitle(settings.welcomeTitle || 'Welcome to the server!')
        .setDescription(formatted)
        .setColor((settings.welcomeColor as any) || COLORS.PRIMARY)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: `${guild.name} • Member #${guild.memberCount}` });

      // Generate card directly in RAM as a Buffer, then release (zero storage / disk leaks)
      const imageBuffer = await generateWelcomeCard({
        avatarUrl: member.user.displayAvatarURL({ extension: 'png', size: 256 }),
        username: member.user.username,
        guildName: guild.name,
        memberCount: guild.memberCount,
        customBannerPathOrUrl: settings.welcomeImageUrl || undefined,
      });

      const attachment = new AttachmentBuilder(imageBuffer, { name: 'welcome-card.png' });
      embed.setImage('attachment://welcome-card.png');

      const row = new ActionRowBuilder<ButtonBuilder>();
      if (settings.rulesUrl) {
        row.addComponents(
          new ButtonBuilder().setLabel('Read Rules & Guidelines').setStyle(ButtonStyle.Link).setURL(settings.rulesUrl)
        );
      }

      if (settings.welcomeChannelId) {
        const channel = guild.channels.cache.get(settings.welcomeChannelId);
        if (channel && channel.isTextBased()) {
          await (channel as any).send({
            embeds: [embed],
            files: [attachment],
            components: settings.rulesUrl ? [row] : [],
          });
        }
      }

      if (settings.welcomeDm) {
        await member.send({
          embeds: [embed],
          files: [attachment],
          components: settings.rulesUrl ? [row] : [],
        }).catch(() => {});
      }
    } catch (err) {
      logger.error({ err, memberId: member.id }, 'Error processing guildMemberAdd event');
    }
  },
};

export const guildMemberRemoveEvent: Event<Events.GuildMemberRemove> = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    const guild = member.guild;

    try {
      const settings = await GuildService.getWelcomeSettings(guild.id);
      if (!settings || !settings.goodbyeEnabled || !settings.goodbyeChannelId) return;

      const channel = guild.channels.cache.get(settings.goodbyeChannelId);
      if (!channel || !channel.isTextBased()) return;

      const rawMsg = settings.goodbyeMessage || '{username} has left {server}. We now have {memberCount} members.';
      const formatted = rawMsg
        .replace(/{username}/g, member.user?.username || 'A member')
        .replace(/{server}/g, guild.name)
        .replace(/{memberCount}/g, guild.memberCount.toString());

      const embed = new CustomEmbed()
        .setTitle('Member Departed')
        .setDescription(formatted)
        .setColor((settings.goodbyeColor as any) || COLORS.ERROR)
        .setThumbnail(member.user?.displayAvatarURL({ size: 256 }) || '')
        .setFooter({ text: `${guild.name} • Remaining: ${guild.memberCount}` });

      await (channel as any).send({ embeds: [embed] });
    } catch (err) {
      logger.error({ err }, 'Error processing guildMemberRemove event');
    }
  },
};
