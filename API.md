# API Documentation

Complete API reference for Universal Video Downloader backend.

## Base URL

```
Production:  https://your-domain.com/api
Development: http://localhost:3001/api
```

## Authentication

Currently, no authentication is required. All endpoints are public with rate limiting applied per IP address.

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /analyze` | 10 requests | 1 minute |
| `POST /download` | 5 requests | 1 minute |

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error message",
    "details": []  // Optional: validation error details
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request body validation failed |
| `INVALID_URL` | 400 | URL format invalid or blocked |
| `SSRF_BLOCKED` | 403 | URL blocked by SSRF protection |
| `RATE_LIMITED` | 429 | Too many requests |
| `NOT_FOUND` | 404 | Job or resource not found |
| `JOB_FAILED` | 500 | Download job failed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Endpoints

### 1. Analyze Video

Extract video metadata and available formats without downloading.

**Request:**
```
POST /api/analyze
Content-Type: application/json
```

**Body:**
```json
{
  "url": "string (required, valid HTTP/HTTPS URL)"
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "title": "string",
    "description": "string",
    "duration": "number (seconds)",
    "thumbnail": "string (URL)",
    "uploader": "string",
    "uploadDate": "string (YYYYMMDD)",
    "viewCount": "number",
    "likeCount": "number",
    "formats": [
      {
        "formatId": "string",
        "ext": "string",
        "quality": "string",
        "resolution": "string (WxH)",
        "filesize": "number (bytes)",
        "vcodec": "string",
        "acodec": "string",
        "hasVideo": "boolean",
        "hasAudio": "boolean",
        "category": "video+audio | video-only | audio-only",
        "fps": "number",
        "tbr": "number (total bitrate)",
        "vbr": "number (video bitrate)",
        "abr": "number (audio bitrate)"
      }
    ],
    "audioFormats": [
      {
        "formatId": "string",
        "ext": "string (m4a|mp3)",
        "quality": "string (e.g., 128kbps)",
        "filesize": "number (bytes)",
        "acodec": "string",
        "category": "audio",
        "abr": "number (audio bitrate)"
      }
    ],
    "subtitles": {
      "langCode": [
        {
          "ext": "string",
          "name": "string",
          "url": "string"
        }
      ]
    },
    "thumbnails": [
      {
        "url": "string",
        "width": "number",
        "height": "number"
      }
    ]
  }
}
```

**Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Video ID from source platform |
| `title` | string | Video title |
| `duration` | number | Duration in seconds |
| `formats[].category` | enum | `video+audio` (merged), `video-only`, `audio-only` |
| `formats[].filesize` | number | Approximate size in bytes (may be null for live streams) |
| `audioFormats` | array | Pre-configured audio extraction options (M4A/MP3) |

---

### 2. Start Download

Queue a download job for the selected format.

**Request:**
```
POST /api/download
Content-Type: application/json
```

**Body:**
```json
{
  "url": "string (required)",
  "formatId": "string (required)",
  "extractAudio": "boolean (optional, default: false)",
  "audioFormat": "string (optional, enum: 'm4a' | 'mp3', default: 'm4a')"
}
```

**Example:**
```bash
# Download video
curl -X POST http://localhost:3001/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "formatId": "22"}'

# Extract audio as MP3
curl -X POST http://localhost:3001/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "formatId": "140", "extractAudio": true, "audioFormat": "mp3"}'
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "jobId": "string (UUID)",
    "status": "pending",
    "message": "Download queued"
  }
}
```

---

### 3. Get Job Status

Poll for download progress. Call repeatedly until status is `completed` or `failed`.

**Request:**
```
GET /api/status/:jobId
```

**Example:**
```bash
curl http://localhost:3001/api/status/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "jobId": "string",
    "status": "pending | processing | completed | failed | cancelled",
    "progress": "number (0-100)",
    "message": "string",
    "error": "string (only on failed)",
    "downloadUrl": "string (only on completed, relative path)",
    "filename": "string (only on completed)",
    "filesize": "number (only on completed)",
    "createdAt": "string (ISO 8601)",
    "updatedAt": "string (ISO 8601)"
  }
}
```

**Status Flow:**
```
pending → processing → completed
                ↓
              failed
                ↓
            cancelled (optional)
```

**Polling Recommendation:**
- Initial: 1 second intervals
- After 10s: 2 second intervals
- After 30s: 5 second intervals
- Max: 30 second intervals

---

### 4. Download Completed File

Download the processed file. Only works when job status is `completed`.

**Request:**
```
GET /api/download/:jobId
```

**Example:**
```bash
# Download with browser
open http://localhost:3001/api/download/a1b2c3d4-e5f6-7890-abcd-ef1234567890

# Download with curl (saves to file)
curl -L -o "video.mp4" http://localhost:3001/api/download/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Response:**
- `200`: Binary file stream with headers:
  - `Content-Type`: Based on file extension
  - `Content-Disposition`: `attachment; filename="sanitized-filename.ext"`
  - `Content-Length`: File size in bytes
- `404`: Job not found or not completed
- `410`: File expired (cleaned up after 24 hours)

---


### 6. Health Check

Check service health and dependencies.

**Request:**
```
GET /api/health
```

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "dependencies": {
    "mongodb": "connected",
    "redis": "connected",
    "queue": "active"
  },
  "version": "1.0.0"
}
```

**Response (503 - degraded):**
```json
{
  "status": "degraded",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "dependencies": {
    "mongodb": "connected",
    "redis": "disconnected",
    "queue": "inactive"
  }
}
```

---


## Data Models

### Format Object

```typescript
interface VideoFormat {
  formatId: string;           // yt-dlp format ID
  ext: string;                // Container extension (mp4, webm, m4a, etc.)
  quality: string;            // Human-readable quality (720p, 1080p, 128kbps)
  resolution?: string;        // "1920x1080" (video formats)
  filesize?: number;          // Approximate bytes
  vcodec?: string;            // Video codec (avc1.64001F, vp9, av01)
  acodec?: string;            // Audio codec (mp4a.40.2, opus)
  hasVideo: boolean;          // Contains video track
  hasAudio: boolean;          // Contains audio track
  category: 'video+audio' | 'video-only' | 'audio-only';
  fps?: number;               // Frame rate
  tbr?: number;               // Total bitrate (kbps)
  vbr?: number;               // Video bitrate (kbps)
  abr?: number;               // Audio bitrate (kbps)
}
```

### Job Object

```typescript
interface DownloadJob {
  jobId: string;              // UUID
  url: string;                // Original video URL
  formatId: string;           // Selected format
  extractAudio: boolean;      // Audio extraction requested
  audioFormat: 'm4a' | 'mp3'; // Audio output format
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;           // 0-100
  message: string;            // Status message
  error?: string;             // Error details (failed only)
  downloadUrl?: string;       // Relative download path (completed only)
  filename?: string;          // Sanitized filename (completed only)
  filesize?: number;          // File size in bytes (completed only)
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Client Integration Guide

### React Hook Example

```typescript
import { useMutation, useQuery } from '@tanstack/react-query';

const api = axios.create({ baseURL: '/api' });

// Analyze video
const useAnalyzeVideo = () => useMutation({
  mutationFn: (url: string) => api.post('/analyze', { url }),
});

// Start download
const useStartDownload = () => useMutation({
  mutationFn: (data: { url: string; formatId: string; extractAudio?: boolean; audioFormat?: 'm4a' | 'mp3' }) =>
    api.post('/download', data),
});

// Poll job status
const useJobStatus = (jobId: string | null) => useQuery({
  queryKey: ['job', jobId],
  queryFn: () => api.get(`/status/${jobId}`),
  enabled: !!jobId,
  refetchInterval: (data) => {
    if (!data) return 1000;
    if (data.data.data.status === 'completed' || data.data.data.status === 'failed') return false;
    return 2000;
  },
});
```

### Complete Download Flow

```typescript
async function downloadVideo(url: string, formatId: string) {
  // 1. Start download
  const { data: { data: { jobId } } } = await api.post('/download', { url, formatId });
  
  // 2. Poll for completion
  while (true) {
    const { data: { data: job } } = await api.get(`/video/status/${jobId}`);
    
    if (job.status === 'completed') {
      // 3. Download file
      window.open(`/api/video/download/${jobId}`, '_blank');
      break;
    }
    
    if (job.status === 'failed') {
      throw new Error(job.error || 'Download failed');
    }
    
    // Update UI with job.progress
    await new Promise(r => setTimeout(r, 2000));
  }
}
```

---

## WebSocket Alternative (Future)

For real-time progress without polling, a WebSocket endpoint is planned:

```
WS /api/ws/:jobId
```

Messages:
```json
{ "type": "progress", "progress": 45, "message": "Downloading..." }
{ "type": "complete", "downloadUrl": "/api/video/download/...", "filename": "video.mp4" }
{ "type": "error", "error": "Download failed" }
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-15 | Initial release |