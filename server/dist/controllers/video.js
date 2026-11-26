"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.__resetJobQueueForTesting = __resetJobQueueForTesting;
exports.analyzeVideo = analyzeVideo;
exports.downloadVideo = downloadVideo;
exports.getJobStatus = getJobStatus;
exports.downloadFile = downloadFile;
exports.getProviders = getProviders;
exports.getProvider = getProvider;
exports.healthCheck = healthCheck;
const providers_1 = require("../providers");
const url_1 = require("../validators/url");
const crypto_1 = require("crypto");
const queue_1 = require("../jobs/queue");
const promises_1 = __importDefault(require("fs/promises"));
/**
 * Video controller - handles analysis and download endpoints
 */
// Lazy initialization to allow mocking in tests
let jobQueueInstance = null;
let jobsInstance = null;
function getJobQueue() {
    if (!jobQueueInstance) {
        jobQueueInstance = new queue_1.JobQueue();
    }
    return jobQueueInstance;
}
function getJobs() {
    if (!jobsInstance) {
        jobsInstance = (0, queue_1.getJobStore)();
    }
    return jobsInstance;
}
// For testing - allow resetting instances
function __resetJobQueueForTesting() {
    jobQueueInstance = null;
    jobsInstance = null;
}
/**
 * POST /api/video/analyze
 * Analyze a video URL and return metadata and available formats
 */
async function analyzeVideo(req, res) {
    try {
        // Validate request
        const validation = url_1.analysisRequestSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request',
                details: validation.error.errors,
            });
        }
        const { url } = validation.data;
        // Find provider
        const provider = providers_1.providerRegistry.findProvider(url);
        if (!provider) {
            return res.status(400).json({
                success: false,
                error: 'Unsupported URL. This website is not currently supported.',
            });
        }
        // Check provider status
        const providerInfo = provider.getProviderInfo();
        if (providerInfo.status !== 'active') {
            return res.status(503).json({
                success: false,
                error: `Provider ${providerInfo.name} is currently ${providerInfo.status}`,
            });
        }
        // Extract metadata
        const result = await provider.analyze(url);
        const response = {
            success: true,
            data: result.metadata,
        };
        return res.status(200).json(response);
    }
    catch (error) {
        console.error('Analysis error:', error);
        const message = error instanceof Error ? error.message : 'Analysis failed';
        // Sanitize error message
        let userMessage = 'Failed to analyze video. Please check the URL and try again.';
        if (message.includes('yt-dlp not found')) {
            userMessage = 'Video extraction service is not available. Please contact administrator.';
        }
        else if (message.includes('No downloadable formats')) {
            userMessage = 'No downloadable formats found. This video may be private, geo-restricted, or unsupported.';
        }
        else if (message.includes('Private') || message.includes('geo')) {
            userMessage = 'This video is private or geo-restricted and cannot be downloaded.';
        }
        else if (message.includes('age')) {
            userMessage = 'This video has age restrictions and cannot be downloaded.';
        }
        else if (message.includes('copyright') || message.includes('DRM')) {
            userMessage = 'This video is protected by copyright/DRM and cannot be downloaded.';
        }
        res.status(500).json({
            success: false,
            error: userMessage,
        });
    }
}
/**
 * POST /api/video/download
 * Start a download job for a specific format
 */
async function downloadVideo(req, res) {
    try {
        // Validate request
        const validation = url_1.downloadRequestSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request',
                details: validation.error.errors,
            });
        }
        const { url, formatId } = validation.data;
        // Find provider
        const provider = providers_1.providerRegistry.findProvider(url);
        if (!provider) {
            return res.status(400).json({
                success: false,
                error: 'Unsupported URL',
            });
        }
        // Re-analyze to get fresh metadata and validate format
        let metadata;
        try {
            const result = await provider.analyze(url);
            metadata = result.metadata;
        }
        catch {
            return res.status(400).json({
                success: false,
                error: 'Failed to retrieve video information',
            });
        }
        // Validate format
        const format = metadata.formats.find((f) => f.formatId === formatId);
        if (!format) {
            return res.status(400).json({
                success: false,
                error: 'Selected format not available',
            });
        }
        if (!format.downloadable) {
            return res.status(400).json({
                success: false,
                error: 'Selected format cannot be downloaded',
            });
        }
        // Create job
        const jobId = (0, crypto_1.randomUUID)();
        const job = {
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
        const response = {
            success: true,
            jobId,
        };
        return res.status(200).json(response);
    }
    catch (error) {
        console.error('Download error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start download',
        });
    }
}
/**
 * GET /api/video/status/:jobId
 * Get download job status
 */
async function getJobStatus(_req, res) {
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
    }
    catch (error) {
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
async function downloadFile(_req, res) {
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
            await promises_1.default.access(filePath);
            // Set headers
            res.setHeader('Content-Disposition', `attachment; filename="${job.filename || 'video'}"`);
            res.setHeader('Content-Type', 'application/octet-stream');
            // Stream file
            const fileStream = require('fs').createReadStream(filePath);
            fileStream.pipe(res);
            fileStream.on('error', (err) => {
                console.error('File stream error:', err);
                if (!res.headersSent) {
                    res.status(500).json({ success: false, error: 'Download failed' });
                }
            });
            fileStream.on('end', async () => {
                // Clean up temp file after download
                try {
                    await promises_1.default.unlink(filePath);
                    getJobs().delete(jobId);
                }
                catch {
                    // Ignore cleanup errors
                }
            });
        }
        catch {
            return res.status(404).json({
                success: false,
                error: 'File not found or expired',
            });
        }
    }
    catch (error) {
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
async function getProviders(_req, res) {
    try {
        const providers = providers_1.providerRegistry.getAllInfo();
        return res.status(200).json({
            success: true,
            data: providers,
        });
    }
    catch (error) {
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
async function getProvider(req, res) {
    try {
        const { providerId } = req.params;
        const provider = providers_1.providerRegistry.get(providerId);
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
    }
    catch (error) {
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
async function healthCheck(_req, res) {
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
        providers: providers_1.providerRegistry.size(),
        activeJobs: Array.from(getJobs().values()).filter((j) => j.status === 'processing').length,
        queuedJobs: Array.from(getJobs().values()).filter((j) => j.status === 'pending').length,
    });
}
//# sourceMappingURL=video.js.map