import { Request, Response } from 'express';
export declare function __resetJobQueueForTesting(): void;
/**
 * POST /api/video/analyze
 * Analyze a video URL and return metadata and available formats
 */
export declare function analyzeVideo(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * POST /api/video/download
 * Start a download job for a specific format
 */
export declare function downloadVideo(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/video/status/:jobId
 * Get download job status
 */
export declare function getJobStatus(_req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/video/download/:jobId
 * Download the completed file
 */
export declare function downloadFile(_req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/providers
 * Get all registered providers
 */
export declare function getProviders(_req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/providers/:providerId
 * Get specific provider info
 */
export declare function getProvider(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/health
 * Health check endpoint
 */
export declare function healthCheck(_req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=video.d.ts.map