import { ProviderRegistry } from './registry';
import { BaseProvider } from './base';
import { VideoMetadata, VideoFormat, ProviderCapabilities, ExtractionResult, ProviderInfo } from '../types';

// Create test providers
class TestProvider1 extends BaseProvider {
  readonly id = 'provider1';
  readonly name = 'Provider One';
  readonly supportedDomains = ['site1.com', 'site2.com'];
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

  canHandle(_url: string): boolean {
    return this.supportedDomains.some(d => _url.includes(d));
  }

  async analyze(_url: string): Promise<ExtractionResult> {
    return {
      metadata: { title: 'Test', duration: 0, formats: [], source: 'https://site1.com/video' },
      providerId: this.id,
    };
  }

  getFormats(_metadata: VideoMetadata): VideoFormat[] {
    return [];
  }

  async getPlaybackSource(_metadata: VideoMetadata, _formatId: string): Promise<string> {
    return '';
  }

  async download(_metadata: VideoMetadata, _formatId: string, outputPath: string): Promise<string> {
    return outputPath;
  }

  validateFormat(_metadata: VideoMetadata, _formatId: string): boolean {
    return true;
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
}

class TestProvider2 extends BaseProvider {
  readonly id = 'provider2';
  readonly name = 'Provider Two';
  readonly supportedDomains = ['site3.com', 'site4.com'];
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

  canHandle(_url: string): boolean {
    return this.supportedDomains.some(d => _url.includes(d));
  }

  async analyze(_url: string): Promise<ExtractionResult> {
    return {
      metadata: { title: 'Test', duration: 0, formats: [], source: 'https://site3.com/video' },
      providerId: this.id,
    };
  }

  getFormats(_metadata: VideoMetadata): VideoFormat[] {
    return [];
  }

  async getPlaybackSource(_metadata: VideoMetadata, _formatId: string): Promise<string> {
    return '';
  }

  async download(_metadata: VideoMetadata, _formatId: string, outputPath: string): Promise<string> {
    return outputPath;
  }

  validateFormat(_metadata: VideoMetadata, _formatId: string): boolean {
    return true;
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
}

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  describe('register', () => {
    it('should register a provider', () => {
      const provider = new TestProvider1();
      registry.register(provider);
      expect(registry.get('provider1')).toBe(provider);
    });

    it('should register multiple providers', () => {
      registry.register(new TestProvider1());
      registry.register(new TestProvider2());
      expect(registry.get('provider1')).toBeDefined();
      expect(registry.get('provider2')).toBeDefined();
    });

    it('should override provider with same id', () => {
      registry.register(new TestProvider1());
      const newProvider = new TestProvider1();
      registry.register(newProvider);
      expect(registry.get('provider1')).toBe(newProvider);
    });
  });

  describe('get', () => {
    it('should return provider by id', () => {
      const provider = new TestProvider1();
      registry.register(provider);
      expect(registry.get('provider1')).toBe(provider);
    });

    it('should return undefined for non-existent provider', () => {
      expect(registry.get('nonexistent')).toBeUndefined();
    });
  });

  describe('findProvider', () => {
    it('should find provider by supported domain', () => {
      registry.register(new TestProvider1());
      registry.register(new TestProvider2());
      expect(registry.findProvider('https://site1.com/video')).toBeDefined();
      expect(registry.findProvider('https://site1.com/video')?.id).toBe('provider1');
      expect(registry.findProvider('https://site3.com/video')?.id).toBe('provider2');
    });

    it('should return undefined for unsupported domain', () => {
      registry.register(new TestProvider1());
      expect(registry.findProvider('https://unknown.com/video')).toBeUndefined();
    });

    it('should handle subdomains', () => {
      registry.register(new TestProvider1());
      expect(registry.findProvider('https://sub.site1.com/video')).toBeDefined();
    });
  });

  describe('getAll', () => {
    it('should return all registered providers', () => {
      registry.register(new TestProvider1());
      registry.register(new TestProvider2());
      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all.map(p => p.id)).toContain('provider1');
      expect(all.map(p => p.id)).toContain('provider2');
    });

    it('should return empty array when no providers registered', () => {
      expect(registry.getAll()).toHaveLength(0);
    });
  });

  describe('getAllInfo', () => {
    it('should return provider info for all providers', () => {
      registry.register(new TestProvider1());
      registry.register(new TestProvider2());
      const info = registry.getAllInfo();
      expect(info).toHaveLength(2);
      expect(info[0]).toHaveProperty('id', 'provider1');
      expect(info[0]).toHaveProperty('name', 'Provider One');
      expect(info[0]).toHaveProperty('supportedDomains');
    });
  });

  describe('has', () => {
    it('should return true for registered provider', () => {
      registry.register(new TestProvider1());
      expect(registry.has('provider1')).toBe(true);
    });

    it('should return false for non-existent provider', () => {
      expect(registry.has('nonexistent')).toBe(false);
    });
  });

  describe('unregister', () => {
    it('should remove a provider', () => {
      registry.register(new TestProvider1());
      expect(registry.has('provider1')).toBe(true);
      registry.unregister('provider1');
      expect(registry.has('provider1')).toBe(false);
    });

    it('should not throw for non-existent provider', () => {
      expect(() => registry.unregister('nonexistent')).not.toThrow();
    });
  });
});