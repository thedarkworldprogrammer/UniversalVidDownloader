import { VideoMetadata, VideoFormat, ProviderInfo, ProviderCapabilities, ExtractionResult } from '../types';

/**
 * Base provider interface - all providers must implement this
 */
export interface IProvider {
  readonly id: string;
  readonly name: string;
  readonly supportedDomains: string[];
  readonly capabilities: ProviderCapabilities;
  readonly version: string;
  readonly status: 'active' | 'deprecated' | 'broken' | 'maintenance';

  /**
   * Check if this provider can handle the given URL
   */
  canHandle(url: string): boolean;

  /**
   * Extract video metadata and formats from URL
   */
  analyze(url: string): Promise<ExtractionResult>;

  /**
   * Get available formats for the extracted metadata
   */
  getFormats(metadata: VideoMetadata): VideoFormat[];

  /**
   * Get direct playback URL for a format
   */
  getPlaybackSource(metadata: VideoMetadata, formatId: string): Promise<string>;

  /**
   * Download a specific format
   */
  download(metadata: VideoMetadata, formatId: string, outputPath: string): Promise<string>;

  /**
   * Get provider information
   */
  getProviderInfo(): ProviderInfo;

  /**
   * Validate if a format is available
   */
  validateFormat(metadata: VideoMetadata, formatId: string): boolean;

  /**
   * Sanitize filename for safe download
   */
  sanitizeFilename(filename: string): string;
}

/**
 * Abstract base class for providers
 */
export abstract class BaseProvider implements IProvider {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly supportedDomains: string[];
  abstract readonly capabilities: ProviderCapabilities;
  abstract readonly version: string;
  abstract readonly status: 'active' | 'deprecated' | 'broken' | 'maintenance';

  abstract canHandle(url: string): boolean;
  abstract analyze(url: string): Promise<ExtractionResult>;
  abstract getFormats(metadata: VideoMetadata): VideoFormat[];
  abstract getPlaybackSource(metadata: VideoMetadata, formatId: string): Promise<string>;
  abstract download(metadata: VideoMetadata, formatId: string, outputPath: string): Promise<string>;

  getProviderInfo(): ProviderInfo {
    return {
      id: this.id,
      name: this.name,
      supportedDomains: this.supportedDomains,
      capabilities: this.capabilities,
      status: this.status,
      version: this.version,
    };
  }

  validateFormat(metadata: VideoMetadata, formatId: string): boolean {
    return metadata.formats.some((f) => f.formatId === formatId);
  }

  sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^\.+|\.+$/g, '')
      .substring(0, 200);
  }

  /**
   * Normalize format data from extraction tools
   */
  protected normalizeFormat(raw: any): VideoFormat {
    return {
      formatId: raw.format_id || raw.formatId || `${raw.ext}-${raw.height || 'unknown'}`,
      ext: raw.ext || 'unknown',
      resolution: raw.height ? `${raw.height}p` : raw.resolution,
      mimeType: raw.mimeType || raw.mime_type,
      hasAudio: raw.hasAudio ?? (raw.acodec !== 'none' && raw.acodec !== undefined),
      hasVideo: raw.hasVideo ?? (raw.vcodec !== 'none' && raw.vcodec !== undefined),
      filesize: raw.filesize || raw.filesize_approx,
      filesizeApprox: raw.filesize_approx || raw.filesize,
      vcodec: raw.vcodec,
      acodec: raw.acodec,
      fps: raw.fps,
      playable: this.isPlayableInBrowser(raw),
      downloadable: true,
      quality: raw.quality,
      bitrate: raw.tbr || raw.vbr,
      abr: raw.abr,
      vbr: raw.vbr,
      language: raw.language,
      container: raw.container,
    };
  }

  /**
   * Check if format is playable in browser
   */
  protected isPlayableInBrowser(format: any): boolean {
    const browserPlayable = [
      'mp4',
      'webm',
      'ogg',
      'm4v',
    ];

    const ext = (format.ext || '').toLowerCase();
    const vcodec = (format.vcodec || '').toLowerCase();
    const acodec = (format.acodec || '').toLowerCase();

    // Check container
    if (!browserPlayable.includes(ext)) {
      return false;
    }

    // Check video codec
    if (format.hasVideo) {
      const supportedVideoCodecs = ['avc1', 'h264', 'vp8', 'vp9', 'av01', 'hev1', 'hvc1'];
      if (!supportedVideoCodecs.some((c) => vcodec.includes(c))) {
        return false;
      }
    }

    // Check audio codec
    if (format.hasAudio) {
      const supportedAudioCodecs = ['mp4a', 'aac', 'opus', 'vorbis', 'mp3'];
      if (!supportedAudioCodecs.some((c) => acodec.includes(c))) {
        return false;
      }
    }

    return true;
  }
}