import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
  VoiceConnection,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import { VoiceBasedChannel } from 'discord.js';
import play from 'play-dl';
import { logger } from '../utils/logger.js';

export interface Track {
  title: string;
  url: string;
  duration: string;
  thumbnail?: string;
  requestedBy: string;
}

export class GuildMusicQueue {
  guildId: string;
  connection: VoiceConnection | null = null;
  player: AudioPlayer;
  queue: Track[] = [];
  currentTrack: Track | null = null;
  isPlaying: boolean = false;
  isLooping: boolean = false;
  isQueueLooping: boolean = false;
  volume: number = 100;
  private inactivityTimeout: NodeJS.Timeout | null = null;

  constructor(guildId: string) {
    this.guildId = guildId;
    this.player = createAudioPlayer();

    this.player.on(AudioPlayerStatus.Idle, () => {
      this.handleTrackEnd();
    });

    this.player.on('error', (error) => {
      logger.error({ error, guildId: this.guildId }, 'Audio player error encountered');
      this.handleTrackEnd();
    });
  }

  resetInactivityTimer() {
    if (this.inactivityTimeout) clearTimeout(this.inactivityTimeout);
    this.inactivityTimeout = setTimeout(() => {
      if (!this.isPlaying && this.connection) {
        logger.info({ guildId: this.guildId }, 'Leaving voice channel due to inactivity');
        this.destroy();
      }
    }, 180000); // 3 minutes timeout
  }

  join(channel: VoiceBasedChannel) {
    this.connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
    });

    this.connection.subscribe(this.player);

    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(this.connection!, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.connection!, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        this.destroy();
      }
    });

    this.resetInactivityTimer();
  }

  async playNext() {
    if (this.queue.length === 0) {
      this.currentTrack = null;
      this.isPlaying = false;
      this.resetInactivityTimer();
      return;
    }

    if (this.isLooping && this.currentTrack) {
      // Loop single track
    } else if (this.isQueueLooping && this.currentTrack) {
      this.queue.push(this.currentTrack);
      this.currentTrack = this.queue.shift() || null;
    } else {
      this.currentTrack = this.queue.shift() || null;
    }

    if (!this.currentTrack) return;

    try {
      let stream: any;
      
      // Initialize free SoundCloud client ID if not yet registered
      try {
        if (!play.is_expired()) {
          // Tokens valid
        }
      } catch {
        // Ignore token check error
      }

      // Attempt 1: Direct URL or primary extraction
      try {
        if (this.currentTrack.url.startsWith('http')) {
          stream = await play.stream(this.currentTrack.url, { discordPlayerCompatibility: true });
        } else {
          const search = await play.search(this.currentTrack.title, { limit: 1 });
          if (search.length > 0) {
            stream = await play.stream(search[0].url, { discordPlayerCompatibility: true });
          }
        }
      } catch (primaryErr: any) {
        logger.warn({ err: primaryErr.message, track: this.currentTrack.title }, 'Primary stream failed (YouTube bot block), attempting SoundCloud fallback...');

        // Attempt 2: Fallback to SoundCloud to bypass YouTube datacenter/bot IP block
        try {
          const clientID = await play.getFreeClientID().catch(() => null);
          if (clientID) {
            await play.setToken({ soundcloud: { client_id: clientID } }).catch(() => {});
          }
          const scSearch = await play.search(this.currentTrack.title, {
            source: { soundcloud: 'tracks' },
            limit: 1,
          });

          if (scSearch && scSearch.length > 0) {
            stream = await play.stream(scSearch[0].url, { discordPlayerCompatibility: true });
            logger.info({ track: scSearch[0].name }, 'Successfully streamed audio via SoundCloud fallback');
          } else {
            throw primaryErr;
          }
        } catch (fallbackErr) {
          throw primaryErr;
        }
      }

      if (!stream) {
        throw new Error('No audio stream could be extracted.');
      }

      const resource = createAudioResource(stream.stream, {
        inputType: stream.type,
        inlineVolume: true,
      });

      resource.volume?.setVolume(this.volume / 100);
      this.player.play(resource);
      this.isPlaying = true;
      if (this.inactivityTimeout) clearTimeout(this.inactivityTimeout);
    } catch (err: any) {
      logger.error({ err: err?.message || err, track: this.currentTrack }, 'Failed to play track, skipping');
      this.handleTrackEnd();
    }
  }

  private handleTrackEnd() {
    this.playNext();
  }

  pause() {
    return this.player.pause();
  }

  resume() {
    return this.player.unpause();
  }

  stop() {
    this.queue = [];
    this.currentTrack = null;
    this.player.stop();
    this.isPlaying = false;
    this.resetInactivityTimer();
  }

  skip() {
    this.player.stop();
  }

  destroy() {
    if (this.inactivityTimeout) clearTimeout(this.inactivityTimeout);
    this.stop();
    if (this.connection) {
      this.connection.destroy();
      this.connection = null;
    }
    musicManager.deleteQueue(this.guildId);
  }
}

export class MusicManager {
  private queues = new Map<string, GuildMusicQueue>();

  getQueue(guildId: string): GuildMusicQueue {
    let queue = this.queues.get(guildId);
    if (!queue) {
      queue = new GuildMusicQueue(guildId);
      this.queues.set(guildId, queue);
    }
    return queue;
  }

  deleteQueue(guildId: string) {
    this.queues.delete(guildId);
  }
}

export const musicManager = new MusicManager();
