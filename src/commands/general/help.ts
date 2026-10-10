import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType,
} from 'discord.js';
import { Command } from '../../types/command.js';
import { CustomEmbed, COLORS } from '../../utils/embeds.js';

export const helpCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Explore all modules, slash commands, and server features')
    .addStringOption((opt) =>
      opt
        .setName('module')
        .setDescription('Select a specific feature module')
        .addChoices(
          { name: '👋 Welcome & Goodbye', value: 'welcome' },
          { name: '⭐ Leveling & XP', value: 'leveling' },
          { name: '🛡️ Moderation & Security', value: 'moderation' },
          { name: '🏷️ Roles & Verification', value: 'roles' },
          { name: '🎫 Tickets & Feedback', value: 'tickets' },
          { name: '🎵 Music Playback', value: 'music' },
          { name: '⚙️ Utilities & General', value: 'general' }
        )
        .setRequired(false)
    ),

  category: 'general',

  async execute(interaction: ChatInputCommandInteraction) {
    const selectedModule = interaction.options.getString('module');

    const getModuleEmbed = (mod: string) => {
      switch (mod) {
        case 'welcome':
          return new CustomEmbed()
            .setTitle('👋 Welcome & Goodbye System')
            .setDescription('Configurable greetings with member count, avatar cards, rules button, and DM options.')
            .addFields(
              { name: '`/welcome setup`', value: 'Configure target channel, custom message, title, and rules URL.' },
              { name: '`/welcome preview`', value: 'Preview welcome card embed without broadcasting.' },
              { name: '`/welcome test`', value: 'Send a live test welcome message to the welcome channel.' },
              { name: '`/welcome toggle`', value: 'Enable or disable welcome messages.' },
              { name: '`/goodbye setup`', value: 'Configure departure channel, embed colors, and message format.' },
              { name: '`/goodbye test`', value: 'Send a live test goodbye message.' },
              { name: '`/goodbye toggle`', value: 'Enable or disable departure messages.' }
            );

        case 'leveling':
          return new CustomEmbed()
            .setTitle('⭐ Leveling & XP System')
            .setDescription('Chat-based XP with cooldown anti-farming, multipliers, rank cards, and paginated leaderboards.')
            .addFields(
              { name: '`/rank [user]`', value: 'View XP, rank position, progress bar, and required XP to level up.' },
              { name: '`/leaderboard [page]`', value: 'Paginated server leaderboard with interactive buttons and medal rankings.' },
              { name: '`/level configure`', value: 'Configure min/max XP per message, cooldowns, and level up announcements.' },
              { name: '`/level reward`', value: 'Assign automatic role unlocks for reaching specific levels.' },
              { name: '`/level multiplier`', value: 'Grant role-based XP multipliers (e.g. 2x, 3x for VIP or Boosters).' },
              { name: '`/level ignore-channel`', value: 'Exclude or re-include channels from earning XP.' },
              { name: '`/level ignore-role`', value: 'Exclude or re-include specific roles from gaining XP.' },
              { name: '`/level set / remove / reset`', value: 'Administrative XP management tools.' }
            );

        case 'moderation':
          return new CustomEmbed()
            .setTitle('🛡️ Moderation & Server Security')
            .setDescription('Role-hierarchy safe moderation tools, case auditing, anti-spam shields, and panic lockdowns.')
            .addFields(
              { name: '`/mod warn [user] [reason]`', value: 'Issue a formal warning recorded with a persistent case ID.' },
              { name: '`/mod warnings [user]`', value: 'View full warning history for a member.' },
              { name: '`/mod timeout [user] [duration]`', value: 'Mute / timeout a member with reason and audit log.' },
              { name: '`/mod kick [user] [reason]`', value: 'Kick a member respecting Discord role hierarchy.' },
              { name: '`/mod ban / unban`', value: 'Ban or unban members with full case audit trail.' },
              { name: '`/mod purge [amount]`', value: 'Bulk delete up to 100 recent messages.' },
              { name: '`/mod slowmode [seconds]`', value: 'Adjust channel slowmode rate limits.' },
              { name: '`/mod lock / unlock`', value: 'Lockdown and unlock channels.' },
              { name: '`/security configure`', value: 'Set up mod audit log channels, anti-spam limits, and anti-raid shields.' },
              { name: '`/security panic`', value: 'Emergency server lockdown switch.' }
            );

        case 'roles':
          return new CustomEmbed()
            .setTitle('🏷️ Verification & Self Roles')
            .setDescription('Verification button gates, self-service role menus, and autoroles.')
            .addFields(
              { name: '`/verify setup`', value: 'Deploy a verified role gate with a click-to-verify button.' },
              { name: '`/roles menu`', value: 'Create self-assignable dropdown menus for up to 5 roles.' },
              { name: '`/roles autorole`', value: 'Configure roles automatically granted to newly joined members.' }
            );

        case 'tickets':
          return new CustomEmbed()
            .setTitle('🎫 Support Tickets & Feedback')
            .setDescription('Private ticket channels, staff claiming, transcripts, and member suggestions.')
            .addFields(
              { name: '`/ticket setup`', value: 'Post an interactive ticket creation embed panel.' },
              { name: '`/ticket claim`', value: 'Support staff claims ownership of an open ticket.' },
              { name: '`/ticket close`', value: 'Close and delete ticket channel with persistent case records.' },
              { name: '`/suggest [idea]`', value: 'Submit an idea to the community suggestion board.' }
            );

        case 'music':
          return new CustomEmbed()
            .setTitle('🎵 Voice Music Playback')
            .setDescription('Stream music in voice channels with audio queues, volume control, and auto-leave.')
            .addFields(
              { name: '`/music play [query/url]`', value: 'Play song by title or supported link.' },
              { name: '`/music pause / resume`', value: 'Pause or unpause audio.' },
              { name: '`/music skip / stop`', value: 'Skip track or stop playback and clear queue.' },
              { name: '`/music queue / nowplaying`', value: 'Inspect upcoming playlist or active song.' },
              { name: '`/music volume / loop`', value: 'Set playback volume or repeat track/queue.' }
            );

        default:
          return new CustomEmbed()
            .setTitle('⚙️ General & Server Utilities')
            .setDescription('Server diagnostics, member information, and announcements.')
            .addFields(
              { name: '`/serverinfo`', value: 'Display detailed server statistics and owner information.' },
              { name: '`/userinfo [user]`', value: 'View member join date, creation date, and highest roles.' },
              { name: '`/avatar [user]`', value: 'View and download high-resolution member avatars.' },
              { name: '`/botinfo`', value: 'Display bot latency, uptime, memory usage, and health.' },
              { name: '`/announce`', value: 'Post a formatted announcement embed.' },
              { name: '`/remind`', value: 'Set a persistent reminder notification.' }
            );
      }
    };

    if (selectedModule) {
      await interaction.reply({ embeds: [getModuleEmbed(selectedModule)], ephemeral: true });
      return;
    }

    // Default overview embed with interactive select menu
    const overviewEmbed = new CustomEmbed()
      .setTitle('📖 All-in-One Discord Bot — System Guide')
      .setDescription(
        'Welcome to your server management suite! Select a module below to inspect available commands, permissions, and configuration options.'
      )
      .setColor(COLORS.PRIMARY)
      .addFields(
        { name: '👋 Welcome & Goodbye', value: 'Automated greeting cards, departure logs, and custom rules links.', inline: true },
        { name: '⭐ XP & Leveling', value: 'Chat XP, rank cards, multipliers, level roles, and paginated leaderboards.', inline: true },
        { name: '🛡️ Moderation & Security', value: 'Warn, mute, kick, ban, purge, anti-spam, and panic lockdown.', inline: true },
        { name: '🏷️ Roles & Verification', value: 'Click-to-verify gates, autoroles, and dropdown role menus.', inline: true },
        { name: '🎫 Tickets & Feedback', value: 'Interactive private support tickets and community suggestions.', inline: true },
        { name: '🎵 Music Playback', value: 'High quality voice player with queue, volume, and looping.', inline: true }
      );

    const menu = new StringSelectMenuBuilder()
      .setCustomId('help_category_select')
      .setPlaceholder('Select a feature module to explore...')
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel('👋 Welcome & Goodbye').setValue('welcome').setDescription('Greetings and departure settings'),
        new StringSelectMenuOptionBuilder().setLabel('⭐ Leveling & XP').setValue('leveling').setDescription('XP rates, rank cards, and leaderboards'),
        new StringSelectMenuOptionBuilder().setLabel('🛡️ Moderation & Security').setValue('moderation').setDescription('Mod tools, cases, and panic lockdown'),
        new StringSelectMenuOptionBuilder().setLabel('🏷️ Roles & Verification').setValue('roles').setDescription('Verification gates and self roles'),
        new StringSelectMenuOptionBuilder().setLabel('🎫 Tickets & Feedback').setValue('tickets').setDescription('Support tickets and suggestions'),
        new StringSelectMenuOptionBuilder().setLabel('🎵 Music Playback').setValue('music').setDescription('Voice audio controls'),
        new StringSelectMenuOptionBuilder().setLabel('⚙️ Utilities & General').setValue('general').setDescription('Server info, reminders, and announcements')
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);

    const response = await interaction.reply({
      embeds: [overviewEmbed],
      components: [row],
      ephemeral: true,
    });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60000,
    });

    collector.on('collect', async (menuInt) => {
      const selected = menuInt.values[0];
      await menuInt.update({
        embeds: [getModuleEmbed(selected)],
        components: [row],
      });
    });
  },
};
