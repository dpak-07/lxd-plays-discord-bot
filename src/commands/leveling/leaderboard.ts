import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';
import { Command } from '../../types/command.js';
import { LevelService } from '../../services/levelService.js';
import { CustomEmbed, COLORS } from '../../utils/embeds.js';

export const leaderboardCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the server XP & Level leaderboard')
    .addIntegerOption((opt) => opt.setName('page').setDescription('Page number').setMinValue(1).setRequired(false)),

  category: 'leveling',

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const initialPage = interaction.options.getInteger('page') || 1;
    const guildId = interaction.guild.id;

    const renderPage = async (page: number) => {
      const data = await LevelService.getLeaderboard(guildId, page, 10);

      const embed = new CustomEmbed()
        .setTitle(`🏆 ${interaction.guild!.name} — Leaderboard`)
        .setColor(COLORS.WARNING)
        .setFooter({ text: `Page ${data.page} of ${data.totalPages} • Total Ranked: ${data.totalCount}` });

      if (data.members.length === 0) {
        embed.setDescription('No ranked members found in this server yet.');
      } else {
        const lines = await Promise.all(
          data.members.map(async (m, idx) => {
            const rank = (data.page - 1) * 10 + idx + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `**#${rank}**`;
            const guildMember = await interaction.guild!.members.fetch(m.userId).catch(() => null);
            const displayName = guildMember?.displayName || guildMember?.user.username || `User (${m.userId})`;
            return `${medal} **${displayName}** — **Level ${m.level}** (${m.xp.toLocaleString()} XP)`;
          })
        );
        embed.setDescription(lines.join('\n'));
      }

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`lb_prev_${page}`)
          .setLabel('◀ Previous')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page <= 1),
        new ButtonBuilder()
          .setCustomId(`lb_next_${page}`)
          .setLabel('Next ▶')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page >= data.totalPages)
      );

      return { embed, row, totalPages: data.totalPages };
    };

    const initial = await renderPage(initialPage);
    const response = await interaction.reply({
      embeds: [initial.embed],
      components: [initial.row],
    });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
    });

    let currentPage = initialPage;

    collector.on('collect', async (btnInt) => {
      if (btnInt.user.id !== interaction.user.id) {
        await btnInt.reply({ content: 'Only the command initiator can change pages.', ephemeral: true });
        return;
      }

      if (btnInt.customId.startsWith('lb_prev_')) {
        currentPage = Math.max(1, currentPage - 1);
      } else if (btnInt.customId.startsWith('lb_next_')) {
        currentPage = currentPage + 1;
      }

      const updated = await renderPage(currentPage);
      await btnInt.update({
        embeds: [updated.embed],
        components: [updated.row],
      });
    });

    collector.on('end', async () => {
      await interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};
