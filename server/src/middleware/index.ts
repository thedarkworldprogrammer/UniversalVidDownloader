import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import helmet from 'helmet';
import cors from 'cors';

// Security headers
export const securityHeaders = helmet({
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
export const corsMiddleware = cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
});

// Rate limiters
const analyzeLimiter = new RateLimiterMemory({
  points: config.analyzeRateLimit.max,
  duration: config.analyzeRateLimit.windowMs / 1000,
});

const downloadLimiter = new RateLimiterMemory({
  points: config.downloadRateLimit.max,
  duration: config.downloadRateLimit.windowMs / 1000,
});

export const analyzeRateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = req.ip || 'unknown';
    await analyzeLimiter.consume(key);
    next();
  } catch (rejRes) {
    const retrySecs = Math.round((rejRes as any).msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(retrySecs));
    res.status(429).json({
      success: false,
      error: 'Too many analysis requests. Please wait before trying again.',
      retryAfter: retrySecs,
    });
  }
};

export const downloadRateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = req.ip || 'unknown';
    await downloadLimiter.consume(key);
    next();
  } catch (rejRes) {
    const retrySecs = Math.round((rejRes as any).msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(retrySecs));
    res.status(429).json({
      success: false,
      error: 'Too many download requests. Please wait before trying again.',
      retryAfter: retrySecs,
    });
  }
};

// Request validation
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
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

// Error handler
export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid request data',
      details: (err as any).errors,
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
    error: config.nodeEnv === 'development' ? err.message : 'Internal server error',
  });
};

// Async wrapper
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};