import { BaseProvider } from './base';
import { VideoMetadata, VideoFormat, ProviderCapabilities, ExtractionResult, ProviderInfo } from '../types';

// Create a concrete implementation for testing
class TestProvider extends BaseProvider {
  readonly id = 'test';
  readonly name = 'Test Provider';
  readonly supportedDomains = ['test.com', 'example.com'];
  readonly capabilities: ProviderCapabilities = {
    video: true,
    audio: true,
    live: false,
    playlists: false,
    subtitles: false,
    dash: false,
    hls: false,
    requiresAuth: false,
    geoRestricted: false,
  };
  readonly version = '1.0.0';
  readonly status = 'active' as const;

  canHandle(url: string): boolean {
    return this.supportedDomains.some(d => url.includes(d));
  }

  async analyze(_url: string): Promise<ExtractionResult> {
    const metadata: VideoMetadata = {
      title: 'Test Video',
      description: 'Test Description',
      duration: 120,
      thumbnail: 'https://example.com/thumb.jpg',
      uploader: 'Test Uploader',
      uploadDate: '2024-01-01',
      viewCount: 1000,
      likeCount: 100,
      source: 'https://test.com/video',
      formats: [
        {
          formatId: 'best',
          ext: 'mp4',
          resolution: '1920x1080',
          filesize: 10000000,
          vcodec: 'h264',
          acodec: 'aac',
          hasVideo: true,
          hasAudio: true,
          playable: true,
          downloadable: true,
          quality: '1080p',
        },
      ],
    };

    return {
      metadata,
      providerId: this.id,
    };
  }

  getFormats(metadata: VideoMetadata): VideoFormat[] {
    return metadata.formats;
  }

  async getPlaybackSource(_metadata: VideoMetadata, _formatId: string): Promise<string> {
    return '';
  }

  async download(_metadata: VideoMetadata, _formatId: string, outputPath: string): Promise<string> {
    return outputPath;
  }

  validateFormat(metadata: VideoMetadata, formatId: string): boolean {
    return metadata.formats.some(f => f.formatId === formatId);
  }

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

  sanitizeFilename(filename: string): string {
    return super.sanitizeFilename(filename);
  }
}

describe('BaseProvider', () => {
  let provider: TestProvider;

  beforeEach(() => {
    provider = new TestProvider();
  });

  describe('sanitizeFilename', () => {
    it('should remove invalid Windows characters', () => {
      expect(provider.sanitizeFilename('test<>:"/\\|?*file')).toBe('test_________file');
    });

    it('should trim whitespace and dots', () => {
      expect(provider.sanitizeFilename('  test file  ')).toBe('test file');
      expect(provider.sanitizeFilename('...test...')).toBe('test');
    });

    it('should limit length to 200 characters', () => {
      const longName = 'a'.repeat(250);
      expect(provider.sanitizeFilename(longName).length).toBe(200);
    });

    it('should handle empty string', () => {
      expect(provider.sanitizeFilename('')).toBe('');
    });

    it('should preserve valid characters', () => {
      expect(provider.sanitizeFilename('valid-file_name.mp4')).toBe('valid-file_name.mp4');
      expect(provider.sanitizeFilename('file with spaces.txt')).toBe('file with spaces.txt');
    });

    it('should handle unicode characters', () => {
      expect(provider.sanitizeFilename('тест-فيديو-视频.mp4')).toBe('тест-فيديو-视频.mp4');
    });
  });

  describe('properties', () => {
    it('should have correct id', () => {
      expect(provider.id).toBe('test');
    });

    it('should have correct name', () => {
      expect(provider.name).toBe('Test Provider');
    });

    it('should have supported domains', () => {
      expect(provider.supportedDomains).toContain('test.com');
      expect(provider.supportedDomains).toContain('example.com');
    });

    it('should have capabilities', () => {
      expect(provider.capabilities).toBeDefined();
      expect(provider.capabilities.video).toBe(true);
    });

    it('should have version', () => {
      expect(provider.version).toBe('1.0.0');
    });

    it('should have status', () => {
      expect(provider.status).toBe('active');
    });
  });

  describe('analyze', () => {
    it('should return metadata and providerId', async () => {
      const result = await provider.analyze('https://test.com/video');

      expect(result.metadata.title).toBe('Test Video');
      expect(result.metadata.duration).toBe(120);
      expect(result.metadata.formats).toHaveLength(1);
      expect(result.metadata.formats[0].formatId).toBe('best');
      expect(result.metadata.formats[0].hasVideo).toBe(true);
      expect(result.metadata.formats[0].hasAudio).toBe(true);
      expect(result.providerId).toBe('test');
    });
  });

  describe('download', () => {
    it('should not throw', async () => {
      const result = await provider.analyze('https://test.com/video');
      await expect(provider.download(result.metadata, 'best', '/tmp/output.mp4')).resolves.not.toThrow();
    });
  });

  describe('canHandle', () => {
    it('should return true for supported domains', () => {
      expect(provider.canHandle('https://test.com/video')).toBe(true);
      expect(provider.canHandle('https://example.com/video')).toBe(true);
    });

    it('should return false for unsupported domains', () => {
      expect(provider.canHandle('https://unknown.com/video')).toBe(false);
    });
  });

  describe('getProviderInfo', () => {
    it('should return provider info', () => {
      const info = provider.getProviderInfo();
      expect(info.id).toBe('test');
      expect(info.name).toBe('Test Provider');
      expect(info.supportedDomains).toEqual(['test.com', 'example.com']);
    });
  });
});