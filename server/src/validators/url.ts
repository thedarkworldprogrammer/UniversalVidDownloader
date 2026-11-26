import { z } from 'zod';
import dns from 'dns/promises';
import net from 'net';
import { config } from '../config';

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * URL validation schemas
 */

// Analysis request validation
export const analysisRequestSchema = z.object({
  url: z
    .string()
    .min(1, 'URL is required')
    .max(2048, 'URL too long')
    .url('Invalid URL format')
    .refine(isValidUrl, 'Invalid or unsupported URL'),
});

export type AnalysisRequest = z.infer<typeof analysisRequestSchema>;

// Download request validation
export const downloadRequestSchema = z.object({
  url: z
    .string()
    .min(1, 'URL is required')
    .max(2048, 'URL too long')
    .url('Invalid URL format')
    .refine(isValidUrl, 'Invalid or unsupported URL'),
  formatId: z
    .string()
    .min(1, 'Format ID is required')
    .max(64, 'Invalid format ID')
    .regex(/^[a-zA-Z0-9._+-]+$/, 'Format ID contains invalid characters'),
});

export type DownloadRequest = z.infer<typeof downloadRequestSchema>;

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
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i,
  // Reserved/multicast/broadcast ranges
  /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // Carrier-grade NAT
  /^22[4-9]\./,
  /^23[0-9]\./,
  /^24[0-9]\./,
  /^25[0-5]\./,
  /^255\.255\.255\.255$/,
];

const BLOCKED_TLDS = ['local', 'internal', 'corp', 'home', 'lan', 'test', 'localhost'];

export function isPrivateIpAddress(ip: string): boolean {
  const normalized = ip.replace(/^\[|\]$/g, '').toLowerCase();
  if (normalized.startsWith('::ffff:')) {
    const ipv4 = normalized.slice(7);
    return PRIVATE_IP_RANGES.some((regex) => regex.test(ipv4));
  }
  return PRIVATE_IP_RANGES.some((regex) => regex.test(normalized));
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    // Block localhost and private IPs
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '0.0.0.0' ||
      hostname === '[::1]' ||
      isPrivateIpAddress(hostname)
    ) {
      return false;
    }

    // Block local TLDs
    const tld = hostname.split('.').pop() || '';
    if (BLOCKED_TLDS.includes(tld)) {
      return false;
    }

    // Reject hostnames that are just a TLD (e.g., ".com", ".org") or empty
    const parts = hostname.split('.');
    if (parts.length < 2 || parts.some((p) => p.length === 0)) {
      return false;
    }

    // Check blocked domains from config
    if (config.blockedDomains.length > 0) {
      const isBlocked = config.blockedDomains.some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
      );
      if (isBlocked) {
        return false;
      }
    }

    // If allowed domains are configured, only allow those
    if (config.allowedDomains.length > 0) {
      const isAllowed = config.allowedDomains.some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
      );
      if (!isAllowed) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Async DNS-rebinding & SSRF guard for outbound requests
 */
export async function validateSafePublicUrl(url: string): Promise<URL> {
  if (!isValidUrl(url)) {
    throw new ValidationError('Invalid or unsupported URL');
  }

  const parsed = new URL(url);
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');

  if (net.isIP(hostname)) {
    if (isPrivateIpAddress(hostname)) {
      throw new ValidationError('Private or reserved IP addresses are blocked');
    }
    return parsed;
  }

  const records = await dns.lookup(hostname, { all: true }).catch(() => {
    throw new ValidationError('Unable to resolve target domain');
  });

  if (!records || records.length === 0) {
    throw new ValidationError('Domain has no valid DNS records');
  }

  for (const record of records) {
    if (isPrivateIpAddress(record.address)) {
      throw new ValidationError('Domain resolves to a private or restricted IP address');
    }
  }

  return parsed;
}

/**
 * Sanitize filename for safe download
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_') // Replace invalid chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .substring(0, 255); // Limit length
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Check if URL is from a known video platform
 */
export function isKnownVideoPlatform(url: string): boolean {
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
export function validateUrl(url: string): void {
  if (!isValidUrl(url)) {
    throw new ValidationError('Invalid or unsupported URL');
  }
}

/**
 * Sanitize URL by trimming whitespace and removing fragments
 */
export function sanitizeUrl(url: string): string {
  return url.trim().split('#')[0];
}