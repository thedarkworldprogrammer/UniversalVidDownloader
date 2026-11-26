import dotenv from 'dotenv';
import path from 'path';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/universal-downloader',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '2147483648', 10), // 2GB
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '120000', 10), // 2 minutes
  maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '5', 10),
  tempDir: process.env.TEMP_DIR || path.join(process.cwd(), 'tmp', 'universal-downloader'),
  ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
  ffprobePath: process.env.FFPROBE_PATH || 'ffprobe',
  ytdlpPath: process.env.YTDLP_PATH || 'yt-dlp',

  // Rate limiting
  analyzeRateLimit: {
    windowMs: 60000, // 1 minute
    max: 10, // 10 requests per minute
  },
  downloadRateLimit: {
    windowMs: 60000, // 1 minute
    max: 5, // 5 downloads per minute
  },

  // Security
  allowedDomains: process.env.ALLOWED_DOMAINS ? process.env.ALLOWED_DOMAINS.split(',') : [],
  blockedDomains: process.env.BLOCKED_DOMAINS ? process.env.BLOCKED_DOMAINS.split(',') : [],

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
};