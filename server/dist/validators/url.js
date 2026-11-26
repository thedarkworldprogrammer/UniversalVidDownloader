"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadRequestSchema = exports.analysisRequestSchema = exports.ValidationError = void 0;
exports.isValidUrl = isValidUrl;
exports.sanitizeFilename = sanitizeFilename;
exports.extractDomain = extractDomain;
exports.isKnownVideoPlatform = isKnownVideoPlatform;
exports.validateUrl = validateUrl;
exports.sanitizeUrl = sanitizeUrl;
const zod_1 = require("zod");
const config_1 = require("../config");
/**
 * Custom validation error class
 */
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
/**
 * URL validation schemas
 */
// Analysis request validation
exports.analysisRequestSchema = zod_1.z.object({
    url: zod_1.z.string()
        .min(1, 'URL is required')
        .max(2048, 'URL too long')
        .url('Invalid URL format')
        .refine(isValidUrl, 'Invalid or unsupported URL'),
});
// Download request validation
exports.downloadRequestSchema = zod_1.z.object({
    url: zod_1.z.string()
        .min(1, 'URL is required')
        .max(2048, 'URL too long')
        .url('Invalid URL format')
        .refine(isValidUrl, 'Invalid or unsupported URL'),
    formatId: zod_1.z.string().min(1, 'Format ID is required'),
});
/**
 * URL validation functions
 */
const PRIVATE_IP_RANGES = [
    /^10\./,
    /^127\./,
    /^169\.254\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^::1$/,
    /^fc00:/i,
    /^fe80:/i,
    // Reserved/multicast/broadcast ranges
    /^0\./,
    /^22[4-9]\./,
    /^23[0-9]\./,
    /^24[0-9]\./,
    /^25[0-5]\./,
    /^255\.255\.255\.255$/,
];
const BLOCKED_TLDS = ['local', 'internal', 'corp', 'home', 'lan', 'test', 'localhost'];
function isValidUrl(url) {
    try {
        const parsed = new URL(url);
        // Only allow HTTP/HTTPS
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return false;
        }
        // Block localhost and private IPs
        const hostname = parsed.hostname.toLowerCase();
        if (hostname === 'localhost' ||
            hostname === '0.0.0.0' ||
            hostname === '[::1]' ||
            PRIVATE_IP_RANGES.some((regex) => regex.test(hostname))) {
            return false;
        }
        // Block local TLDs
        const tld = hostname.split('.').pop() || '';
        if (BLOCKED_TLDS.includes(tld)) {
            return false;
        }
        // Reject hostnames that are just a TLD (e.g., ".com", ".org") or empty
        const parts = hostname.split('.');
        if (parts.length < 2 || parts.some(p => p.length === 0)) {
            return false;
        }
        // Check blocked domains from config
        if (config_1.config.blockedDomains.length > 0) {
            const isBlocked = config_1.config.blockedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
            if (isBlocked) {
                return false;
            }
        }
        // If allowed domains are configured, only allow those
        if (config_1.config.allowedDomains.length > 0) {
            const isAllowed = config_1.config.allowedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
            if (!isAllowed) {
                return false;
            }
        }
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Sanitize filename for safe download
 */
function sanitizeFilename(filename) {
    return filename
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_') // Replace invalid chars
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
        .substring(0, 255); // Limit length
}
/**
 * Extract domain from URL
 */
function extractDomain(url) {
    try {
        const parsed = new URL(url);
        return parsed.hostname.toLowerCase().replace(/^www\./, '');
    }
    catch {
        return null;
    }
}
/**
 * Check if URL is from a known video platform
 */
function isKnownVideoPlatform(url) {
    const knownDomains = [
        'youtube.com',
        'youtu.be',
        'vimeo.com',
        'dailymotion.com',
        'twitch.tv',
        'twitter.com',
        'x.com',
        'instagram.com',
        'facebook.com',
        'fb.watch',
        'tiktok.com',
        'reddit.com',
        'soundcloud.com',
        'bandcamp.com',
        'streamable.com',
        'archive.org',
    ];
    const domain = extractDomain(url);
    return domain ? knownDomains.some((d) => domain === d || domain.endsWith(`.${d}`)) : false;
}
/**
 * Validate URL and throw ValidationError if invalid
 */
function validateUrl(url) {
    if (!isValidUrl(url)) {
        throw new ValidationError('Invalid or unsupported URL');
    }
}
/**
 * Sanitize URL by trimming whitespace and removing fragments
 */
function sanitizeUrl(url) {
    return url.trim().split('#')[0];
}
//# sourceMappingURL=url.js.map