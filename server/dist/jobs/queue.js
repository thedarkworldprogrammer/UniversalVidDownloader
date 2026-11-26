"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadWorker = exports.downloadQueue = exports.JobQueue = void 0;
exports.getJobStore = getJobStore;
exports.updateJobStatus = updateJobStatus;
const bullmq_1 = require("bullmq");
const config_1 = require("../config");
const providers_1 = require("../providers");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
// In-memory job store (shared with controller)
const jobStore = new Map();
function getJobStore() {
    return jobStore;
}
// Job queue for downloads
const downloadQueue = new bullmq_1.Queue('downloads', {
    connection: {
        host: new URL(config_1.config.redisUrl).hostname,
        port: parseInt(new URL(config_1.config.redisUrl).port || '6379', 10),
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
exports.downloadQueue = downloadQueue;
/**
 * Job queue manager
 */
class JobQueue {
    async addDownloadJob(data) {
        const job = await downloadQueue.add('download', data);
        return job.id || '';
    }
    async getJobStatus(jobId) {
        const job = await downloadQueue.getJob(jobId);
        if (!job)
            return null;
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
    async cancelJob(jobId) {
        const job = await downloadQueue.getJob(jobId);
        if (!job)
            return false;
        await job.remove();
        return true;
    }
}
exports.JobQueue = JobQueue;
/**
 * Download worker - processes download jobs
 */
const downloadWorker = new bullmq_1.Worker('downloads', async (job) => {
    const { jobId, url, formatId, providerId, format } = job.data;
    try {
        // Update job status
        updateJobStatus(jobId, 'processing', 10, 'Starting download...');
        const provider = providers_1.providerRegistry.get(providerId);
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
        const outputPath = path_1.default.join(config_1.config.tempDir, jobId, filename);
        // Ensure temp directory exists
        await promises_1.default.mkdir(path_1.default.dirname(outputPath), { recursive: true });
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
            const audioOutputPath = path_1.default.join(config_1.config.tempDir, jobId, audioFilename);
            await convertToAudio(outputPath, audioOutputPath, format, jobId);
            // Verify audio file exists
            await promises_1.default.access(audioOutputPath);
            const audioStats = await promises_1.default.stat(audioOutputPath);
            // Clean up original video file
            try {
                await promises_1.default.unlink(outputPath);
            }
            catch {
                // Ignore cleanup errors
            }
            finalOutputPath = audioOutputPath;
            finalFilename = audioFilename;
            finalSize = audioStats.size;
        }
        else {
            // Verify file exists
            await promises_1.default.access(outputPath);
            const stats = await promises_1.default.stat(outputPath);
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
    }
    catch (error) {
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
}, {
    connection: {
        host: new URL(config_1.config.redisUrl).hostname,
        port: parseInt(new URL(config_1.config.redisUrl).port || '6379', 10),
    },
    concurrency: config_1.config.maxConcurrentJobs,
});
exports.downloadWorker = downloadWorker;
/**
 * Download video using yt-dlp
 */
function downloadWithYtDlp(url, formatId, outputPath, jobId) {
    return new Promise((resolve, reject) => {
        const args = [
            '--no-warnings',
            '-f',
            formatId,
            '-o',
            outputPath,
            '--progress',
            '--newline',
            url,
        ];
        const proc = (0, child_process_1.spawn)('yt-dlp', args, {
            timeout: config_1.config.requestTimeout,
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
            }
            else {
                reject(new Error(`yt-dlp failed (code ${code}): ${stderr}`));
            }
        });
        proc.on('error', (err) => {
            if (err.message.includes('ENOENT')) {
                reject(new Error('yt-dlp not found. Please install yt-dlp.'));
            }
            else {
                reject(new Error(`Download process error: ${err.message}`));
            }
        });
    });
}
/**
 * Update job status in store
 */
function updateJobStatus(jobId, status, progress, message) {
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
async function convertToAudio(inputPath, outputPath, format, jobId) {
    return new Promise((resolve, reject) => {
        const audioFormat = format.ext === 'm4a' ? 'aac' : 'libmp3lame';
        const audioBitrate = format.abr || 128;
        (0, fluent_ffmpeg_1.default)(inputPath)
            .audioCodec(audioFormat)
            .audioBitrate(audioBitrate)
            .noVideo()
            .output(outputPath)
            .on('start', () => {
            updateJobStatus(jobId, 'processing', 90, 'Converting to audio...');
        })
            .on('progress', (progress) => {
            if (progress.percent) {
                updateJobStatus(jobId, 'processing', 90 + Math.floor(progress.percent * 0.1), 'Converting...');
            }
        })
            .on('end', () => {
            resolve();
        })
            .on('error', (err) => {
            reject(new Error(`Audio conversion failed: ${err.message}`));
        })
            .run();
    });
}
//# sourceMappingURL=queue.js.map