import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  GuildMember,
} from 'discord.js';
import { Command } from '../../types/command.js';
import { TicketService } from '../../services/ticketService.js';
import { CustomEmbed, COLORS } from '../../utils/embeds.js';

export const ticketCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Manage support tickets')
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('Create a ticket creation embed with button')
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('Channel to post the ticket panel').addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
        .addChannelOption((opt) =>
          opt.setName('category').setDescription('Category where ticket channels will be created').addChannelTypes(ChannelType.GuildCategory).setRequired(true)
        )
        .addRoleOption((opt) => opt.setName('support_role').setDescription('Support staff role').setRequired(true))
        .addChannelOption((opt) =>
          opt.setName('log_channel').setDescription('Transcript and ticket log channel').addChannelTypes(ChannelType.GuildText).setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('close').setDescription('Close the current ticket')
    )
    .addSubcommand((sub) =>
      sub.setName('claim').setDescription('Claim the current ticket as support staff')
    ),

  category: 'tickets',

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'setup') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({ embeds: [CustomEmbed.error('Denied', 'You lack Administrator permission.')], ephemeral: true });
        return;
      }

      const channel = interaction.options.getChannel('channel', true);
      const category = interaction.options.getChannel('category', true);
      const supportRole = interaction.options.getRole('support_role', true);
      const logChannel = interaction.options.getChannel('log_channel');

      await TicketService.updateSettings(guildId, {
        enabled: true,
        channelId: channel.id,
        categoryId: category.id,
        supportRoleId: supportRole.id,
        logChannelId: logChannel?.id,
      });

      const embed = new CustomEmbed()
        .setTitle('🎫 Need Assistance? Open a Support Ticket')
        .setDescription('Click the button below to open a private ticket with our server support staff.')
        .setColor(COLORS.PRIMARY);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_create_btn')
          .setLabel('Open Ticket')
          .setEmoji('📩')
          .setStyle(ButtonStyle.Primary)
      );

      const targetChannel = interaction.guild.channels.cache.get(channel.id);
      if (targetChannel && targetChannel.isTextBased()) {
        await (targetChannel as any).send({ embeds: [embed], components: [row] });
      }

      await interaction.reply({
        embeds: [CustomEmbed.success('Ticket Panel Created', `Ticket panel posted in <#${channel.id}>.`)],
        ephemeral: true,
      });
    } else if (sub === 'close') {
      const ticket = await TicketService.getTicketByChannel(interaction.channelId);
      if (!ticket) {
        await interaction.reply({ embeds: [CustomEmbed.error('Error', 'This command can only be used in an active ticket channel.')], ephemeral: true });
        return;
      }

      await TicketService.closeTicket(interaction.channelId);
      await interaction.reply({
        embeds: [CustomEmbed.warn('Ticket Closing', 'This ticket has been marked closed. Channel will be deleted in 5 seconds.')],
      });

      setTimeout(async () => {
        await interaction.channel?.delete().catch(() => {});
      }, 5000);
    } else if (sub === 'claim') {
      const ticket = await TicketService.getTicketByChannel(interaction.channelId);
      if (!ticket) {
        await interaction.reply({ embeds: [CustomEmbed.error('Error', 'This command can only be used in an active ticket channel.')], ephemeral: true });
        return;
      }

      await TicketService.claimTicket(interaction.channelId, interaction.user.id);
      await interaction.reply({
        embeds: [CustomEmbed.success('Ticket Claimed', `<@${interaction.user.id}> has claimed this ticket.`)],
      });
    }
  },
};
