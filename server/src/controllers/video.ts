import { Request, Response } from 'express';
import { providerRegistry } from '../providers';
import { AnalysisResponse, DownloadResponse, JobStatus } from '../types';
import { analysisRequestSchema, downloadRequestSchema, validateSafePublicUrl } from '../validators/url';
import { randomUUID } from 'crypto';
import { JobQueue, getJobStore } from '../jobs/queue';
import fs from 'fs/promises';
import { spawn } from 'child_process';
import { config } from '../config';

/**
 * Video controller - handles analysis and download endpoints
 */

// Lazy initialization to allow mocking in tests
let jobQueueInstance: JobQueue | null = null;
let jobsInstance: Map<string, any> | null = null;

function getJobQueue(): JobQueue {
  if (!jobQueueInstance) {
    jobQueueInstance = new JobQueue();
  }
  return jobQueueInstance;
}

function getJobs(): Map<string, any> {
  if (!jobsInstance) {
    jobsInstance = getJobStore();
  }
  return jobsInstance;
}

// For testing - allow resetting instances
export function __resetJobQueueForTesting(): void {
  jobQueueInstance = null;
  jobsInstance = null;
}

/**
 * POST /api/video/analyze
 * Analyze a video URL and return metadata and available formats
 */
export async function analyzeVideo(req: Request, res: Response) {
  try {
    // Validate request
    const validation = analysisRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: validation.error.errors,
      } as AnalysisResponse);
    }

    const { url } = validation.data;
    await validateSafePublicUrl(url);

    // Find provider
    const provider = providerRegistry.findProvider(url);
    if (!provider) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported URL. This website is not currently supported.',
      } as AnalysisResponse);
    }

    // Check provider status
    const providerInfo = provider.getProviderInfo();
    if (providerInfo.status !== 'active') {
      return res.status(503).json({
        success: false,
        error: `Provider ${providerInfo.name} is currently ${providerInfo.status}`,
      } as AnalysisResponse);
    }

    // Extract metadata
    const result = await provider.analyze(url);

    const response: AnalysisResponse = {
      success: true,
      data: result.metadata,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Analysis error:', error);

    const message = error instanceof Error ? error.message : 'Analysis failed';

    if (error instanceof Error && error.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: error.message } as AnalysisResponse);
    }

    // Sanitize error message
    let userMessage = 'Failed to analyze video. Please check the URL and try again.';
    if (message.includes('yt-dlp not found')) {
      userMessage = 'Video extraction service is not available. Please contact administrator.';
    } else if (message.includes('No downloadable formats')) {
      userMessage = 'No downloadable formats found. This video may be private, geo-restricted, or unsupported.';
    } else if (message.includes('Private') || message.includes('geo')) {
      userMessage = 'This video is private or geo-restricted and cannot be downloaded.';
    } else if (message.includes('age')) {
      userMessage = 'This video has age restrictions and cannot be downloaded.';
    } else if (message.includes('copyright') || message.includes('DRM')) {
      userMessage = 'This video is protected by copyright/DRM and cannot be downloaded.';
    }

    res.status(500).json({
      success: false,
      error: userMessage,
    } as AnalysisResponse);
  }
}

/**
 * POST /api/video/download
 * Start a download job for a specific format
 */
export async function downloadVideo(req: Request, res: Response) {
  try {
    // Validate request
    const validation = downloadRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: validation.error.errors,
      } as DownloadResponse);
    }

    const { url, formatId } = validation.data;

    await validateSafePublicUrl(url);

    // Find provider
    const provider = providerRegistry.findProvider(url);
    if (!provider) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported URL',
      } as DownloadResponse);
    }

    // Re-analyze to get fresh metadata and validate format
    let metadata;
    try {
      const result = await provider.analyze(url);
      metadata = result.metadata;
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Failed to retrieve video information',
      } as DownloadResponse);
    }

    // Validate format
    const format = metadata.formats.find((f) => f.formatId === formatId);
    if (!format) {
      return res.status(400).json({
        success: false,
        error: 'Selected format not available',
      } as DownloadResponse);
    }

    if (!format.downloadable) {
      return res.status(400).json({
        success: false,
        error: 'Selected format cannot be downloaded',
      } as DownloadResponse);
    }

    // Create job
    const jobId = randomUUID();
    const job: JobStatus = {
      jobId,
      status: 'pending',
      progress: 0,
      message: 'Queued for download',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    getJobs().set(jobId, job);

    // Add to job queue
    await getJobQueue().addDownloadJob({
      jobId,
      url,
      formatId,
      providerId: provider.id,
      outputPath: '', // Will be generated in worker
      format,
    });

    const response: DownloadResponse = {
      success: true,
      jobId,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Download error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to start download',
    } as DownloadResponse);
  }
}

/**
 * GET /api/video/status/:jobId
 * Get download job status
 */
export async function getJobStatus(_req: Request, res: Response) {
  try {
    const { jobId } = _req.params;

    const job = getJobs().get(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get job status',
    });
  }
}

/**
 * GET /api/video/download/:jobId
 * Download the completed file
 */
export async function downloadFile(_req: Request, res: Response) {
  try {
    const { jobId } = _req.params;

    const job = getJobs().get(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    if (job.status !== 'completed' || !job.downloadUrl) {
      return res.status(400).json({
        success: false,
        error: 'Download not ready',
      });
    }

    // For security, we serve files through the backend
    // In production, use signed URLs or a separate file server
    const filePath = job.downloadUrl;

    try {
      await fs.access(filePath);

      // Set headers
      res.setHeader('Content-Disposition', `attachment; filename="${job.filename || 'video'}"`);
      res.setHeader('Content-Type', 'application/octet-stream');

      // Stream file
      const fileStream = require('fs').createReadStream(filePath);
      fileStream.pipe(res);

      fileStream.on('error', (err: Error) => {
        console.error('File stream error:', err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, error: 'Download failed' });
        }
      });

      fileStream.on('end', async () => {
        // Clean up temp file after download
        try {
          const stat = await fs.stat(filePath);
          const isPreview = _req.query.preview === 'true';
          const contentType = job.mimeType || 'application/octet-stream';

          res.setHeader('Content-Type', contentType);
          res.setHeader('Accept-Ranges', 'bytes');

          if (!isPreview) {
            res.setHeader(
              'Content-Disposition',
              `attachment; filename="${encodeURIComponent(job.filename || 'video')}"`
            );
          }

          const range = _req.headers.range;
          if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
            const chunkSize = end - start + 1;

            res.status(206);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
            res.setHeader('Content-Length', chunkSize);

            const stream = require('fs').createReadStream(filePath, { start, end });
            stream.pipe(res);
          } else {
            res.setHeader('Content-Length', stat.size);
            const stream = require('fs').createReadStream(filePath);
            stream.pipe(res);
          }
        } catch {
          return res.status(404).json({
            success: false,
            error: 'File not found or expired',
          });
        }
      });
    } catch {
      return res.status(404).json({
        success: false,
        error: 'File not found or expired',
      });
    }
  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({
      success: false,
      error: 'Download failed',
    });
  }
}

/**
 * GET /api/providers
 * Get all registered providers
 */
export async function getProviders(_req: Request, res: Response) {
  try {
    const providers = providerRegistry.getAllInfo();
    return res.status(200).json({
      success: true,
      data: providers,
    });
  } catch (error) {
    console.error('Providers error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get providers',
    });
  }
}

/**
 * GET /api/providers/:providerId
 * Get specific provider info
 */
export async function getProvider(req: Request, res: Response) {
  try {
    const { providerId } = req.params;
    const provider = providerRegistry.get(providerId);

    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: provider.getProviderInfo(),
    });
  } catch (error) {
    console.error('Provider error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get provider',
    });
  }
}

/**
 * GET /api/video/stream?url=...&formatId=...
 * Stream video directly (including FFmpeg live muxing for adaptive high-res formats)
 */
export async function streamVideo(req: Request, res: Response): Promise<void> {
  const url = typeof req.query.url === 'string' ? req.query.url.trim() : '';
  const formatId = typeof req.query.formatId === 'string' ? req.query.formatId.trim() : '';
  const isDownload = req.query.download === '1' || req.query.download === 'true';
  const rawTitle = typeof req.query.title === 'string' ? req.query.title.trim() : 'video';

  if (!url) {
    res.status(400).json({ success: false, error: 'Missing url parameter' });
    return;
  }

  const normalizeWinPath = (binPath: string): string => {
    if (process.platform === 'win32' && /^\/[a-zA-Z]\//.test(binPath)) {
      return `${binPath[1].toUpperCase()}:${binPath.slice(2)}`;
    }
    return binPath;
  };

  const ytdlpBin = normalizeWinPath(
    (config as any).ytdlpPath || process.env.YTDLP_PATH || 'yt-dlp'
  );
  const ffmpegBin = normalizeWinPath(
    (config as any).ffmpegPath || process.env.FFMPEG_PATH || 'ffmpeg'
  );

  const isAudioOnly = formatId.startsWith('mp3') || formatId === 'bestaudio';
  const ext = isAudioOnly ? 'mp3' : 'mp4';

  // Safe filename for browser native downloader
  const safeFilename =
    rawTitle
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120) || 'video';

  let formatSelector = 'best[ext=mp4]/best';
  if (isAudioOnly) {
    formatSelector = 'bestaudio/best';
  } else if (formatId && formatId !== 'best') {
    formatSelector = formatId.includes('+')
      ? formatId
      : `${formatId}+bestaudio[ext=m4a]/${formatId}+bestaudio/${formatId}/best`;
  }

  res.setHeader('Content-Type', isAudioOnly ? 'audio/mpeg' : 'video/mp4');
  if (isDownload) {
    const encodedName = encodeURIComponent(`${safeFilename}.${ext}`);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeFilename.replace(/[^\x20-\x7E]/g, '_')}.${ext}"; filename*=UTF-8''${encodedName}`
    );
  }
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Accept-Ranges', 'none');

  const ytdlpArgs = [
    '--no-playlist',
    '--no-warnings',
    '--no-part',
    '-f',
    formatSelector,
    ...(isAudioOnly ? [] : ['--merge-output-format', 'mkv']),
    '-o',
    '-',
    url,
  ];

  const ytdlpProc = spawn(ytdlpBin, ytdlpArgs, { windowsHide: true });

  const ffmpegArgs = isAudioOnly
    ? [
      '-loglevel',
      'error',
      '-i',
      'pipe:0',
      '-vn',
      '-c:a',
      'libmp3lame',
      '-b:a',
      '192k',
      '-f',
      'mp3',
      'pipe:1',
    ]
    : [
      '-loglevel',
      'error',
      '-i',
      'pipe:0',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '160k',
      '-movflags',
      'frag_keyframe+empty_moov+default_base_moof',
      '-f',
      'mp4',
      'pipe:1',
    ];

  const ffmpegProc = spawn(ffmpegBin, ffmpegArgs, { windowsHide: true });

  ytdlpProc.stdout.pipe(ffmpegProc.stdin);
  ffmpegProc.stdout.pipe(res);

  ytdlpProc.stderr.on('data', (chunk) => {
    const msg = chunk.toString().trim();
    if (msg) console.error('[yt-dlp stream]', msg);
  });

  ffmpegProc.stderr.on('data', (chunk) => {
    const msg = chunk.toString().trim();
    if (msg) console.error('[ffmpeg stream]', msg);
  });

  ffmpegProc.stdin.on('error', () => { });
  ytdlpProc.stdout.on('error', () => { });

  const cleanup = () => {
    try {
      if (!ytdlpProc.killed) ytdlpProc.kill('SIGKILL');
    } catch { }
    try {
      if (!ffmpegProc.killed) ffmpegProc.kill('SIGKILL');
    } catch { }
  };

  req.on('close', cleanup);
  res.on('close', cleanup);

  ytdlpProc.on('error', (err) => {
    console.error('yt-dlp stream spawn error:', err);
    cleanup();
    if (!res.headersSent) res.status(500).end();
  });

  ffmpegProc.on('error', (err) => {
    console.error('ffmpeg stream spawn error:', err);
    cleanup();
    if (!res.headersSent) res.status(500).end();
  });
}
// export async function streamVideo(req: Request, res: Response): Promise<void> {
//   const url = typeof req.query.url === 'string' ? req.query.url.trim() : '';
//   const formatId = typeof req.query.formatId === 'string' ? req.query.formatId.trim() : '';
//   const isDownload = req.query.download === '1' || req.query.download === 'true';
//   const rawTitle = typeof req.query.title === 'string' ? req.query.title.trim() : 'video';

//   if (!url) {
//     res.status(400).json({ success: false, error: 'Missing url parameter' });
//     return;
//   }

//   const normalizeWinPath = (binPath: string): string => {
//     if (process.platform === 'win32' && /^\/[a-zA-Z]\//.test(binPath)) {
//       return `${binPath[1].toUpperCase()}:${binPath.slice(2)}`;
//     }
//     return binPath;
//   };

//   const ytdlpBin = normalizeWinPath(
//     (config as any).ytdlpPath || process.env.YTDLP_PATH || 'yt-dlp'
//   );
//   const ffmpegBin = normalizeWinPath(
//     (config as any).ffmpegPath || process.env.FFMPEG_PATH || 'ffmpeg'
//   );

//   const isAudioOnly = formatId.startsWith('mp3') || formatId === 'bestaudio';
//   const ext = isAudioOnly ? 'mp3' : 'mp4';

//   const safeFilename =
//     rawTitle
//       .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
//       .replace(/\s+/g, ' ')
//       .trim()
//       .slice(0, 120) || 'video';

//   // Prefer M4A (native AAC) for audio so FFmpeg can copy audio without slow re-encoding
//   let formatSelector = 'best[ext=mp4]/best';
//   if (isAudioOnly) {
//     formatSelector = 'bestaudio[ext=m4a]/bestaudio/best';
//   } else if (formatId && formatId !== 'best') {
//     formatSelector = formatId.includes('+')
//       ? formatId
//       : `${formatId}+bestaudio[ext=m4a]/${formatId}+bestaudio/${formatId}/best`;
//   }

//   res.setHeader('Content-Type', isAudioOnly ? 'audio/mpeg' : 'video/mp4');
//   if (isDownload) {
//     const encodedName = encodeURIComponent(`${safeFilename}.${ext}`);
//     res.setHeader(
//       'Content-Disposition',
//       `attachment; filename="${safeFilename.replace(/[^\x20-\x7E]/g, '_')}.${ext}"; filename*=UTF-8''${encodedName}`
//     );
//   }
//   res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

//   // High-speed parallel fragment & chunked HTTP arguments for yt-dlp
//   const ytdlpArgs = [
//     '--no-playlist',
//     '--no-warnings',
//     '--no-part',
//     '--concurrent-fragments',
//     '12',
//     '--http-chunk-size',
//     '10M',
//     '--buffer-size',
//     '1M',
//     '--retries',
//     '3',
//     '--fragment-retries',
//     '3',
//     '-f',
//     formatSelector,
//     ...(isAudioOnly ? [] : ['--merge-output-format', 'mkv']),
//     '-o',
//     '-',
//     url,
//   ];

//   const ytdlpProc = spawn(ytdlpBin, ytdlpArgs, {
//     windowsHide: true,
//     stdio: ['ignore', 'pipe', 'pipe'],
//   });

//   // Zero-reencode stream copy when possible for maximum throughput
//   const ffmpegArgs = isAudioOnly
//     ? [
//       '-loglevel',
//       'error',
//       '-i',
//       'pipe:0',
//       '-vn',
//       '-c:a',
//       'libmp3lame',
//       '-q:a',
//       '2',
//       '-f',
//       'mp3',
//       'pipe:1',
//     ]
//     : [
//       '-loglevel',
//       'error',
//       '-thread_queue_size',
//       '1024',
//       '-i',
//       'pipe:0',
//       '-c:v',
//       'copy',
//       '-c:a',
//       'aac',
//       '-b:a',
//       '128k',
//       '-movflags',
//       'frag_keyframe+empty_moov+default_base_moof',
//       '-f',
//       'mp4',
//       'pipe:1',
//     ];

//   const ffmpegProc = spawn(ffmpegBin, ffmpegArgs, {
//     windowsHide: true,
//     stdio: ['pipe', 'pipe', 'pipe'],
//   });

//   ytdlpProc.stdout.pipe(ffmpegProc.stdin);
//   ffmpegProc.stdout.pipe(res);

//   ytdlpProc.stderr.on('data', (chunk) => {
//     const msg = chunk.toString().trim();
//     if (msg && msg.includes('ERROR:')) console.error('[yt-dlp stream]', msg);
//   });

//   ffmpegProc.stderr.on('data', (chunk) => {
//     const msg = chunk.toString().trim();
//     if (msg) console.error('[ffmpeg stream]', msg);
//   });

//   ffmpegProc.stdin.on('error', () => { });
//   ytdlpProc.stdout.on('error', () => { });

//   const cleanup = () => {
//     try {
//       if (!ytdlpProc.killed) ytdlpProc.kill('SIGKILL');
//     } catch { }
//     try {
//       if (!ffmpegProc.killed) ffmpegProc.kill('SIGKILL');
//     } catch { }
//   };

//   req.on('close', cleanup);
//   res.on('close', cleanup);

//   ytdlpProc.on('error', (err) => {
//     console.error('yt-dlp stream spawn error:', err);
//     cleanup();
//     if (!res.headersSent) res.status(500).end();
//   });

//   ffmpegProc.on('error', (err) => {
//     console.error('ffmpeg stream spawn error:', err);
//     cleanup();
//     if (!res.headersSent) res.status(500).end();
//   });
// }

/**
 * GET /api/health
 * Health check endpoint
 */
export async function healthCheck(_req: Request, res: Response) {
  const memUsage = process.memoryUsage();

  return res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
    },
    providers: providerRegistry.size(),
    activeJobs: Array.from(getJobs().values()).filter((j) => j.status === 'processing').length,
    queuedJobs: Array.from(getJobs().values()).filter((j) => j.status === 'pending').length,
  });
}