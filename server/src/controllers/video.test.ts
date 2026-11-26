import { Request, Response } from 'express';

// Mock crypto.randomUUID
const mockRandomUUID = jest.fn().mockReturnValue('job-123');
jest.mock('crypto', () => ({
  randomUUID: () => mockRandomUUID(),
}));

// Mock factories - defined at module level for hoisting
const createMockProviderRegistry = () => ({
  findProvider: jest.fn(),
  get: jest.fn(),
  getAllInfo: jest.fn().mockReturnValue([]),
  size: jest.fn().mockReturnValue(1),
});

const createMockJobStore = () => new Map<string, any>();

const createMockJobQueue = () => ({
  addDownloadJob: jest.fn().mockResolvedValue('job-123'),
  getJobStatus: jest.fn().mockResolvedValue(null),
  cancelJob: jest.fn().mockResolvedValue(true),
});

const createMockValidateUrl = () => jest.fn();
const createMockSanitizeUrl = () => jest.fn((url: string) => url.trim());

// Module-level holders for mock functions (to avoid hoisting issues)
let mockProviderRegistryHolder: { fn: ReturnType<typeof createMockProviderRegistry> } = { fn: createMockProviderRegistry() };
let mockJobStoreHolder: { fn: Map<string, any> } = { fn: createMockJobStore() };
let mockJobQueueHolder: { fn: ReturnType<typeof createMockJobQueue> } = { fn: createMockJobQueue() };
let mockValidateUrlHolder: { fn: ReturnType<typeof createMockValidateUrl> } = { fn: createMockValidateUrl() };
let mockSanitizeUrlHolder: { fn: ReturnType<typeof createMockSanitizeUrl> } = { fn: createMockSanitizeUrl() };

// Mock modules at top level (hoisted)
jest.mock('../providers', () => ({
  get providerRegistry() {
    return mockProviderRegistryHolder.fn;
  },
}));

jest.mock('../jobs/queue', () => ({
  JobQueue: jest.fn().mockImplementation(() => ({
    addDownloadJob: (...args: any[]) => mockJobQueueHolder.fn.addDownloadJob(...args),
    getJobStatus: (...args: any[]) => mockJobQueueHolder.fn.getJobStatus(...args),
    cancelJob: (...args: any[]) => mockJobQueueHolder.fn.cancelJob(...args),
  })),
  getJobStore: () => mockJobStoreHolder.fn,
  __resetJobQueueForTesting: jest.fn(),
}));

jest.mock('../validators/url', () => ({
  get validateUrl() {
    return mockValidateUrlHolder.fn;
  },
  get sanitizeUrl() {
    return mockSanitizeUrlHolder.fn;
  },
  analysisRequestSchema: {
    safeParse: (data: any) => {
      if (!data.url) {
        return { success: false, error: { errors: [{ message: 'URL is required' }] } };
      }
      return { success: true, data };
    },
  },
  downloadRequestSchema: {
    safeParse: (data: any) => {
      if (!data.url || !data.formatId) {
        return { success: false, error: { errors: [{ message: 'URL and formatId are required' }] } };
      }
      return { success: true, data };
    },
  },
}));

jest.mock('../config', () => ({
  config: {
    tempDir: '/tmp',
    maxConcurrentJobs: 2,
    requestTimeout: 30000,
    redisUrl: 'redis://localhost:6379',
    blockedDomains: [],
    allowedDomains: [],
  },
}));

// Import controller after mocks are set up
import * as videoController from './video';

describe('Video Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockReq = {
      params: {},
      query: {},
      body: {},
    };
    mockRes = {
      status: mockStatus,
      json: mockJson,
    };

    // Reset all mock holders
    mockProviderRegistryHolder.fn = createMockProviderRegistry();
    mockJobStoreHolder.fn = createMockJobStore();
    mockJobQueueHolder.fn = createMockJobQueue();
    mockValidateUrlHolder.fn = createMockValidateUrl();
    mockSanitizeUrlHolder.fn = createMockSanitizeUrl();
    mockRandomUUID.mockClear();
    mockRandomUUID.mockReturnValue('job-123');

    // Reset lazy-initialized instances
    videoController.__resetJobQueueForTesting();
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      await videoController.healthCheck(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          status: 'healthy',
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('getProviders', () => {
    it('should return all providers', async () => {
      const mockProviders = [
        { id: 'ytdlp', name: 'yt-dlp', supportedDomains: ['youtube.com'] },
      ];
      mockProviderRegistryHolder.fn.getAllInfo.mockReturnValue(mockProviders);

      await videoController.getProviders(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockProviders,
        })
      );
    });
  });

  describe('getProvider', () => {
    it('should return provider by id', async () => {
      const mockProvider = { id: 'ytdlp', name: 'yt-dlp', supportedDomains: ['youtube.com'] };
      mockProviderRegistryHolder.fn.get.mockReturnValue({
        getProviderInfo: () => mockProvider,
      });

      mockReq.params = { providerId: 'ytdlp' };
      await videoController.getProvider(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockProvider,
        })
      );
    });

    it('should return 404 for non-existent provider', async () => {
      mockProviderRegistryHolder.fn.get.mockReturnValue(undefined);

      mockReq.params = { providerId: 'nonexistent' };
      await videoController.getProvider(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Provider not found',
        })
      );
    });
  });

  describe('analyzeVideo', () => {
    it('should return 400 when URL is missing', async () => {
      mockReq.body = {};

      await videoController.analyzeVideo(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid request',
        })
      );
    });

    it('should return 400 when URL is invalid', async () => {
      mockValidateUrlHolder.fn = jest.fn().mockImplementation(() => {
        throw new Error('Invalid URL');
      });

      mockReq.body = { url: 'invalid-url' };

      await videoController.analyzeVideo(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 when no provider found for domain', async () => {
      mockProviderRegistryHolder.fn.findProvider.mockReturnValue(undefined);

      mockReq.body = { url: 'https://unknown.com/video' };
      mockValidateUrlHolder.fn.mockReturnValue(undefined);

      await videoController.analyzeVideo(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Unsupported URL. This website is not currently supported.',
        })
      );
    });

    it('should analyze video and return metadata', async () => {
      const mockMetadata = {
        id: 'video-123',
        title: 'Test Video',
        duration: 120,
        thumbnail: 'https://example.com/thumb.jpg',
        uploader: 'Test Uploader',
        uploadDate: '2024-01-01',
        viewCount: 1000,
        likeCount: 100,
        tags: ['test'],
        formats: [
          { formatId: 'best', ext: 'mp4', hasVideo: true, hasAudio: true, quality: '1080p', playable: true, downloadable: true },
        ],
      };

      const mockFormats = [
        { formatId: 'best', ext: 'mp4', hasVideo: true, hasAudio: true, quality: '1080p', playable: true, downloadable: true },
      ];

      mockProviderRegistryHolder.fn.findProvider.mockReturnValue({
        getProviderInfo: () => ({ status: 'active' }),
        analyze: jest.fn().mockResolvedValue({ metadata: mockMetadata, formats: mockFormats, providerId: 'ytdlp' }),
        id: 'ytdlp',
      });

      mockReq.body = { url: 'https://youtube.com/watch?v=test' };
      mockValidateUrlHolder.fn.mockReturnValue(undefined);

      await videoController.analyzeVideo(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: 'video-123',
            title: 'Test Video',
            formats: mockFormats,
          }),
        })
      );
    });
  });

  describe('downloadVideo', () => {
    it('should return 400 when required fields missing', async () => {
      mockReq.body = { url: 'https://youtube.com/watch?v=test' };

      await videoController.downloadVideo(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid request',
        })
      );
    });

    it('should return 400 when URL is invalid', async () => {
      mockValidateUrlHolder.fn = jest.fn().mockImplementation(() => {
        throw new Error('Invalid URL');
      });

      mockReq.body = { url: 'invalid', formatId: 'best' };

      await videoController.downloadVideo(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should create download job and return job ID', async () => {
      mockProviderRegistryHolder.fn.findProvider.mockReturnValue({
        getProviderInfo: () => ({ status: 'active' }),
        analyze: jest.fn().mockResolvedValue({
          metadata: {
            id: 'video-123',
            title: 'Test Video',
            formats: [
              { formatId: 'best', ext: 'mp4', hasVideo: true, hasAudio: true, playable: true, downloadable: true },
            ],
          },
        }),
        id: 'ytdlp',
      });

      mockJobQueueHolder.fn.addDownloadJob.mockResolvedValue('job-123');

      const mockFormat = { formatId: 'best', ext: 'mp4', hasVideo: true, hasAudio: true, playable: true, downloadable: true };
      mockReq.body = {
        url: 'https://youtube.com/watch?v=test',
        formatId: 'best',
        format: mockFormat,
      };
      mockValidateUrlHolder.fn.mockReturnValue(undefined);

      await videoController.downloadVideo(mockReq as Request, mockRes as Response);

      expect(mockJobQueueHolder.fn.addDownloadJob).toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          jobId: 'job-123',
        })
      );
    });
  });

  describe('getJobStatus', () => {
    it('should return 404 when jobId is missing', async () => {
      mockReq.params = {};

      await videoController.getJobStatus(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Job not found',
        })
      );
    });

    it('should return job status from store', async () => {
      mockJobStoreHolder.fn.set('job-123', {
        jobId: 'job-123',
        status: 'completed',
        progress: 100,
        message: 'Done',
        filename: 'video.mp4',
        filesize: 1000000,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockReq.params = { jobId: 'job-123' };

      await videoController.getJobStatus(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            jobId: 'job-123',
            status: 'completed',
          }),
        })
      );
    });

    it('should return 404 for non-existent job', async () => {
      mockReq.params = { jobId: 'nonexistent' };

      await videoController.getJobStatus(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Job not found',
        })
      );
    });
  });

  describe('downloadFile', () => {
    it('should return 404 when jobId is missing', async () => {
      mockReq.params = {};

      await videoController.downloadFile(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });

    it('should return 404 when job not found', async () => {
      mockReq.params = { jobId: 'nonexistent' };

      await videoController.downloadFile(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });

    it('should return 400 when job not completed', async () => {
      mockJobStoreHolder.fn.set('job-123', {
        jobId: 'job-123',
        status: 'processing',
        progress: 50,
        downloadUrl: '/tmp/video.mp4',
        filename: 'video.mp4',
      });

      mockReq.params = { jobId: 'job-123' };

      await videoController.downloadFile(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Download not ready',
        })
      );
    });
  });
});