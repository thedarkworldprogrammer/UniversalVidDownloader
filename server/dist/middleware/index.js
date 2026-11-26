"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.errorHandler = exports.validateRequest = exports.downloadRateLimiter = exports.analyzeRateLimiter = exports.corsMiddleware = exports.securityHeaders = void 0;
const config_1 = require("../config");
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
// Security headers
exports.securityHeaders = (0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            mediaSrc: ["'self'", 'blob:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
});
// CORS configuration
exports.corsMiddleware = (0, cors_1.default)({
    origin: config_1.config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
});
// Rate limiters
const analyzeLimiter = new rate_limiter_flexible_1.RateLimiterMemory({
    points: config_1.config.analyzeRateLimit.max,
    duration: config_1.config.analyzeRateLimit.windowMs / 1000,
});
const downloadLimiter = new rate_limiter_flexible_1.RateLimiterMemory({
    points: config_1.config.downloadRateLimit.max,
    duration: config_1.config.downloadRateLimit.windowMs / 1000,
});
const analyzeRateLimiter = async (req, res, next) => {
    try {
        const key = req.ip || 'unknown';
        await analyzeLimiter.consume(key);
        next();
    }
    catch (rejRes) {
        const retrySecs = Math.round(rejRes.msBeforeNext / 1000) || 1;
        res.set('Retry-After', String(retrySecs));
        res.status(429).json({
            success: false,
            error: 'Too many analysis requests. Please wait before trying again.',
            retryAfter: retrySecs,
        });
    }
};
exports.analyzeRateLimiter = analyzeRateLimiter;
const downloadRateLimiter = async (req, res, next) => {
    try {
        const key = req.ip || 'unknown';
        await downloadLimiter.consume(key);
        next();
    }
    catch (rejRes) {
        const retrySecs = Math.round(rejRes.msBeforeNext / 1000) || 1;
        res.set('Retry-After', String(retrySecs));
        res.status(429).json({
            success: false,
            error: 'Too many download requests. Please wait before trying again.',
            retryAfter: retrySecs,
        });
    }
};
exports.downloadRateLimiter = downloadRateLimiter;
// Request validation
const validateRequest = (req, res, next) => {
    // Check content length
    const contentLength = parseInt(req.get('content-length') || '0', 10);
    if (contentLength > 1024 * 1024) { // 1MB max for requests
        return res.status(413).json({
            success: false,
            error: 'Request payload too large',
        });
    }
    next();
};
exports.validateRequest = validateRequest;
// Error handler
const errorHandler = (err, _req, res, _next) => {
    console.error('Error:', err);
    // Zod validation errors
    if (err.name === 'ZodError') {
        return res.status(400).json({
            success: false,
            error: 'Invalid request data',
            details: err.errors,
        });
    }
    // Rate limiter errors
    if (err.name === 'RateLimiterError') {
        return res.status(429).json({
            success: false,
            error: 'Too many requests',
        });
    }
    res.status(500).json({
        success: false,
        error: config_1.config.nodeEnv === 'development' ? err.message : 'Internal server error',
    });
};
exports.errorHandler = errorHandler;
// Async wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=index.js.map