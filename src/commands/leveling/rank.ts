import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
} from 'discord.js';
import { Command } from '../../types/command.js';
import { LevelService } from '../../services/levelService.js';
import { CustomEmbed, COLORS } from '../../utils/embeds.js';

export const rankCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Check your current level, XP, and server leaderboard rank')
    .addUserOption((opt) => opt.setName('user').setDescription('Target user to inspect').setRequired(false)),

  category: 'leveling',

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    const rankData = await LevelService.getMemberRank(interaction.guild.id, targetUser.id);

    if (!rankData) {
      await interaction.reply({
        embeds: [
          CustomEmbed.info(
            'No Rank Data',
            `${targetUser.id === interaction.user.id ? 'You do not' : `${targetUser.username} does not`} have any recorded XP yet. Chat in the server to earn XP!`
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const percentage = Math.min(
      100,
      Math.max(0, Math.floor((rankData.progressXp / (rankData.neededXp || 1)) * 100))
    );

    // ASCII Progress Bar
    const totalBars = 16;
    const filledBars = Math.round((percentage / 100) * totalBars);
    const emptyBars = totalBars - filledBars;
    const progressBar = `[${'█'.repeat(filledBars)}${'░'.repeat(emptyBars)}] ${percentage}%`;

    const embed = new CustomEmbed()
      .setTitle(`📊 Rank Card — ${targetUser.username}`)
      .setColor(COLORS.PRIMARY)
      .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'Rank', value: `🏆 **#${rankData.rank}** / ${rankData.totalMembers}`, inline: true },
        { name: 'Level', value: `⭐ **${rankData.level}**`, inline: true },
        { name: 'Total XP', value: `✨ **${rankData.xp.toLocaleString()}** XP`, inline: true },
        {
          name: 'Level Progress',
          value: `\`${progressBar}\`\n${rankData.progressXp.toLocaleString()} / ${rankData.neededXp.toLocaleString()} XP to Level ${rankData.level + 1}`,
          inline: false,
        }
      )
      .setFooter({ text: `${interaction.guild.name} • Leveling System` });

    await interaction.reply({ embeds: [embed] });
  },
};
