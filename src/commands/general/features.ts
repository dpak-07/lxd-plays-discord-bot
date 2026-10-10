import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { Command } from '../../types/command.js';
import { CustomEmbed, COLORS } from '../../utils/embeds.js';
import { db } from '../../database/db.js';
import { suggestions, suggestionSettings, reminders } from '../../database/schema/index.js';
import { eq, desc } from 'drizzle-orm';

export const suggestCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Submit a suggestion to the server feedback channel')
    .addStringOption((opt) => opt.setName('idea').setDescription('Your idea or feedback proposal').setRequired(true)),
  category: 'general',

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const idea = interaction.options.getString('idea', true);
    const guildId = interaction.guild.id;

    const settings = await db.select().from(suggestionSettings).where(eq(suggestionSettings.guildId, guildId)).get();
    if (!settings || !settings.channelId) {
      await interaction.reply({
        embeds: [CustomEmbed.error('Not Configured', 'The suggestion channel has not been set by administrators yet.')],
        ephemeral: true,
      });
      return;
    }

    const channel = interaction.guild.channels.cache.get(settings.channelId);
    if (!channel || !channel.isTextBased()) {
      await interaction.reply({
        embeds: [CustomEmbed.error('Error', 'Suggestion channel not found or inaccessible.')],
        ephemeral: true,
      });
      return;
    }

    const last = await db.select({ num: suggestions.suggestionNumber }).from(suggestions).where(eq(suggestions.guildId, guildId)).orderBy(desc(suggestions.suggestionNumber)).limit(1).get();
    const suggestionNum = (last?.num ?? 0) + 1;

    const embed = new CustomEmbed()
      .setTitle(`💡 Suggestion #${suggestionNum}`)
      .setDescription(idea)
      .setColor(COLORS.WARNING)
      .setAuthor({ name: interaction.user.tag || interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
      .addFields({ name: 'Status', value: '⏳ Pending Community Review', inline: true });

    const msg = await (channel as any).send({ embeds: [embed] });
    await msg.react('👍').catch(() => {});
    await msg.react('👎').catch(() => {});

    await db.insert(suggestions).values({
      guildId,
      suggestionNumber: suggestionNum,
      messageId: msg.id,
      userId: interaction.user.id,
      content: idea,
      status: 'PENDING',
    }).run();

    await interaction.reply({
      embeds: [CustomEmbed.success('Suggestion Submitted', `Your idea has been published as **Suggestion #${suggestionNum}** in <#${settings.channelId}>.`)],
      ephemeral: true,
    });
  },
};

export const announceCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Post a formatted announcement embed')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) => opt.setName('title').setDescription('Announcement title').setRequired(true))
    .addStringOption((opt) => opt.setName('content').setDescription('Announcement text body').setRequired(true))
    .addStringOption((opt) => opt.setName('color').setDescription('Hex color code (e.g. #5865F2)').setRequired(false)),
  category: 'general',
  userPermissions: [PermissionFlagsBits.Administrator],

  async execute(interaction: ChatInputCommandInteraction) {
    const title = interaction.options.getString('title', true);
    const content = interaction.options.getString('content', true);
    const color = interaction.options.getString('color') || '#5865F2';

    const embed = new CustomEmbed()
      .setTitle(`📢 ${title}`)
      .setDescription(content)
      .setColor(color as any)
      .setFooter({ text: `Announced by ${interaction.user.username}` });

    await interaction.reply({ content: 'Announcement published:', ephemeral: true });
    await (interaction.channel as any)?.send({ embeds: [embed] });
  },
};

export const remindCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Set a personal reminder')
    .addIntegerOption((opt) => opt.setName('minutes').setDescription('Minutes from now').setMinValue(1).setMaxValue(10080).setRequired(true))
    .addStringOption((opt) => opt.setName('message').setDescription('Reminder message').setRequired(true)),
  category: 'general',

  async execute(interaction: ChatInputCommandInteraction) {
    const minutes = interaction.options.getInteger('minutes', true);
    const message = interaction.options.getString('message', true);

    const triggerAt = new Date(Date.now() + minutes * 60 * 1000);

    await db.insert(reminders).values({
      userId: interaction.user.id,
      channelId: interaction.channelId,
      message,
      triggerAt,
    }).run();

    await interaction.reply({
      embeds: [
        CustomEmbed.success(
          'Reminder Set',
          `I will remind you <t:${Math.floor(triggerAt.getTime() / 1000)}:R>: **"${message}"**`
        ),
      ],
      ephemeral: true,
    });
  },
};
