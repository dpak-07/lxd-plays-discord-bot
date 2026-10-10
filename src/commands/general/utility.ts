import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
} from 'discord.js';
import { Command } from '../../types/command.js';
import { CustomEmbed, COLORS } from '../../utils/embeds.js';

export const serverinfoCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Display server information, member counts, and details'),
  category: 'general',

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const g = interaction.guild;

    const owner = await g.fetchOwner().catch(() => null);
    const channels = g.channels.cache;
    const roles = g.roles.cache;

    const embed = new CustomEmbed()
      .setTitle(`🏰 ${g.name}`)
      .setColor(COLORS.PRIMARY)
      .setThumbnail(g.iconURL({ size: 256 }) || '')
      .addFields(
        { name: 'Server Owner', value: owner ? `<@${owner.id}> (${owner.user.tag})` : 'Unknown', inline: true },
        { name: 'Server ID', value: `\`${g.id}\``, inline: true },
        { name: 'Created On', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Total Members', value: `👥 ${g.memberCount.toLocaleString()}`, inline: true },
        { name: 'Channels', value: `📁 ${channels.size} channels`, inline: true },
        { name: 'Roles', value: `🏷️ ${roles.size} roles`, inline: true },
        { name: 'Boost Level', value: `🚀 Tier ${g.premiumTier} (${g.premiumSubscriptionCount || 0} boosts)`, inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  },
};

export const userinfoCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Display detailed information about a server member')
    .addUserOption((opt) => opt.setName('user').setDescription('Target member').setRequired(false)),
  category: 'general',

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const user = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const embed = new CustomEmbed()
      .setTitle(`👤 User Info — ${user.username}`)
      .setColor(COLORS.PRIMARY)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'Username & Tag', value: user.tag || user.username, inline: true },
        { name: 'User ID', value: `\`${user.id}\``, inline: true },
        { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
        {
          name: 'Joined Server',
          value: member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown',
          inline: true,
        },
        {
          name: 'Highest Role',
          value: member ? `<@&${member.roles.highest.id}>` : 'None',
          inline: true,
        },
        { name: 'Bot Account', value: user.bot ? 'Yes' : 'No', inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  },
};

export const avatarCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Display high-resolution user avatar')
    .addUserOption((opt) => opt.setName('user').setDescription('Target member').setRequired(false)),
  category: 'general',

  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const avatarUrl = user.displayAvatarURL({ size: 1024 });

    const embed = new CustomEmbed()
      .setTitle(`🖼️ Avatar — ${user.username}`)
      .setImage(avatarUrl)
      .setDescription(`[Open Avatar Link](${avatarUrl})`);

    await interaction.reply({ embeds: [embed] });
  },
};

export const botinfoCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Display bot statistics, uptime, and system health'),
  category: 'general',

  async execute(interaction: ChatInputCommandInteraction) {
    const uptimeSec = Math.floor(process.uptime());
    const days = Math.floor(uptimeSec / 86400);
    const hours = Math.floor((uptimeSec % 86400) / 3600);
    const minutes = Math.floor((uptimeSec % 3600) / 60);
    const uptimeStr = `${days}d ${hours}h ${minutes}m`;

    const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    const ping = interaction.client.ws.ping;
    const guildCount = interaction.client.guilds.cache.size;

    const embed = new CustomEmbed()
      .setTitle('🤖 Bot Information & Diagnostics')
      .setColor(COLORS.SUCCESS)
      .addFields(
        { name: 'Gateway Latency', value: `⚡ \`${ping} ms\``, inline: true },
        { name: 'Uptime', value: `⏱️ \`${uptimeStr}\``, inline: true },
        { name: 'Memory Usage', value: `💾 \`${memoryUsage} MB\``, inline: true },
        { name: 'Connected Servers', value: `🏰 \`${guildCount}\``, inline: true },
        { name: 'Node.js Version', value: `🟢 \`${process.version}\``, inline: true },
        { name: 'Architecture', value: `⚙️ \`${process.arch} (${process.platform})\``, inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  },
};
