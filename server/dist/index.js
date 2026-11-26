"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const config_1 = require("./config");
const providers_1 = require("./providers");
const video_1 = __importDefault(require("./routes/video"));
const middleware_1 = require("./middleware");
const cleanup_1 = require("./jobs/cleanup");
/**
 * Main application entry point
 */
const app = (0, express_1.default)();
exports.app = app;
// Start cleanup job
(0, cleanup_1.startCleanupJob)();
// Body parsing
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '1mb' }));
// Initialize providers
(0, providers_1.initializeProviders)();
// API routes
app.use('/api', video_1.default);
// 404 handler for unknown routes
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'The requested endpoint does not exist',
    });
});
// Global error handler
app.use(middleware_1.errorHandler);
/**
 * Start server
 */
function startServer() {
    const host = process.env.HOST || '0.0.0.0';
    app.listen(config_1.config.port, host, () => {
        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  Universal Video Downloader Server                              ║
╠══════════════════════════════════════════════════════════════════╣
║  Server running on http://${host}:${config_1.config.port}                          ║
║  Environment: ${config_1.config.nodeEnv}                                       ║
║  API Base: http://${host}:${config_1.config.port}/api                                      ║
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
//# sourceMappingURL=index.js.map