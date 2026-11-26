import { z } from 'zod';
/**
 * Custom validation error class
 */
export declare class ValidationError extends Error {
    constructor(message: string);
}
/**
 * URL validation schemas
 */
export declare const analysisRequestSchema: z.ZodObject<{
    url: z.ZodEffects<z.ZodString, string, string>;
}, "strip", z.ZodTypeAny, {
    url: string;
}, {
    url: string;
}>;
export type AnalysisRequest = z.infer<typeof analysisRequestSchema>;
export declare const downloadRequestSchema: z.ZodObject<{
    url: z.ZodEffects<z.ZodString, string, string>;
    formatId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    url: string;
    formatId: string;
}, {
    url: string;
    formatId: string;
}>;
export type DownloadRequest = z.infer<typeof downloadRequestSchema>;
export declare function isValidUrl(url: string): boolean;
/**
 * Sanitize filename for safe download
 */
export declare function sanitizeFilename(filename: string): string;
/**
 * Extract domain from URL
 */
export declare function extractDomain(url: string): string | null;
/**
 * Check if URL is from a known video platform
 */
export declare function isKnownVideoPlatform(url: string): boolean;
/**
 * Validate URL and throw ValidationError if invalid
 */
export declare function validateUrl(url: string): void;
/**
 * Sanitize URL by trimming whitespace and removing fragments
 */
export declare function sanitizeUrl(url: string): string;
//# sourceMappingURL=url.d.ts.map