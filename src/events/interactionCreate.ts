import {
  Events,
  ChatInputCommandInteraction,
  ButtonInteraction,
  StringSelectMenuInteraction,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { Event } from '../types/event.js';
import { commands } from '../commands/index.js';
import { checkPermissions, checkBotPermissions } from '../middleware/permissions.js';
import { CustomEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';
import { RoleService } from '../services/roleService.js';
import { TicketService } from '../services/ticketService.js';
import { musicManager } from '../services/musicManager.js';
import { createMusicControlRow } from '../commands/music/music.js';

export const interactionCreateEvent: Event<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // 1. Handle Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = commands.get(interaction.commandName);
      if (!command) {
        logger.warn(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      // Check User Permissions
      if (!checkPermissions(interaction, command.userPermissions as any)) {
        await interaction.reply({
          embeds: [CustomEmbed.error('Permission Denied', 'You lack the required permissions to run this command.')],
          ephemeral: true,
        });
        return;
      }

      // Check Bot Permissions
      if (!checkBotPermissions(interaction, command.botPermissions as any)) {
        await interaction.reply({
          embeds: [CustomEmbed.error('Bot Missing Permissions', 'I do not have the required Discord permissions to perform this action.')],
          ephemeral: true,
        });
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error: any) {
        logger.error({ error, command: interaction.commandName }, 'Error executing slash command');
        const errorEmbed = CustomEmbed.error(
          'Command Error',
          'An unexpected error occurred while executing this command. The issue has been logged.'
        );
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
        } else {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
        }
      }
      return;
    }

    // 2. Handle Button Interactions (Verification & Ticket Creation)
    if (interaction.isButton()) {
      const guild = interaction.guild;
      if (!guild) return;

      // Verification Button Handler
      if (interaction.customId.startsWith('verify_action_')) {
        const verifySettings = await RoleService.getVerificationSettings(guild.id);
        if (!verifySettings?.enabled || !verifySettings.verifiedRoleId) {
          await interaction.reply({ content: 'Verification is not configured on this server.', ephemeral: true });
          return;
        }

        const member = await guild.members.fetch(interaction.user.id).catch(() => null);
        if (!member) return;

        if (member.roles.cache.has(verifySettings.verifiedRoleId)) {
          await interaction.reply({ content: '✅ You are already verified!', ephemeral: true });
          return;
        }

        try {
          await member.roles.add(verifySettings.verifiedRoleId);
          await interaction.reply({ content: '🎉 You have been successfully verified and granted server access!', ephemeral: true });
        } catch (err) {
          await interaction.reply({ content: '❌ Failed to grant verified role. Please contact an administrator.', ephemeral: true });
        }
        return;
      }

      // Ticket Creation Button Handler
      if (interaction.customId === 'ticket_create_btn') {
        const settings = await TicketService.getSettings(guild.id);
        if (!settings.enabled || !settings.categoryId) {
          await interaction.reply({ content: 'Ticket system is not enabled or configured.', ephemeral: true });
          return;
        }

        try {
          const ticketNumber = await TicketService.createTicket(guild.id, 'temp', interaction.user.id);
          const channelName = `ticket-${ticketNumber}`;

          const ticketChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: settings.categoryId,
            permissionOverwrites: [
              {
                id: guild.roles.everyone.id,
                deny: [PermissionFlagsBits.ViewChannel],
              },
              {
                id: interaction.user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
              },
              ...(settings.supportRoleId
                ? [
                    {
                      id: settings.supportRoleId,
                      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
                    },
                  ]
                : []),
            ],
          });

          // Link actual channel ID
          await TicketService.createTicket(guild.id, ticketChannel.id, interaction.user.id);

          const welcomeTicketEmbed = new CustomEmbed()
            .setTitle(`🎫 Ticket #${ticketNumber}`)
            .setDescription(`Hello <@${interaction.user.id}>, welcome to your private support ticket. Support staff will assist you shortly.\n\nUse \`/ticket close\` when your inquiry is resolved.`)
            .addFields({ name: 'Claim Ticket', value: 'Support staff can use `/ticket claim` to take ownership.' });

          const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId('ticket_close_quick').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒')
          );

          await ticketChannel.send({
            content: `<@${interaction.user.id}> ${settings.supportRoleId ? `<@&${settings.supportRoleId}>` : ''}`,
            embeds: [welcomeTicketEmbed],
            components: [closeRow],
          });

          await interaction.reply({ content: `✅ Ticket opened in <#${ticketChannel.id}>.`, ephemeral: true });
        } catch (err) {
          logger.error({ err }, 'Failed to create ticket channel');
          await interaction.reply({ content: 'Failed to create support channel. Please ensure bot has Manage Channels permission.', ephemeral: true });
        }
        return;
      }

      // Quick Ticket Close Button
      if (interaction.customId === 'ticket_close_quick') {
        await TicketService.closeTicket(interaction.channelId);
        await interaction.reply({ content: '🔒 Closing ticket channel in 5 seconds...' });
        setTimeout(async () => {
          await interaction.channel?.delete().catch(() => {});
        }, 5000);
        return;
      }

      // Music Player Interactive Controls
      if (interaction.customId.startsWith('music_')) {
        const queue = musicManager.getQueue(guild.id);
        const action = interaction.customId.replace('music_', '');

        if (action === 'toggle_play') {
          if (queue.isPlaying) {
            queue.pause();
            const row = createMusicControlRow(false, queue.isLooping || queue.isQueueLooping);
            await interaction.update({ components: [row] });
            await interaction.followUp({ content: '⏸️ Playback paused.', ephemeral: true });
          } else {
            queue.resume();
            const row = createMusicControlRow(true, queue.isLooping || queue.isQueueLooping);
            await interaction.update({ components: [row] });
            await interaction.followUp({ content: '▶️ Playback resumed.', ephemeral: true });
          }
          return;
        }

        if (action === 'skip') {
          queue.skip();
          await interaction.reply({ content: '⏭️ Skipped current track.', ephemeral: true });
          return;
        }

        if (action === 'stop') {
          queue.stop();
          await interaction.reply({ content: '⏹️ Playback stopped and queue cleared.', ephemeral: true });
          return;
        }

        if (action === 'loop') {
          if (!queue.isLooping && !queue.isQueueLooping) {
            queue.isLooping = true;
            await interaction.reply({ content: '🔁 Single track looping enabled.', ephemeral: true });
          } else if (queue.isLooping) {
            queue.isLooping = false;
            queue.isQueueLooping = true;
            await interaction.reply({ content: '🔁 Queue looping enabled.', ephemeral: true });
          } else {
            queue.isLooping = false;
            queue.isQueueLooping = false;
            await interaction.reply({ content: '🔁 Loop turned off.', ephemeral: true });
          }
          const row = createMusicControlRow(queue.isPlaying, queue.isLooping || queue.isQueueLooping);
          await interaction.message.edit({ components: [row] }).catch(() => {});
          return;
        }

        if (action === 'queue') {
          const songs = queue.queue.slice(0, 5).map((t, i) => `${i + 1}. **${t.title}** (${t.duration})`).join('\n') || 'No upcoming songs.';
          await interaction.reply({
            content: `🎶 **Upcoming Queue:**\n${songs}`,
            ephemeral: true,
          });
          return;
        }
      }
    }

    // 3. Handle Select Menus (Self Assignable Roles)
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'role_select_menu') {
        const guild = interaction.guild;
        if (!guild) return;

        const roleId = interaction.values[0];
        const member = await guild.members.fetch(interaction.user.id).catch(() => null);
        if (!member) return;

        try {
          if (member.roles.cache.has(roleId)) {
            await member.roles.remove(roleId);
            await interaction.reply({ content: `Removed <@&${roleId}> from your roles.`, ephemeral: true });
          } else {
            await member.roles.add(roleId);
            await interaction.reply({ content: `Added <@&${roleId}> to your roles!`, ephemeral: true });
          }
        } catch (err) {
          await interaction.reply({ content: '❌ Could not modify role. Ensure the bot role is positioned higher in server settings.', ephemeral: true });
        }
      }
    }
  },
};
