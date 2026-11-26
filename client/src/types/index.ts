/**
 * Client-side type definitions
 */

export interface VideoFormat {
  formatId: string;
  ext: string;
  resolution?: string;
  filesize?: number;
  vcodec?: string;
  acodec?: string;
  hasVideo: boolean;
  hasAudio: boolean;
  fps?: number;
  bitrate?: number;
  downloadable: boolean;
  qualityLabel: string;
  formatNote?: string;
}

export interface VideoMetadata {
  title: string;
  description?: string;
  thumbnail?: string;
  duration?: number;
  source: string;
  formats: VideoFormat[];
  uploader?: string;
  uploaderUrl?: string;
  uploadDate?: string;
  viewCount?: number;
  likeCount?: number;
  isLive: boolean;
  ageRestricted: boolean;
  availability?: string;
}

export interface AnalysisResponse {
  success: boolean;
  data?: VideoMetadata;
  error?: string;
  details?: any;
}

export interface DownloadResponse {
  success: boolean;
  jobId?: string;
  error?: string;
  details?: any;
}

export interface JobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message: string;
  downloadUrl?: string;
  filename?: string;
  filesize?: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProviderInfo {
  id: string;
  name: string;
  version: string;
  status: 'active' | 'deprecated' | 'broken' | 'maintenance';
  supportedDomains: string[];
  capabilities: {
    video: boolean;
    audio: boolean;
    live: boolean;
    playlists: boolean;
    subtitles: boolean;
    dash: boolean;
    hls: boolean;
    requiresAuth: boolean;
    geoRestricted: boolean;
  };
}

export interface ProvidersResponse {
  success: boolean;
  data: ProviderInfo[];
}

export interface HealthResponse {
  success: boolean;
  status: string;
  timestamp: string;
  uptime: number;
  memory: {
    rss: string;
    heapUsed: string;
    heapTotal: string;
  };
  providers: number;
  activeJobs: number;
  queuedJobs: number;
}