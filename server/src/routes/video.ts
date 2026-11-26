import { Router } from 'express';
import {
  analyzeVideo,
  downloadVideo,
  getJobStatus,
  downloadFile,
  getProviders,
  getProvider,
  healthCheck,
} from '../controllers/video';
import { analyzeRateLimiter, downloadRateLimiter } from '../middleware';

const router = Router();

/**
 * @route POST /api/video/analyze
 * @description Analyze a video URL and return metadata and available formats
 * @access Public
 */
router.post('/analyze', analyzeRateLimiter, analyzeVideo);

/**
 * @route POST /api/video/download
 * @description Start a download job for a specific format
 * @access Public
 */
router.post('/download', downloadRateLimiter, downloadVideo);

/**
 * @route GET /api/video/status/:jobId
 * @description Get download job status
 * @access Public
 */
router.get('/status/:jobId', getJobStatus);

/**
 * @route GET /api/video/download/:jobId
 * @description Download the completed file
 * @access Public
 */
router.get('/download/:jobId', downloadFile);

/**
 * @route GET /api/providers
 * @description Get all registered providers
 * @access Public
 */
router.get('/providers', getProviders);

/**
 * @route GET /api/providers/:providerId
 * @description Get specific provider info
 * @access Public
 */
router.get('/providers/:providerId', getProvider);

/**
 * @route GET /api/health
 * @description Health check endpoint
 * @access Public
 */
router.get('/health', healthCheck);

export default router;