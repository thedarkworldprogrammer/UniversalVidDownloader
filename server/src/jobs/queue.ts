import { Queue, Worker, Job } from 'bullmq';
import { config } from '../config';
import { providerRegistry } from '../providers';
import { JobData, VideoFormat } from '../types';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';

// Configure FFmpeg paths
ffmpeg.setFfmpegPath(config.ffmpegPath);
ffmpeg.setFfprobePath(config.ffprobePath);

// In-memory job store (shared with controller)
const jobStore = new Map<string, any>();

export function getJobStore() {
  return jobStore;
}

// Job queue for downloads
const downloadQueue = new Queue('downloads', {
  connection: {
    host: new URL(config.redisUrl).hostname,
    port: parseInt(new URL(config.redisUrl).port || '6379', 10),
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

/**
 * Job queue manager
 */
export class JobQueue {
  async addDownloadJob(data: JobData): Promise<string> {
    const job = await downloadQueue.add('download', data);
    return job.id || '';
  }

  async getJobStatus(jobId: string): Promise<any> {
    const job = await downloadQueue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    return {
      id: job.id,
      state,
      progress: job.progress,
      data: job.data,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = await downloadQueue.getJob(jobId);
    if (!job) return false;

    await job.remove();
    return true;
  }
}

/**
 * Download worker - processes download jobs
 */
const downloadWorker = new Worker(
  'downloads',
  async (job: Job<JobData>) => {
    const { jobId, url, formatId, providerId, format } = job.data;

    try {
      // Update job status
      updateJobStatus(jobId, 'processing', 10, 'Starting download...');

      const provider = providerRegistry.get(providerId);
      if (!provider) {
        throw new Error('Provider not found');
      }

      // Re-analyze to get fresh metadata
      updateJobStatus(jobId, 'processing', 20, 'Retrieving video information...');
      const result = await provider.analyze(url);
      const metadata = result.metadata;

      // Check if audio-only format requested
      const isAudioOnly = format.hasAudio && !format.hasVideo;

      // Generate output filename
      const sanitizedTitle = provider.sanitizeFilename(metadata.title);
      const ext = format.ext || (isAudioOnly ? 'mp3' : 'mp4');
      const filename = `${sanitizedTitle}.${ext}`;
      const outputPath = path.join(config.tempDir, jobId, filename);

      // Ensure temp directory exists
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      updateJobStatus(jobId, 'processing', 30, isAudioOnly ? 'Downloading video for audio extraction...' : 'Downloading video...');

      // Download using yt-dlp
      // For audio-only, we download the best video+audio format then extract audio
      const downloadFormatId = isAudioOnly ? 'bestvideo+bestaudio/best' : formatId;
      await downloadWithYtDlp(url, downloadFormatId, outputPath, jobId);

      // If audio-only format requested, convert using FFmpeg
      let finalOutputPath = outputPath;
      let finalFilename = filename;
      let finalSize = 0;

      if (isAudioOnly) {
        // Convert to audio
        const audioExt = format.ext || 'mp3';
        const audioFilename = `${sanitizedTitle}.${audioExt}`;
        const audioOutputPath = path.join(config.tempDir, jobId, audioFilename);

        await convertToAudio(outputPath, audioOutputPath, format, jobId);

        // Verify audio file exists
        await fs.access(audioOutputPath);
        const audioStats = await fs.stat(audioOutputPath);

        // Clean up original video file
        try {
          await fs.unlink(outputPath);
        } catch {
          // Ignore cleanup errors
        }

        finalOutputPath = audioOutputPath;
        finalFilename = audioFilename;
        finalSize = audioStats.size;
      } else {
        // Verify file exists
        await fs.access(outputPath);
        const stats = await fs.stat(outputPath);
        finalSize = stats.size;
      }

      updateJobStatus(jobId, 'processing', 100, 'Completed');

      // Update job with download info
      const finalJob = {
        jobId,
        status: 'completed',
        progress: 100,
        message: 'Download completed',
        downloadUrl: finalOutputPath,
        filename: finalFilename,
        filesize: finalSize,
        createdAt: jobStore.get(jobId)?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      jobStore.set(jobId, finalJob);
      return finalJob;
    } catch (error) {
      console.error(`Download job ${jobId} failed:`, error);

      const failedJob = {
        jobId,
        status: 'failed',
        progress: 0,
        message: error instanceof Error ? error.message : 'Download failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        createdAt: jobStore.get(jobId)?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      jobStore.set(jobId, failedJob);
      throw error;
    }
  },
  {
    connection: {
      host: new URL(config.redisUrl).hostname,
      port: parseInt(new URL(config.redisUrl).port || '6379', 10),
    },
    concurrency: config.maxConcurrentJobs,
  }
);

/**
 * Download video using yt-dlp via Python module
 */
function downloadWithYtDlp(
  url: string,
  formatId: string,
  outputPath: string,
  jobId: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      'yt_dlp',
      '--no-warnings',
      '-f',
      formatId,
      '-o',
      outputPath,
      '--progress',
      '--newline',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
      '--extractor-retries=3',
      '--extractor-args=youtube:player_client=web',
      url,
    ];

    const proc = spawn('python', ['-m'].concat(args), {
      timeout: config.requestTimeout,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';

    proc.stdout.on('data', (data) => {
      const output = data.toString();
      // Parse progress from yt-dlp output
      const progressMatch = output.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
      if (progressMatch) {
        const progress = Math.min(30 + Math.floor(parseFloat(progressMatch[1]) * 0.6), 85);
        updateJobStatus(jobId, 'processing', progress, 'Downloading...');
      }
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`yt-dlp failed (code ${code}): ${stderr}`));
      }
    });

    proc.on('error', (err) => {
      if (err.message.includes('ENOENT') || err.message.includes('yt_dlp')) {
        reject(new Error('yt-dlp not found. Please install yt-dlp.'));
      } else {
        reject(new Error(`Download process error: ${err.message}`));
      }
    });
  });
}

/**
 * Update job status in store
 */
export function updateJobStatus(
  jobId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled',
  progress: number,
  message: string
): void {
  const existing = jobStore.get(jobId) || {
    jobId,
    createdAt: new Date(),
  };

  const updated = {
    ...existing,
    status,
    progress,
    message,
    updatedAt: new Date(),
  };

  jobStore.set(jobId, updated);
}

// Handle worker events
downloadWorker.on('completed', (job) => {
  console.log(`Download job ${job.id} completed`);
});

downloadWorker.on('failed', (job, err) => {
  console.error(`Download job ${job?.id} failed:`, err);
});

downloadWorker.on('error', (err) => {
  console.error('Download worker error:', err);
});

/**
 * Convert video to audio using FFmpeg
 */
async function convertToAudio(
  inputPath: string,
  outputPath: string,
  format: VideoFormat,
  jobId: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const audioFormat = format.ext === 'm4a' ? 'aac' : 'libmp3lame';
    const audioBitrate = format.abr || 128;

    ffmpeg(inputPath)
      .audioCodec(audioFormat)
      .audioBitrate(audioBitrate)
      .noVideo()
      .output(outputPath)
      .on('start', () => {
        updateJobStatus(jobId, 'processing', 90, 'Converting to audio...');
      })
      .on('progress', (progress: { percent?: number }) => {
        if (progress.percent) {
          updateJobStatus(jobId, 'processing', 90 + Math.floor(progress.percent * 0.1), 'Converting...');
        }
      })
      .on('end', () => {
        resolve();
      })
      .on('error', (err: Error) => {
        reject(new Error(`Audio conversion failed: ${err.message}`));
      })
      .run();
  });
}

/**
 * Download worker - processes download jobs
 */
export { downloadQueue, downloadWorker };