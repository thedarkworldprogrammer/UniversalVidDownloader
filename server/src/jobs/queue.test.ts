import { JobQueue, getJobStore, updateJobStatus } from './queue';
import { JobData, VideoFormat } from '../types';

// Mock BullMQ using a module factory pattern - mocks must be defined before jest.mock
const createMockJob = () => ({
  id: 'job-123',
  getState: jest.fn().mockResolvedValue('completed'),
  progress: 100,
  data: {},
  returnvalue: { jobId: 'job-123', status: 'completed' },
  failedReason: null,
  remove: jest.fn().mockResolvedValue(true),
});

// Factory functions to avoid hoisting issues
const createMockGetJob = () => jest.fn().mockResolvedValue(createMockJob());
const createMockAdd = () => jest.fn().mockResolvedValue({ id: 'job-123' });

// We'll use a module-level holder for the mock functions
let mockGetJobHolder: { fn: jest.Mock } = { fn: createMockGetJob() };
let mockAddHolder: { fn: jest.Mock } = { fn: createMockAdd() };

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: (...args: any[]) => mockAddHolder.fn(...args),
    getJob: (...args: any[]) => mockGetJobHolder.fn(...args),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
  })),
}));

const mockFormat: VideoFormat = {
  formatId: 'best',
  ext: 'mp4',
  hasVideo: true,
  hasAudio: true,
  playable: true,
  downloadable: true,
};

describe('JobQueue', () => {
  let jobQueue: JobQueue;

  beforeEach(() => {
    jobQueue = new JobQueue();
    getJobStore().clear();
    jest.clearAllMocks();
    // Reset mock functions
    mockGetJobHolder.fn = createMockGetJob();
    mockAddHolder.fn = createMockAdd();
  });

  describe('addDownloadJob', () => {
    it('should add a download job and return job ID', async () => {
      const jobData: JobData = {
        jobId: 'job-123',
        url: 'https://example.com/video',
        formatId: 'best',
        providerId: 'ytdlp',
        outputPath: '/tmp/output.mp4',
        format: mockFormat,
      };

      const jobId = await jobQueue.addDownloadJob(jobData);
      expect(jobId).toBe('job-123');
    });
  });

  describe('getJobStatus', () => {
    it('should return job status', async () => {
      const status = await jobQueue.getJobStatus('job-123');
      expect(status).toBeDefined();
      expect(status?.id).toBe('job-123');
      expect(status?.state).toBe('completed');
    });

    it('should return null for non-existent job', async () => {
      mockGetJobHolder.fn = jest.fn().mockResolvedValueOnce(null);
      const status = await jobQueue.getJobStatus('nonexistent');
      expect(status).toBeNull();
    });
  });

  describe('cancelJob', () => {
    it('should cancel a job and return true', async () => {
      const result = await jobQueue.cancelJob('job-123');
      expect(result).toBe(true);
    });

    it('should return false for non-existent job', async () => {
      mockGetJobHolder.fn = jest.fn().mockResolvedValueOnce(null);
      const result = await jobQueue.cancelJob('nonexistent');
      expect(result).toBe(false);
    });
  });
});

describe('Job Store', () => {
  beforeEach(() => {
    getJobStore().clear();
  });

  describe('updateJobStatus', () => {
    it('should create new job entry if not exists', () => {
      updateJobStatus('job-1', 'processing', 50, 'Downloading...');
      const job = getJobStore().get('job-1');
      expect(job).toBeDefined();
      expect(job.jobId).toBe('job-1');
      expect(job.status).toBe('processing');
      expect(job.progress).toBe(50);
      expect(job.message).toBe('Downloading...');
    });

    it('should update existing job entry', () => {
      updateJobStatus('job-1', 'pending', 0, 'Queued');
      updateJobStatus('job-1', 'processing', 50, 'Downloading...');
      const job = getJobStore().get('job-1');
      expect(job.status).toBe('processing');
      expect(job.progress).toBe(50);
      expect(job.message).toBe('Downloading...');
      expect(job.createdAt).toBeDefined();
    });

    it('should preserve createdAt when updating', () => {
      const createdAt = new Date('2024-01-01');
      getJobStore().set('job-1', { jobId: 'job-1', createdAt });
      updateJobStatus('job-1', 'completed', 100, 'Done');
      const job = getJobStore().get('job-1');
      expect(job.createdAt).toEqual(createdAt);
    });
  });
});