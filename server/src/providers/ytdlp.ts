import { spawn } from 'child_process';
import { IProvider, BaseProvider } from './base';
import { VideoMetadata, VideoFormat, ExtractionResult, ProviderCapabilities } from '../types';
import { config } from '../config';

/**
 * yt-dlp provider - uses yt-dlp for extraction
 * Supports 1000+ sites through yt-dlp's extensive extractor library
 */
export class YtDlpProvider extends BaseProvider implements IProvider {
  readonly id = 'ytdlp';
  readonly name = 'yt-dlp Universal Extractor';
  readonly version = '1.1.0';
  readonly status: 'active' | 'deprecated' | 'broken' | 'maintenance' = 'active';

  readonly supportedDomains = [
    'youtube.com',
    'youtu.be',
    'vimeo.com',
    'dailymotion.com',
    'twitch.tv',
    'facebook.com',
    'fb.watch',
    'instagram.com',
    'twitter.com',
    'x.com',
    'tiktok.com',
    'reddit.com',
    'soundcloud.com',
    'bandcamp.com',
    'streamable.com',
    'archive.org',
    'bilibili.com',
    'nicovideo.jp',
    'rumble.com',
    'odysee.com',
    'peertube',
  ];

  readonly capabilities: ProviderCapabilities = {
    video: true,
    audio: true,
    live: true,
    playlists: false,
    subtitles: true,
    dash: true,
    hls: true,
    requiresAuth: false,
    geoRestricted: true,
  };

  canHandle(url: string): boolean {
    try {
      const domain = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
      if (this.supportedDomains.some((d) => domain === d || domain.endsWith(`.${d}`))) {
        return true;
      }
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  }

  async analyze(url: string): Promise<ExtractionResult> {
    const metadata = await this.extractMetadata(url);

    const validFormats = metadata.formats.filter((f) => f.downloadable);
    if (validFormats.length === 0) {
      throw new Error('No downloadable formats found for this URL');
    }

    return {
      metadata,
      providerId: this.id,
    };
  }

  private async extractMetadata(url: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const args = [
        '-m',
        'yt_dlp',
        '--no-warnings',
        '--no-playlist',
        '--skip-download',
        '--dump-single-json',
        '--socket-timeout',
        '15',
        '--extractor-retries=3',
        url,
      ];

      const proc = spawn('python', args, {
        timeout: config.requestTimeout,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`yt-dlp failed (code ${code}): ${stderr}`));
          return;
        }

        try {
          const videoData = JSON.parse(stdout.trim());
          if (!videoData) {
            reject(new Error('No video data extracted'));
            return;
          }

          const metadata = this.parseMetadata(videoData, url);
          resolve(metadata);
        } catch (err) {
          reject(new Error(`Failed to parse yt-dlp output: ${err}`));
        }
      });

      proc.on('error', (err) => {
        if (err.message.includes('ENOENT')) {
          reject(new Error('yt-dlp not found. Please install yt-dlp.'));
        } else {
          reject(new Error(`yt-dlp process error: ${err.message}`));
        }
      });
    });
  }

  private isBrowserPlayable(ext: string, vcodec?: string, acodec?: string, protocol?: string): boolean {
    const p = (protocol || '').toLowerCase();
    if (p.includes('m3u8') || p.includes('dash') || p.includes('f4m')) {
      return false;
    }
    const e = ext.toLowerCase();
    const vc = (vcodec || '').toLowerCase();
    const ac = (acodec || '').toLowerCase();

    if (vc.startsWith('hev1') || vc.startsWith('hvc1') || vc.includes('hevc')) {
      return false;
    }
    if (ac && ac !== 'none' && (ac.includes('ac-3') || ac.includes('ec-3') || ac.includes('dts'))) {
      return false;
    }
    return ['mp4', 'webm', 'ogg', 'm4a', 'mp3', 'wav'].includes(e);
  }

  private parseMetadata(data: any, originalUrl: string): VideoMetadata {
    const formats: VideoFormat[] = [];
    const seenKeys = new Set<string>();
    const rawFormats: any[] = Array.isArray(data.formats) ? data.formats : [];

    // Locate best audio-only stream so high-res video-only streams can be paired with audio
    const audioOnlyStreams = rawFormats
      .filter((f) => f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none'))
      .sort((a, b) => (b.abr || 0) - (a.abr || 0));
    const bestAudio = audioOnlyStreams[0];

    for (const fmt of rawFormats) {
      if (!fmt.format_id || fmt.ext === 'mhtml' || fmt.protocol === 'mhtml') continue;

      const normalized = this.normalizeFormat(fmt);
      if (!normalized.downloadable) continue;

      const ext = (fmt.ext || normalized.ext || 'mp4').toLowerCase();
      const heightLabel = fmt.height ? `${fmt.height}p` : normalized.resolution || 'Unknown';
      const fps = fmt.fps ? Math.round(fmt.fps) : undefined;

      // 1. Progressive formats (already contain both video + audio)
      if (normalized.hasVideo && normalized.hasAudio) {
        const key = `prog-${ext}-${heightLabel}-${fps || 0}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        const playable = Boolean(fmt.url) && this.isBrowserPlayable(ext, fmt.vcodec, fmt.acodec, fmt.protocol);
        formats.push({
          ...normalized,
          ext,
          resolution: heightLabel,
          fps,
          playable,
          playbackUrl: playable ? fmt.url : undefined,
        });
      }

      // 2. High-resolution video-only streams -> pair with bestAudio for FFmpeg muxing
      if (normalized.hasVideo && !normalized.hasAudio && bestAudio && (fmt.height || 0) >= 360) {
        const targetExt = ext === 'webm' && bestAudio.ext === 'webm' ? 'webm' : 'mp4';
        const key = `muxed-${targetExt}-${heightLabel}-${fps || 0}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        const videoSize = fmt.filesize || fmt.filesize_approx || 0;
        const audioSize = bestAudio.filesize || bestAudio.filesize_approx || 0;

        formats.push({
          ...normalized,
          formatId: `${fmt.format_id}+${bestAudio.format_id}`,
          ext: targetExt,
          resolution: heightLabel,
          fps,
          hasVideo: true,
          hasAudio: true,
          isCombined: false,
          acodec: bestAudio.acodec,
          filesize: videoSize && audioSize ? videoSize + audioSize : videoSize || undefined,
          playable: false, // Requires server-side FFmpeg muxing before playback/download
          downloadable: true,
        });
      }
    }

    // 3. Real Audio-Only options (if audio exists in source)
    if (bestAudio) {
      const audioExt = (bestAudio.ext || 'm4a').toLowerCase();
      const audioPlayable =
        Boolean(bestAudio.url) && this.isBrowserPlayable(audioExt, undefined, bestAudio.acodec, bestAudio.protocol);

      formats.push({
        formatId: String(bestAudio.format_id),
        ext: audioExt,
        resolution: 'Audio Only',
        mimeType: audioExt === 'webm' ? 'audio/webm' : 'audio/mp4',
        hasVideo: false,
        hasAudio: true,
        isCombined: true,
        acodec: bestAudio.acodec,
        filesize: bestAudio.filesize || bestAudio.filesize_approx,
        playable: audioPlayable,
        downloadable: true,
        playbackUrl: audioPlayable ? bestAudio.url : undefined,
      });

      // FFmpeg MP3 conversion option
      formats.push({
        formatId: 'bestaudio[ext=m4a]/bestaudio',
        ext: 'mp3',
        resolution: 'Audio Only (MP3)',
        mimeType: 'audio/mpeg',
        hasVideo: false,
        hasAudio: true,
        isCombined: false,
        acodec: 'mp3',
        playable: false,
        downloadable: true,
      });
    }

    // Sort: combined video+audio first (highest res to lowest), then audio-only
    formats.sort((a, b) => {
      if (a.hasVideo !== b.hasVideo) return a.hasVideo ? -1 : 1;
      const aHeight = parseInt(a.resolution || '0', 10) || 0;
      const bHeight = parseInt(b.resolution || '0', 10) || 0;
      return bHeight - aHeight;
    });

    return {
      title: data.title || 'Unknown Title',
      description: data.description,
      thumbnail: data.thumbnail,
      duration: data.duration,
      source: data.extractor_key || this.extractDomain(originalUrl) || 'Unknown',
      formats,
      uploader: data.uploader,
      uploaderUrl: data.uploader_url,
      uploadDate: data.upload_date,
      viewCount: data.view_count,
      likeCount: data.like_count,
      isLive: data.is_live || false,
      ageRestricted: data.age_limit ? data.age_limit > 0 : false,
      availability: data.availability,
    };
  }

  getFormats(metadata: VideoMetadata): VideoFormat[] {
    return metadata.formats;
  }

  async getPlaybackSource(metadata: VideoMetadata, formatId: string, originalUrl?: string): Promise<string> {
    const format = metadata.formats.find((f) => f.formatId === formatId);
    if (!format) {
      throw new Error('Format not found');
    }
    if ((format as any).playbackUrl) {
      return (format as any).playbackUrl;
    }
    if (!originalUrl) {
      throw new Error('Direct browser playback is not available for this format');
    }

    return new Promise((resolve, reject) => {
      const proc = spawn('python', ['-m', 'yt_dlp', '--no-warnings', '-f', formatId, '-g', originalUrl], {
        timeout: config.requestTimeout,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (d) => (stdout += d.toString()));
      proc.stderr.on('data', (d) => (stderr += d.toString()));
      proc.on('close', (code) => {
        const directUrl = stdout.trim().split('\n')[0];
        if (code === 0 && directUrl?.startsWith('http')) {
          resolve(directUrl);
        } else {
          reject(new Error(stderr || 'Unable to resolve direct playback stream'));
        }
      });
    });
  }

  async download(metadata: VideoMetadata, formatId: string, _outputPath: string): Promise<string> {
    const format = metadata.formats.find((f) => f.formatId === formatId);
    if (!format) {
      throw new Error('Format not found');
    }
    throw new Error('Direct download handled via background job queue');
  }

  private extractDomain(url: string): string | null {
    try {
      return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    } catch {
      return null;
    }
  }
}

export const ytdlpProvider = new YtDlpProvider();