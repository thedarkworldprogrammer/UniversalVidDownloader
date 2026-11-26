/**
 * Shared type definitions between client and server
 */

export interface VideoFormat {
  formatId: string;
  ext: string;
  resolution?: string;
  mimeType?: string;
  hasAudio: boolean;
  hasVideo: boolean;
  filesize?: number;
  filesizeApprox?: number;
  vcodec?: string;
  acodec?: string;
  fps?: number;
  playable: boolean;
  downloadable: boolean;
  quality?: string;
  bitrate?: number;
  abr?: number;
  vbr?: number;
  language?: string;
  container?: string;
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
  isLive?: boolean;
  ageRestricted?: boolean;
  availability?: string;
}

export interface AnalysisRequest {
  url: string;
}

export interface AnalysisResponse {
  success: boolean;
  data?: VideoMetadata;
  error?: string;
  message?: string;
}

export interface DownloadRequest {
  url: string;
  formatId: string;
}

export interface DownloadResponse {
  success: boolean;
  jobId?: string;
  downloadUrl?: string;
  filename?: string;
  error?: string;
}

export interface JobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message?: string;
  downloadUrl?: string;
  filename?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProviderInfo {
  id: string;
  name: string;
  supportedDomains: string[];
  description?: string;
  capabilities: ProviderCapabilities;
  status: 'active' | 'deprecated' | 'broken' | 'maintenance';
  version: string;
  lastTested?: Date;
  limitations?: string[];
}

export interface ProviderCapabilities {
  video: boolean;
  audio: boolean;
  live: boolean;
  playlists: boolean;
  subtitles: boolean;
  dash: boolean;
  hls: boolean;
  requiresAuth: boolean;
  geoRestricted: boolean;
}

export type Theme = 'light' | 'dark' | 'system';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}