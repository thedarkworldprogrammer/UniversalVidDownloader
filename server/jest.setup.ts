// Set test environment
process.env.NODE_ENV = 'test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.TEMP_DIR = '/tmp/test';
process.env.PORT = '3001';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100';
process.env.ANALYZE_RATE_LIMIT_MAX = '10';
process.env.DOWNLOAD_RATE_LIMIT_MAX = '5';
process.env.MAX_CONCURRENT_JOBS = '2';
process.env.REQUEST_TIMEOUT = '30000';
process.env.JOB_CLEANUP_INTERVAL_MS = '3600000';
process.env.JOB_MAX_AGE_MS = '86400000';
process.env.LOG_LEVEL = 'error';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};