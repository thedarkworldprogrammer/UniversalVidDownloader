import express from 'express';
import { config } from './config';
import { initializeProviders } from './providers';
import videoRoutes from './routes/video';
import { errorHandler } from './middleware';
import { startCleanupJob } from './jobs/cleanup';
import cors from 'cors';

/**
 * Main application entry point
 */
const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    exposedHeaders: ['Content-Disposition'],
  })
);

// Start cleanup job
startCleanupJob();

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Initialize providers
initializeProviders();

// API routes
app.use('/api', videoRoutes);

// 404 handler for unknown routes
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: 'The requested endpoint does not exist',
  });
});

// Global error handler
app.use(errorHandler);

/**
 * Start server
 */
function startServer(): void {
  const host = process.env.HOST || '0.0.0.0';
  app.listen(config.port, host, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  Universal Video Downloader Server                               ║
╠══════════════════════════════════════════════════════════════════╣
║  Server running on http://${host}:${config.port}                           ║
║  Environment: ${config.nodeEnv}                                        ║
║  API Base: http://${host}:${config.port}/api                               ║
╚══════════════════════════════════════════════════════════════════╝
    `);
  });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// Start the server
startServer();

export { app };