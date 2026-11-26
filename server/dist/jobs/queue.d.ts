import { Queue, Worker } from 'bullmq';
import { JobData } from '../types';
export declare function getJobStore(): Map<string, any>;
declare const downloadQueue: Queue<any, any, string, any, any, string>;
/**
 * Job queue manager
 */
export declare class JobQueue {
    addDownloadJob(data: JobData): Promise<string>;
    getJobStatus(jobId: string): Promise<any>;
    cancelJob(jobId: string): Promise<boolean>;
}
/**
 * Download worker - processes download jobs
 */
declare const downloadWorker: Worker<JobData, any, string>;
/**
 * Update job status in store
 */
export declare function updateJobStatus(jobId: string, status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled', progress: number, message: string): void;
/**
 * Download worker - processes download jobs
 */
export { downloadQueue, downloadWorker };
//# sourceMappingURL=queue.d.ts.map