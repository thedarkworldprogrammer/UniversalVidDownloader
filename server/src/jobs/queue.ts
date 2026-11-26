import { Queue, Worker, Job } from 'bullmq';
import { config } from '../config';
import { providerRegistry } from '../providers';
import { JobData, VideoFormat } from '../types';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
// @ts-ignore
import ffmpeg from 'fluent-ffmpeg';

ffmpeg.setFfmpegPath(config.ffmpegPath);
ffmpeg.setFfprobePath(config.ffprobePath);

const jobStore = new Map<string, any>();

export function getJobStore() {
  return jobStore;
}

const downloadQueue = new Queue('downloads', {
  connection: {
    host: new URL(config.redisUrl).hostname,
    port: parseInt(new URL(config.redisUrl).port || '6379', 10),
  },
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

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

const downloadWorker = new Worker(
  'downloads',
  async (job: Job<JobData>) => {
    const { jobId, url, formatId, providerId, format } = job.data;

    try {
      updateJobStatus(jobId, 'processing', 10, 'Starting download...');

      const provider = providerRegistry.get(providerId);
      if (!provider) {
        throw new Error('Provider not found');
      }

      updateJobStatus(jobId, 'processing', 20, 'Retrieving video information...');
      const result = await provider.analyze(url);
      const metadata = result.metadata;

      const isAudioOnly = format.hasAudio && !format.hasVideo;
      const isMp3Conversion = isAudioOnly && format.ext === 'mp3';

      const sanitizedTitle = provider.sanitizeFilename(metadata.title);
      const targetExt = format.ext || (isAudioOnly ? 'mp3' : 'mp4');
      const jobDir = path.join(config.tempDir, jobId);
      await fs.mkdir(jobDir, { recursive: true });

      const rawOutputPath = path.join(
        jobDir,
        isMp3Conversion ? `${sanitizedTitle}_source.%(ext)s` : `${sanitizedTitle}.${targetExt}`
      );

      updateJobStatus(
        jobId,
        'processing',
        30,
        isAudioOnly ? 'Downloading audio stream...' : 'Downloading video...'
      );

      const downloadFormatId = isMp3Conversion ? 'bestaudio[ext=m4a]/bestaudio/best' : formatId;
      await downloadWithYtDlp(url, downloadFormatId, rawOutputPath, jobId, isAudioOnly ? undefined : targetExt);

      let finalOutputPath = rawOutputPath;
      let finalFilename = `${sanitizedTitle}.${targetExt}`;
      let finalSize = 0;

      if (isMp3Conversion) {
        const files = await fs.readdir(jobDir);
        const sourceFile = files.find((f) => f.startsWith(`${sanitizedTitle}_source`));
        if (!sourceFile) {
          throw new Error('Source audio stream not found for MP3 conversion');
        }
        const sourcePath = path.join(jobDir, sourceFile);
        const audioOutputPath = path.join(jobDir, finalFilename);

        await convertToAudio(sourcePath, audioOutputPath, format, jobId);

        await fs.access(audioOutputPath);
        const audioStats = await fs.stat(audioOutputPath);

        await fs.unlink(sourcePath).catch(() => {});

        finalOutputPath = audioOutputPath;
        finalSize = audioStats.size;
      } else {
        await fs.access(rawOutputPath);
        const stats = await fs.stat(rawOutputPath);
        finalSize = stats.size;
      }

      updateJobStatus(jobId, 'processing', 100, 'Completed');

      const finalJob = {
        jobId,
        status: 'completed',
        progress: 100,
        message: 'Download completed',
        downloadUrl: finalOutputPath,
        outputPath: finalOutputPath,
        filename: finalFilename,
        filesize: finalSize,
        totalBytes: finalSize,
        mimeType: format.mimeType || (isAudioOnly ? 'audio/mpeg' : 'video/mp4'),
        playable: Boolean(format.playable) || ['mp4', 'webm', 'mp3', 'm4a', 'ogg'].includes(targetExt),
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

function downloadWithYtDlp(
  url: string,
  formatId: string,
  outputPath: string,
  jobId: string,
  mergeFormat?: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      '-m',
      'yt_dlp',
      '--no-warnings',
      '--no-playlist',
      '-f',
      formatId,
      ...(mergeFormat && formatId.includes('+') ? ['--merge-output-format', mergeFormat] : []),
      '-o',
      outputPath,
      '--progress',
      '--newline',
      '--extractor-retries=3',
      url,
    ];

    const proc = spawn('python', args, {
      timeout: config.requestTimeout,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stderr = '';

    proc.stdout.on('data', (data) => {
      const output = data.toString();
      const progressMatch = output.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
      if (progressMatch) {
        const progress = Math.min(30 + Math.floor(parseFloat(progressMatch[1]) * 0.55), 85);
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

downloadWorker.on('completed', (job) => {
  console.log(`Download job ${job.id} completed`);
});

downloadWorker.on('failed', (job, err) => {
  console.error(`Download job ${job?.id} failed:`, err);
});

downloadWorker.on('error', (err) => {
  console.error('Download worker error:', err);
});

async function convertToAudio(
  inputPath: string,
  outputPath: string,
  format: VideoFormat,
  jobId: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const audioFormat = format.ext === 'm4a' ? 'aac' : 'libmp3lame';
    const audioBitrate = format.abr || 192;

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

export { downloadQueue, downloadWorker };