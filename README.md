# Universal Video Downloader

A modern, privacy-focused, open-source video downloader supporting 2000+ websites. Built with the MERN stack (MongoDB, Express.js, React, Node.js + TypeScript) featuring a beautiful glassmorphism UI with dark/light mode.

## ✨ Features

- **Completely Free** — No subscriptions, paywalls, registration, watermarks, or quality restrictions
- **2000+ Sites Supported** — Powered by yt-dlp (YouTube, Vimeo, Twitter/X, TikTok, Instagram, Facebook, Twitch, Reddit, SoundCloud, Bilibili, and thousands more)
- **Modern Responsive UI** — Glassmorphism design with dark/light mode, mobile-first responsive layout
- **Dynamic Format Selection** — Video+Audio, Video-only, Audio-only with real-time file sizes and quality info
- **Video Playback Preview** — Watch before downloading with native HTML5 player
- **Progress Tracking** — Real-time download progress with WebSocket-like polling
- **Audio Extraction** — Convert to M4A (AAC) or MP3 using server-side FFmpeg
- **Security-First** — SSRF prevention, rate limiting, private IP blocking, no shell injection
- **Privacy-Focused** — No mandatory accounts, temporary processing only, automatic 24-hour cleanup
- **Production-Ready** — Docker, Docker Compose, health checks, monitoring, comprehensive tests

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Server    │────▶│  MongoDB    │
│  (React)    │     │ (Express)   │     │  (Jobs/     │
│             │     │             │     │  Downloads) │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │   Redis     │
                    │  (BullMQ)   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Workers    │
                    │ (yt-dlp +   │
                    │  FFmpeg)    │
                    └─────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose (recommended)
- OR: Node.js 22+, MongoDB 7+, Redis 7+, FFmpeg, yt-dlp

### Docker Deployment (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd universal-video-downloader

# Copy environment file and configure
cp .env.example .env
# Edit .env with your secure passwords

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost
# API: http://localhost:3001/api
```

### Manual Development Setup

```bash
# Terminal 1: Start MongoDB & Redis
docker run -d -p 27017:27017 --name mongodb mongo:7-alpine
docker run -d -p 6379:6379 --name redis redis:7-alpine

# Terminal 2: Start backend
cd server
npm install
cp ../.env.example .env
# Edit .env with your configuration
npm run dev

# Terminal 3: Start frontend
cd client
npm install
npm run dev

# Access: Frontend at http://localhost:5173, API at http://localhost:3001/api
```

## 📖 API Documentation

### Base URL
```
http://localhost:3001/api
```

### Endpoints

#### Analyze Video
Get available formats and metadata for a video URL.

```
POST /api/analyze
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "dQw4w9WgXcQ",
    "title": "Never Gonna Give You Up",
    "duration": 212,
    "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    "formats": [
      {
        "formatId": "22",
        "ext": "mp4",
        "quality": "720p",
        "resolution": "1280x720",
        "filesize": 24576000,
        "vcodec": "avc1.64001F",
        "acodec": "mp4a.40.2",
        "hasVideo": true,
        "hasAudio": true,
        "category": "video+audio"
      }
    ],
    "audioFormats": [
      {
        "formatId": "140",
        "ext": "m4a",
        "quality": "128kbps",
        "filesize": 3145728,
        "acodec": "mp4a.40.2",
        "category": "audio"
      }
    ]
  }
}
```

#### Start Download
Queue a download job for the selected format.

```
POST /api/download
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "formatId": "22",
  "extractAudio": false,
  "audioFormat": "mp3"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "pending",
    "message": "Download queued"
  }
}
```

#### Get Job Status
Poll for download progress and status.

```
GET /api/status/:jobId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "processing",
    "progress": 45,
    "message": "Downloading video...",
    "downloadUrl": null,
    "filename": null,
    "filesize": null
  }
}
```

#### Download File
Download the completed file.

```
GET /api/download/:jobId
```

**Response:** Binary file stream with appropriate headers.

### Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/api/analyze` | 10 requests/minute |
| `/api/download` | 5 requests/minute |

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_ROOT_USER` | MongoDB root username | `admin` |
| `MONGO_ROOT_PASSWORD` | MongoDB root password | *required* |
| `REDIS_PASSWORD` | Redis password (optional) | - |
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port | `3001` |
| `TEMP_DIR` | Temporary download directory | `/tmp/downloads` |
| `MAX_CONCURRENT_JOBS` | Max parallel downloads | `2` |
| `REQUEST_TIMEOUT` | yt-dlp timeout (ms) | `30000` |
| `BLOCKED_DOMAINS` | Comma-separated blocked domains | - |
| `ALLOWED_DOMAINS` | Comma-separated allowed domains (empty = all) | - |
| `VITE_API_URL` | Client API base URL | `http://localhost:3001/api` |

### Domain Filtering

Configure `BLOCKED_DOMAINS` and `ALLOWED_DOMAINS` in `.env` to restrict which sites can be processed:

```env
# Block specific domains
BLOCKED_DOMAINS=example.com,malicious-site.com

# Allow only specific domains (whitelist mode)
ALLOWED_DOMAINS=youtube.com,vimeo.com,twitch.tv
```

## 🔒 Security Features

- **SSRF Protection**: Private IP ranges blocked (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16)
- **Hostname Validation**: Blocks localhost variants, single-label hosts, suspicious TLDs
- **Rate Limiting**: Per-IP limits on analyze/download endpoints
- **Input Validation**: Zod schemas for all API inputs
- **Security Headers**: Helmet.js with CSP, HSTS, X-Frame-Options
- **No Shell Injection**: yt-dlp executed via spawn with validated arguments
- **Automatic Cleanup**: TTL indexes remove completed jobs after 24 hours

## 📁 Project Structure

```
universal-video-downloader/
├── client/                 # React + Vite + TypeScript frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components (Home, Download, Settings)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── store/          # Zustand state management
│   │   ├── services/       # API service layer
│   │   └── utils/          # Utility functions
│   ├── Dockerfile          # Multi-stage nginx build
│   └── nginx.conf          # Nginx config with API proxy
├── server/                 # Express + TypeScript backend
│   ├── src/
│   │   ├── config/         # Configuration management
│   │   ├── controllers/    # Route handlers
│   │   ├── jobs/           # BullMQ workers & queue
│   │   ├── middleware/     # Express middleware
│   │   ├── providers/      # Provider registry (yt-dlp)
│   │   ├── routes/         # API route definitions
│   │   ├── validators/     # Zod validation schemas
│   │   └── index.ts        # Application entry point
│   ├── init-mongo.js       # MongoDB initialization script
│   └── Dockerfile          # Backend Docker build
├── shared/                 # Shared TypeScript types
│   └── types/index.ts      # Common interfaces
├── docker-compose.yml      # Multi-service orchestration
└── .env.example            # Environment template
```

## 🧪 Testing

```bash
# Run server tests
cd server
npm test

# Run with coverage
npm test -- --coverage

# Run client type-check
cd client
npm run type-check
```

## 📦 Building for Production

```bash
# Build all Docker images
docker-compose build

# Start production services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🌐 Supported Platforms

Powered by yt-dlp supporting 2000+ sites including:

- **Video**: YouTube, Vimeo, Dailymotion, Twitch, TikTok, Instagram, Facebook, Twitter/X, Reddit, Bilibili, Niconico, Rumble, Odysee, PeerTube
- **Audio**: SoundCloud, Bandcamp, Mixcloud, Audiomack, Spotify (metadata only)
- **Education**: Coursera, edX, Khan Academy, MIT OpenCourseWare, TED
- **News**: CNN, BBC, Reuters, Bloomberg, VICE, The Guardian
- **And thousands more...**

See [yt-dlp supported sites](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md) for complete list.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Write tests for new features
- Use ESLint + Prettier for formatting
- Update documentation for API changes
- Keep PRs focused and atomic

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## ⚠️ Disclaimer

This tool is for personal use only. Users are responsible for complying with:
- Copyright laws in their jurisdiction
- Terms of service of content providers
- Platform-specific restrictions

The developers are not responsible for any misuse or legal issues arising from downloaded content.

## 🙏 Acknowledgments

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - The incredible video extractor powering this project
- [FFmpeg](https://ffmpeg.org/) - Multimedia processing framework
- [BullMQ](https://bullmq.io/) - Robust job queue for Node.js
- [React](https://react.dev/), [Express](https://expressjs.com/), [MongoDB](https://www.mongodb.com/), [Redis](https://redis.io/)
- [Tailwind CSS](https://tailwindcss.com/), [Lucide Icons](https://lucide.dev/)

---

Built with ❤️ for the open-source community