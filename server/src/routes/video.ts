import { Router } from 'express';
import {
  analyzeVideo,
  downloadVideo,
  getJobStatus,
  downloadFile,
  streamVideo,
  getProviders,
  getProvider,
  healthCheck,
} from '../controllers/video';
import { analyzeRateLimiter, downloadRateLimiter } from '../middleware';

const router = Router();

/**
 * @route POST /api/video/analyze
 */
router.post('/video/analyze', analyzeRateLimiter, analyzeVideo);

/**
 * @route POST /api/video/download
 */
router.post('/video/download', downloadRateLimiter, downloadVideo);

/**
 * @route GET /api/video/status/:jobId
 */
router.get('/video/status/:jobId', getJobStatus);

/**
 * @route GET /api/video/download/:jobId
 */
router.get('/video/download/:jobId', downloadFile);

/**
 * @route GET /api/providers
 */
router.get('/providers', getProviders);

/**
 * @route GET /api/providers/:providerId
 */
router.get('/providers/:providerId', getProvider);

/**
 * @route GET /api/video/stream
 */
router.get('/video/stream', streamVideo);

/**
 * @route GET /api/health
 */
router.get('/health', healthCheck);

export default router;