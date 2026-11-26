"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const video_1 = require("../controllers/video");
const middleware_1 = require("../middleware");
const router = (0, express_1.Router)();
/**
 * @route POST /api/video/analyze
 * @description Analyze a video URL and return metadata and available formats
 * @access Public
 */
router.post('/analyze', middleware_1.analyzeRateLimiter, video_1.analyzeVideo);
/**
 * @route POST /api/video/download
 * @description Start a download job for a specific format
 * @access Public
 */
router.post('/download', middleware_1.downloadRateLimiter, video_1.downloadVideo);
/**
 * @route GET /api/video/status/:jobId
 * @description Get download job status
 * @access Public
 */
router.get('/status/:jobId', video_1.getJobStatus);
/**
 * @route GET /api/video/download/:jobId
 * @description Download the completed file
 * @access Public
 */
router.get('/download/:jobId', video_1.downloadFile);
/**
 * @route GET /api/providers
 * @description Get all registered providers
 * @access Public
 */
router.get('/providers', video_1.getProviders);
/**
 * @route GET /api/providers/:providerId
 * @description Get specific provider info
 * @access Public
 */
router.get('/providers/:providerId', video_1.getProvider);
/**
 * @route GET /api/health
 * @description Health check endpoint
 * @access Public
 */
router.get('/health', video_1.healthCheck);
exports.default = router;
//# sourceMappingURL=video.js.map