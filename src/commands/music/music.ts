import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { Command } from '../../types/command.js';
import { musicManager, Track } from '../../services/musicManager.js';
import { CustomEmbed, COLORS } from '../../utils/embeds.js';
import { env } from '../../config/env.js';
import play from 'play-dl';

export function createMusicControlRow(isPlaying: boolean, isLooping: boolean) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('music_toggle_play')
      .setLabel(isPlaying ? 'Pause' : 'Resume')
      .setStyle(isPlaying ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setEmoji(isPlaying ? '⏸️' : '▶️'),
    new ButtonBuilder()
      .setCustomId('music_skip')
      .setLabel('Skip')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('⏭️'),
    new ButtonBuilder()
      .setCustomId('music_stop')
      .setLabel('Stop')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('⏹️'),
    new ButtonBuilder()
      .setCustomId('music_loop')
      .setLabel(isLooping ? 'Loop: ON' : 'Loop: OFF')
      .setStyle(isLooping ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setEmoji('🔁'),
    new ButtonBuilder()
      .setCustomId('music_queue')
      .setLabel('Queue')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📜')
  );
}

export const musicCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('Voice channel audio player and queue system')
    .addSubcommand((sub) =>
      sub
        .setName('play')
        .setDescription('Play a track by search query or audio link')
        .addStringOption((opt) => opt.setName('query').setDescription('Song title, video name, or URL').setRequired(true))
    )
    .addSubcommand((sub) => sub.setName('pause').setDescription('Pause current playback'))
    .addSubcommand((sub) => sub.setName('resume').setDescription('Resume playback'))
    .addSubcommand((sub) => sub.setName('skip').setDescription('Skip to the next song in queue'))
    .addSubcommand((sub) => sub.setName('stop').setDescription('Stop playback and clear queue'))
    .addSubcommand((sub) => sub.setName('queue').setDescription('View upcoming songs'))
    .addSubcommand((sub) => sub.setName('nowplaying').setDescription('View currently playing song'))
    .addSubcommand((sub) =>
      sub
        .setName('volume')
        .setDescription('Adjust audio volume (1 - 100)')
        .addIntegerOption((opt) => opt.setName('percent').setDescription('Volume %').setMinValue(1).setMaxValue(100).setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('loop')
        .setDescription('Toggle track or queue repeat mode')
        .addStringOption((opt) =>
          opt
            .setName('mode')
            .setDescription('Loop target')
            .addChoices(
              { name: 'Track', value: 'track' },
              { name: 'Queue', value: 'queue' },
              { name: 'Off', value: 'off' }
            )
            .setRequired(true)
        )
    )
    .addSubcommand((sub) => sub.setName('leave').setDescription('Disconnect bot from voice channel')),

  category: 'music',

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    if (!env.MUSIC_ENABLED) {
      await interaction.reply({
        embeds: [CustomEmbed.warn('Music Disabled', 'The optional music playback module is currently disabled by configuration.')],
        ephemeral: true,
      });
      return;
    }

    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel;
    const queue = musicManager.getQueue(interaction.guild.id);
    const sub = interaction.options.getSubcommand();

    if (sub === 'play') {
      if (!voiceChannel) {
        await interaction.reply({
          embeds: [CustomEmbed.error('Voice Required', 'You must be in a voice channel to play music.')],
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply();
      const query = interaction.options.getString('query', true);

      try {
        let title = query;
        let url = query;
        let duration = 'Unknown';
        let thumbnail: string | undefined;

        // 1. Detect Spotify Track / Playlist
        if (query.includes('spotify.com')) {
          try {
            const oembedRes = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(query)}`);
            if (oembedRes.ok) {
              const oembedData: any = await oembedRes.json();
              title = oembedData.title || query;
              thumbnail = oembedData.thumbnail_url;
            }
          } catch {
            // Fallback if oembed fails
          }

          // Search highest quality matching stream for Spotify track
          const cleanQuery = title.replace(/\s*\(feat\..*?\)/gi, '');
          const search = await play.search(cleanQuery, { limit: 1 }).catch(() => []);
          if (search.length > 0) {
            url = search[0].url;
            duration = search[0].durationRaw || 'Unknown';
            if (!thumbnail) thumbnail = search[0].thumbnails[0]?.url;
          } else {
            const sc = await play.search(cleanQuery, { source: { soundcloud: 'tracks' }, limit: 1 }).catch(() => []);
            if (sc.length > 0) {
              url = sc[0].url;
              duration = sc[0].durationInSec ? `${Math.floor(sc[0].durationInSec / 60)}:${(sc[0].durationInSec % 60).toString().padStart(2, '0')}` : 'Unknown';
              if (!thumbnail) thumbnail = sc[0].thumbnail;
            }
          }
        } else if (query.startsWith('http')) {
          // 2. YouTube, YouTube Music, or Direct Audio Stream
          const info = await play.video_info(query).catch(() => null);
          if (info) {
            title = info.video_details.title || query;
            duration = info.video_details.durationRaw || 'Unknown';
            thumbnail = info.video_details.thumbnails[0]?.url;
          }
        } else {
          // 3. Search query across YouTube and SoundCloud
          let results = await play.search(query, { limit: 1 }).catch(() => []);
          if (results.length > 0) {
            title = results[0].title || query;
            url = results[0].url;
            duration = results[0].durationRaw || 'Unknown';
            thumbnail = results[0].thumbnails[0]?.url;
          } else {
            // Fallback to SoundCloud search
            const scResults = await play.search(query, {
              source: { soundcloud: 'tracks' },
              limit: 1,
            }).catch(() => []);

            if (scResults.length > 0) {
              title = scResults[0].name || query;
              url = scResults[0].url;
              duration = scResults[0].durationInSec ? `${Math.floor(scResults[0].durationInSec / 60)}:${(scResults[0].durationInSec % 60).toString().padStart(2, '0')}` : 'Unknown';
              thumbnail = scResults[0].thumbnail;
            } else {
              await interaction.editReply({ embeds: [CustomEmbed.error('Not Found', `No audio found for query "${query}".`)] });
              return;
            }
          }
        }

        const track: Track = {
          title,
          url,
          duration,
          thumbnail,
          requestedBy: interaction.user.username,
        };

        if (!queue.connection) {
          queue.join(voiceChannel);
        }

        // Simulate Channel Status / Topic update for voice or text channel
        const originalStatus = (voiceChannel as any).status || '';
        try {
          if ('setStatus' in voiceChannel && typeof (voiceChannel as any).setStatus === 'function') {
            await (voiceChannel as any).setStatus(`🎶 Now Playing: ${track.title.slice(0, 80)}`);
          }
        } catch {
          // Status API fallback if lack perms or not supported in bot environment
        }

        queue.queue.push(track);

        const equalizerAnim = 'ılıılıllı **NOW PLAYING** ıllılılı';
        const embed = new CustomEmbed()
          .setTitle('🎵 Track Added to Queue')
          .setDescription(
            `${equalizerAnim}\n\n**[${track.title}](${track.url})**\n⏱️ Duration: \`${track.duration}\` | 👤 Requested by: <@${interaction.user.id}>\n🔊 Volume: \`${queue.volume}%\` | 🔁 Loop: \`${queue.isLooping ? 'Track' : queue.isQueueLooping ? 'Queue' : 'Off'}\``
          )
          .setColor(COLORS.SUCCESS);
        if (track.thumbnail) embed.setThumbnail(track.thumbnail);

        const row = createMusicControlRow(true, queue.isLooping || queue.isQueueLooping);

        await interaction.editReply({ embeds: [embed], components: [row] });

        if (!queue.isPlaying) {
          await queue.playNext();
        }
      } catch (err: any) {
        await interaction.editReply({
          embeds: [CustomEmbed.error('Audio Stream Error', `Could not stream track: ${err.message || 'Source unsupported'}`)],
        });
      }
    } else if (sub === 'pause') {
      queue.pause();
      const row = createMusicControlRow(false, queue.isLooping || queue.isQueueLooping);
      await interaction.reply({ embeds: [CustomEmbed.info('⏸️ Playback Paused', 'Audio has been paused.')], components: [row] });
    } else if (sub === 'resume') {
      queue.resume();
      const row = createMusicControlRow(true, queue.isLooping || queue.isQueueLooping);
      await interaction.reply({ embeds: [CustomEmbed.info('▶️ Playback Resumed', 'Audio playback resumed.')], components: [row] });
    } else if (sub === 'skip') {
      queue.skip();
      await interaction.reply({ embeds: [CustomEmbed.info('⏭️ Track Skipped', 'Skipped to the next song in the queue.')] });
    } else if (sub === 'stop') {
      queue.stop();
      if (voiceChannel && 'setStatus' in voiceChannel && typeof (voiceChannel as any).setStatus === 'function') {
        (voiceChannel as any).setStatus('').catch(() => {});
      }
      await interaction.reply({ embeds: [CustomEmbed.info('⏹️ Playback Stopped', 'Queue cleared and playback stopped.')] });
    } else if (sub === 'leave') {
      if (voiceChannel && 'setStatus' in voiceChannel && typeof (voiceChannel as any).setStatus === 'function') {
        (voiceChannel as any).setStatus('').catch(() => {});
      }
      queue.destroy();
      await interaction.reply({ embeds: [CustomEmbed.info('🚪 Voice Disconnected', 'Disconnected from voice channel.')] });
    } else if (sub === 'queue') {
      const embed = new CustomEmbed().setTitle(`🎶 Server Music Queue (${queue.queue.length} upcoming)`).setColor(COLORS.PRIMARY);

      if (queue.currentTrack) {
        embed.addFields({
          name: 'Currently Playing',
          value: `▶️ **${queue.currentTrack.title}** (${queue.currentTrack.duration})`,
        });
      }

      if (queue.queue.length === 0) {
        embed.setDescription('No more songs in queue.');
      } else {
        const list = queue.queue.slice(0, 10).map((t, i) => `${i + 1}. **${t.title}** (${t.duration})`).join('\n');
        embed.setDescription(list);
      }

      await interaction.reply({ embeds: [embed] });
    } else if (sub === 'nowplaying') {
      if (!queue.currentTrack) {
        await interaction.reply({ embeds: [CustomEmbed.info('Idle', 'Nothing is currently playing.')], ephemeral: true });
        return;
      }

      const equalizerAnim = 'ılı.lıllılı.ıllı. 02:14 ───⚪──── 04:30 ılı.lıllılı.ıllı';
      const embed = new CustomEmbed()
        .setTitle('🎶 Now Playing')
        .setDescription(
          `**[${queue.currentTrack.title}](${queue.currentTrack.url})**\n\n\`${equalizerAnim}\`\n\n⏱️ Duration: \`${queue.currentTrack.duration}\`\n👤 Requested by: ${queue.currentTrack.requestedBy}\n🔊 Volume: \`${queue.volume}%\` | 🔁 Loop: \`${queue.isLooping ? 'Track' : queue.isQueueLooping ? 'Queue' : 'Off'}\``
        )
        .setColor(COLORS.PRIMARY);
      if (queue.currentTrack.thumbnail) embed.setThumbnail(queue.currentTrack.thumbnail);

      const row = createMusicControlRow(queue.isPlaying, queue.isLooping || queue.isQueueLooping);
      await interaction.reply({ embeds: [embed], components: [row] });
    } else if (sub === 'volume') {
      const vol = interaction.options.getInteger('percent', true);
      queue.volume = vol;
      await interaction.reply({ embeds: [CustomEmbed.success('🔊 Volume Adjusted', `Volume set to **${vol}%**.`)] });
    } else if (sub === 'loop') {
      const mode = interaction.options.getString('mode', true);
      if (mode === 'track') {
        queue.isLooping = true;
        queue.isQueueLooping = false;
        await interaction.reply({ embeds: [CustomEmbed.info('🔁 Looping', 'Looping current track.')] });
      } else if (mode === 'queue') {
        queue.isLooping = false;
        queue.isQueueLooping = true;
        await interaction.reply({ embeds: [CustomEmbed.info('🔁 Looping', 'Looping entire queue.')] });
      } else {
        queue.isLooping = false;
        queue.isQueueLooping = false;
        await interaction.reply({ embeds: [CustomEmbed.info('🔁 Looping', 'Looping turned off.')] });
      }
    }
  },
};
