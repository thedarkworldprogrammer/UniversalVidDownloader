import axios, { AxiosError, AxiosInstance } from 'axios';
import type {
  AnalysisResponse,
  VideoMetadata,
  DownloadResponse,
  JobStatus,
  ProvidersResponse,
  HealthResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.data) {
          return Promise.reject(error.response.data);
        }
        return Promise.reject({
          success: false,
          error: error.message || 'Network error',
        });
      }
    );
  }

  /**
   * Analyze a video URL
   */
  async analyze(url: string): Promise<AnalysisResponse> {
    const response = await this.client.post<AnalysisResponse>('/video/analyze', { url });
    return response.data;
  }

  /**
   * Start a download job
   */
  async download(url: string, formatId: string): Promise<DownloadResponse> {
    const response = await this.client.post<DownloadResponse>('/video/download', { url, formatId });
    return response.data;
  }

  /**
   * Get download job status
   */
  async getJobStatus(jobId: string): Promise<{ success: boolean; data: JobStatus }> {
    const response = await this.client.get<{ success: boolean; data: JobStatus }>(`/video/status/${jobId}`);
    return response.data;
  }

  /**
   * Get all providers
   */
  async getProviders(): Promise<ProvidersResponse> {
    const response = await this.client.get<ProvidersResponse>('/providers');
    return response.data;
  }

  /**
   * Get specific provider info
   */
  async getProvider(providerId: string): Promise<{ success: boolean; data: any }> {
    const response = await this.client.get<{ success: boolean; data: any }>(`/providers/${providerId}`);
    return response.data;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<HealthResponse> {
    const response = await this.client.get<HealthResponse>('/health');
    return response.data;
  }
}

export const api = new ApiClient();

// Helper functions for polling
export function createJobPoller(jobId: string, onUpdate: (status: JobStatus) => void, onComplete: () => void) {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let isCancelled = false;

  const poll = async () => {
    if (isCancelled) return;

    try {
      const response = await api.getJobStatus(jobId);
      const job = response.data;
      onUpdate(job);

      if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
        stop();
        onComplete();
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  };

  const start = () => {
    poll(); // Initial poll
    intervalId = setInterval(poll, 2000); // Poll every 2 seconds
  };

  const stop = () => {
    isCancelled = true;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  return { start, stop };
}

// Format utilities
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDuration(seconds: number | undefined): string {
  if (!seconds) return 'Unknown';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function getQualityLabel(format: any): string {
  if (format.resolution) return format.resolution;
  if (format.qualityLabel) return format.qualityLabel;
  if (format.formatNote) return format.formatNote;
  return format.formatId;
}

export function getFormatBadgeColor(format: any): string {
  if (format.hasVideo && format.hasAudio) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  if (format.hasVideo) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
  return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
}

export function getFormatTypeLabel(format: any): string {
  if (format.hasVideo && format.hasAudio) return 'Video + Audio';
  if (format.hasVideo) return 'Video Only';
  return 'Audio Only';
}