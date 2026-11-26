import { Request, Response } from 'express';
import { providerRegistry } from '../providers';
import { AnalysisResponse, DownloadResponse, JobStatus } from '../types';
import { analysisRequestSchema, downloadRequestSchema } from '../validators/url';
import { randomUUID } from 'crypto';
import { JobQueue, getJobStore } from '../jobs/queue';
import fs from 'fs/promises';

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
          await fs.unlink(filePath);
          getJobs().delete(jobId);
        } catch {
          // Ignore cleanup errors
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