"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCleanupJob = startCleanupJob;
exports.triggerCleanup = triggerCleanup;
const queue_1 = require("./queue");
const jobStore = (0, queue_1.getJobStore)();
/**
 * Clean up old jobs from memory
 * Runs periodically to prevent memory leaks
 */
function startCleanupJob() {
    // Run cleanup every hour
    const interval = setInterval(() => {
        cleanupJobs();
    }, 60 * 60 * 1000); // 1 hour
    return interval;
}
/**
 * Clean up completed/failed jobs older than 24 hours
 */
function cleanupJobs() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    let cleaned = 0;
    for (const [jobId, job] of jobStore.entries()) {
        const age = now - new Date(job.updatedAt || job.createdAt).getTime();
        // Remove completed or failed jobs older than maxAge
        if ((job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') &&
            age > maxAge) {
            jobStore.delete(jobId);
            cleaned++;
        }
    }
    if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} old job(s) from memory`);
    }
}
/**
 * Manual cleanup trigger
 */
function triggerCleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    let cleaned = 0;
    for (const [jobId, job] of jobStore.entries()) {
        const age = now - new Date(job.updatedAt || job.createdAt).getTime();
        if ((job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') &&
            age > maxAge) {
            jobStore.delete(jobId);
            cleaned++;
        }
    }
    return cleaned;
}
//# sourceMappingURL=cleanup.js.map