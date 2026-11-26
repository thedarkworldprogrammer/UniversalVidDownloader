/**
 * Clean up old jobs from memory
 * Runs periodically to prevent memory leaks
 */
export declare function startCleanupJob(): NodeJS.Timeout;
/**
 * Manual cleanup trigger
 */
export declare function triggerCleanup(): number;
//# sourceMappingURL=cleanup.d.ts.map