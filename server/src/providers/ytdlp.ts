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
  readonly version = '1.0.0';
  readonly status: 'active' | 'deprecated' | 'broken' | 'maintenance' = 'active';

  // yt-dlp supports a vast number of domains - we list major categories
  readonly supportedDomains = [
    // Major video platforms
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
    // Many more supported through yt-dlp's generic extractor
  ];

  readonly capabilities: ProviderCapabilities = {
    video: true,
    audio: true,
    live: true,
    playlists: true,
    subtitles: true,
    dash: true,
    hls: true,
    requiresAuth: false,
    geoRestricted: true,
  };

  canHandle(url: string): boolean {
    try {
      const domain = new URL(url).hostname.toLowerCase().replace(/^www\./, '');

      // Check direct domain match
      if (this.supportedDomains.some((d) => domain === d || domain.endsWith(`.${d}`))) {
        return true;
      }

      // yt-dlp has a generic extractor that works for many sites
      // We allow it to try for any valid HTTP/HTTPS URL
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  }

  async analyze(url: string): Promise<ExtractionResult> {
    const metadata = await this.extractMetadata(url);

    // Validate we got usable formats
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
        'yt_dlp',  // module name for -m
        '--no-warnings',
        '--skip-download',
        '--print-json',
        '--no-check-certificate',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
        '--extractor-retries=3',
        '--extractor-args=youtube:player_client=web',
        url,
      ];

      const proc = spawn('python', ['-m'].concat(args), {
        timeout: config.requestTimeout,
        stdio: ['ignore', 'pipe', 'pipe'],
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
          // yt-dlp outputs JSON lines for each entry
          const lines = stdout.trim().split('\n').filter((l) => l.trim());
          const data = lines.map((line) => JSON.parse(line));

          // For single videos, we get one entry; for playlists, multiple
          const videoData = data[0];
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

  private parseMetadata(data: any, originalUrl: string): VideoMetadata {
    const formats: VideoFormat[] = [];

    // Parse formats from yt-dlp output
    if (data.formats && Array.isArray(data.formats)) {
      for (const fmt of data.formats) {
        const normalized = this.normalizeFormat(fmt);
        if (normalized.downloadable) {
          formats.push(normalized);
        }
      }
    }

    // Also include the requested format if it's not in formats array
    if (data.format_id && !formats.some((f) => f.formatId === data.format_id)) {
      const normalized = this.normalizeFormat(data);
      if (normalized.downloadable) {
        formats.push(normalized);
      }
    }

    // Sort formats: video+audio first, then video-only, then audio-only
    // Within each group, sort by quality (height) descending
    formats.sort((a, b) => {
      const aGroup = a.hasVideo && a.hasAudio ? 0 : a.hasVideo ? 1 : 2;
      const bGroup = b.hasVideo && b.hasAudio ? 0 : b.hasVideo ? 1 : 2;
      if (aGroup !== bGroup) return aGroup - bGroup;

      const aHeight = parseInt(a.resolution || '0', 10);
      const bHeight = parseInt(b.resolution || '0', 10);
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

  async getPlaybackSource(metadata: VideoMetadata, formatId: string): Promise<string> {
    const format = metadata.formats.find((f) => f.formatId === formatId);
    if (!format) {
      throw new Error('Format not found');
    }

    // For browser playback, we need a direct URL
    // This would require re-extracting with the specific format
    // For now, return a placeholder - actual implementation would use yt-dlp -g
    return new Promise((_resolve, _reject) => {
      // We need the original URL - this is a simplified version
      // In production, store the original URL with metadata
      throw new Error('Playback source requires original URL');
    });
  }

  async download(metadata: VideoMetadata, formatId: string, _outputPath: string): Promise<string> {
    const format = metadata.formats.find((f) => f.formatId === formatId);
    if (!format) {
      throw new Error('Format not found');
    }

    // This is a placeholder - actual download would use yt-dlp with format selection
    // and stream to outputPath
    throw new Error('Direct download not implemented in provider - use job queue');
  }

  private extractDomain(url: string): string | null {
    try {
      return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    } catch {
      return null;
    }
  }
}

// Export singleton
export const ytdlpProvider = new YtDlpProvider();