import { useState, FormEvent, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Loader2,
  Globe,
  CheckCircle,
  AlertCircle,
  Shield,
  ClipboardPaste,
  X,
  Play,
  Download,
  Volume2,
} from 'lucide-react';
import { useVideoStore } from '../store';
import {
  api,
  formatFileSize,
  formatDuration,
  getFormatTypeLabel,
} from '../services/api';
import type { VideoFormat, JobStatus } from '../types';

export function Hero() {
  const navigate = useNavigate();
  const {
    currentVideo,
    setCurrentUrl,
    setIsAnalyzing,
    setCurrentVideo,
    setAnalysisError,
    setShowFormatSelector,
    addJob,
    setActiveJob,
  } = useVideoStore();

  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedFormatId, setSelectedFormatId] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewNotice, setPreviewNotice] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isDownloading, setIsDownloading] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const validateUrl = (input: string): boolean => {
    try {
      const parsed = new URL(input.trim());
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setPreviewUrl(null);
    setPreviewNotice(null);

    const trimmed = url.trim();
    if (!trimmed) {
      setSubmitError('Please enter a video URL');
      return;
    }

    if (!validateUrl(trimmed)) {
      setSubmitError('Please enter a valid HTTP or HTTPS URL');
      return;
    }

    setIsSubmitting(true);
    setIsAnalyzing(true);
    setCurrentUrl(trimmed);

    try {
      const response = await api.analyze(trimmed);

      if (response.success && response.data) {
        const videoData = { ...response.data, url: trimmed };
        setCurrentVideo(videoData);
        setShowFormatSelector(true);
        if (videoData.formats && videoData.formats.length > 0) {
          setSelectedFormatId(videoData.formats[0].formatId);
        }
        setSubmitError(null);
      } else {
        const errMsg = response.error || 'Failed to analyze video';
        setSubmitError(errMsg);
        setAnalysisError(errMsg);
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.error ||
        error?.error ||
        error?.message ||
        'Analysis failed';
      setSubmitError(message);
      setAnalysisError(message);
    } finally {
      setIsSubmitting(false);
      setIsAnalyzing(false);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) {
        setUrl(text);
        setSubmitError(null);
      }
    } catch {
      setSubmitError('Clipboard access blocked by browser. Press Ctrl+V inside the input box.');
    }
  };

  const handleClear = () => {
    setUrl('');
    setSubmitError(null);
    setCurrentVideo(null);
    setPreviewUrl(null);
    setPreviewNotice(null);
  };

  const formats: VideoFormat[] = currentVideo?.formats || [];
  const selectedFormat =
    formats.find((f) => f.formatId === selectedFormatId) || formats[0] || null;

  // const handleFormatChange = (newId: string) => {
  //   setSelectedFormatId(newId);
  //   setPreviewNotice(null);
  //   const fmt = formats.find((f) => f.formatId === newId);
  //   if (fmt && previewUrl) {
  //     const directUrl = (fmt as any).playbackUrl;
  //     if (fmt.playable && directUrl) {
  //       setPreviewUrl(directUrl);
  //     } else {
  //       const targetUrl = currentVideo?.url || url.trim();
  //       if (targetUrl) {
  //         setPreviewUrl(
  //           `/api/video/stream?url=${encodeURIComponent(
  //             targetUrl
  //           )}&formatId=${encodeURIComponent(fmt.formatId)}`
  //         );
  //       }
  //     }
  //   }
  // };

  // const handlePlay = () => {
  //   setPreviewNotice(null);
  //   if (!selectedFormat) return;

  //   const directUrl = (selectedFormat as any).playbackUrl;
  //   if (selectedFormat.playable && directUrl) {
  //     setPreviewUrl(directUrl);
  //     return;
  //   }

  //   const targetUrl = currentVideo?.url || url.trim();
  //   if (targetUrl) {
  //     const streamUrl = `/api/video/stream?url=${encodeURIComponent(
  //       targetUrl
  //     )}&formatId=${encodeURIComponent(selectedFormat.formatId)}`;
  //     setPreviewUrl(streamUrl);
  //     return;
  //   }

  //   setPreviewNotice(
  //     `Direct browser playback is not supported for ${selectedFormat.ext.toUpperCase()} (${selectedFormat.resolution}) because it requires server-side FFmpeg muxing or conversion. Click Download to process the file.`
  //   );
  // };

  const buildStreamUrl = (fmt: VideoFormat) => {
    const targetUrl = currentVideo?.url || url.trim();
    if (!targetUrl) return null;
    return `/api/video/stream?url=${encodeURIComponent(
      targetUrl
    )}&formatId=${encodeURIComponent(fmt.formatId)}`;
  };

  const handleFormatChange = (newId: string) => {
    setSelectedFormatId(newId);
    setPreviewNotice(null);
    const fmt = formats.find((f) => f.formatId === newId);
    if (fmt && previewUrl) {
      const nextUrl = buildStreamUrl(fmt);
      if (nextUrl) setPreviewUrl(nextUrl);
    }
  };

  const handlePlay = () => {
    setPreviewNotice(null);
    if (!selectedFormat) return;

    const streamUrl = buildStreamUrl(selectedFormat);
    if (streamUrl) {
      setPreviewUrl(streamUrl);
      return;
    }

    setPreviewNotice('Unable to build stream URL. Please enter a valid video URL.');
  };

  // const handleDownload = async () => {
  //   if (!currentVideo || !selectedFormat) return;

  //   setIsDownloading(true);
  //   setSubmitError(null);
  //   try {
  //     const targetUrl = currentVideo.url || url.trim();
  //     const response = await api.download(targetUrl, selectedFormat.formatId);
  //     const createdJobId = response.jobId || response.data?.jobId;

  //     if (response.success && createdJobId) {
  //       const initialJob: JobStatus = {
  //         jobId: createdJobId,
  //         status: 'pending',
  //         progress: 0,
  //         message: 'Queued for download',
  //         createdAt: new Date(),
  //         updatedAt: new Date(),
  //       };
  //       addJob(initialJob);
  //       setActiveJob(createdJobId);
  //       navigate(`/download/${createdJobId}`);
  //     } else {
  //       setSubmitError(response.error || 'Failed to start download');
  //     }
  //   } catch (error: any) {
  //     setSubmitError(
  //       error?.response?.data?.error || error?.message || 'Failed to start download'
  //     );
  //   } finally {
  //     setIsDownloading(false);
  //   }
  // };

  const handleDownload = () => {
    if (!currentVideo || !selectedFormat) return;

    setSubmitError(null);
    const targetUrl = currentVideo.url || url.trim();
    const title = currentVideo.title || 'video';

    const nativeDownloadUrl = `/api/video/stream?url=${encodeURIComponent(
      targetUrl
    )}&formatId=${encodeURIComponent(selectedFormat.formatId)}&title=${encodeURIComponent(
      title
    )}&download=1`;

    const link = document.createElement('a');
    link.href = nativeDownloadUrl;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDropdownLabel = (fmt: VideoFormat): string => {
    const ext = (fmt.ext || 'MP4').toUpperCase();
    const res = fmt.resolution || (fmt.hasVideo ? 'Video' : 'Audio Only');
    const type = getFormatTypeLabel(fmt);
    const size = fmt.filesize ? formatFileSize(fmt.filesize) : 'Size unknown';
    return `${ext} | ${res} | ${type} | ${size}`;
  };

  return (
    <section className="relative py-16 lg:py-24 overflow-hidden" aria-labelledby="hero-heading">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 mb-6 shadow-sm">
          <CheckCircle className="w-4 h-4 text-green-500" aria-hidden="true" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            100% Free • No Registration • Modular Multi-Site Extractor
          </span>
        </div>

        {/* Main Heading */}
        <h1
          id="hero-heading"
          className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-white mb-6"
        >
          Download Videos from{' '}
          <span className="bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            the Web
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 mb-10 max-w-2xl mx-auto">
          Paste any compatible video URL to inspect real available formats, preview playable
          streams, or download video and audio without watermarks or limits.
        </p>

        {/* URL Input Form */}
        <form onSubmit={handleSubmit}>
          <div
            className="relative max-w-3xl mx-auto"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const dropped = e.dataTransfer.getData('text').trim();
              if (dropped) setUrl(dropped);
            }}
          >
            <label htmlFor="video-url" className="sr-only">
              Video URL
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Globe
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="video-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... or any supported video URL"
                  disabled={isSubmitting}
                  className="w-full pl-12 pr-24 py-4 text-base bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all placeholder:text-slate-400 disabled:opacity-50"
                  autoComplete="url"
                />

                {/* Paste / Clear Actions inside input */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {url ? (
                    <button
                      type="button"
                      onClick={handleClear}
                      title="Clear URL"
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePasteClipboard}
                      title="Paste from clipboard"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" aria-hidden="true" />
                      Paste
                    </button>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-7 py-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold rounded-xl shadow-sm transition-colors inline-flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" aria-hidden="true" />
                    Analyze
                  </>
                )}
              </button>
            </div>

            {submitError && (
              <p
                id="url-error"
                className="mt-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-center gap-1.5"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                {submitError}
              </p>
            )}
          </div>
        </form>

        {/* Analyzed Video Card + Dynamic Format Dropdown + Play/Download */}
        {currentVideo && formats.length > 0 && (
          <div className="mt-10 max-w-3xl mx-auto text-left p-6 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex flex-col md:flex-row gap-6">
              {currentVideo.thumbnail && (
                <img
                  src={currentVideo.thumbnail}
                  alt={currentVideo.title}
                  className="w-full md:w-64 h-40 rounded-xl object-cover flex-shrink-0 bg-slate-900"
                />
              )}

              <div className="flex-1 min-w-0 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-xs font-semibold">
                      {currentVideo.source}
                    </span>
                    {currentVideo.duration && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Duration: {formatDuration(currentVideo.duration)}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-2">
                    {currentVideo.title}
                  </h2>
                </div>

                {/* Dynamic Formats Dropdown */}
                <div>
                  <label
                    htmlFor="hero-format-select"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
                  >
                    Available Formats ({formats.length})
                  </label>
                  <select
                    id="hero-format-select"
                    value={selectedFormat?.formatId || ''}
                    onChange={(e) => handleFormatChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500"
                  >
                    {formats.map((fmt) => (
                      <option key={`${fmt.formatId}-${fmt.ext}`} value={fmt.formatId}>
                        {formatDropdownLabel(fmt)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Separate Play & Download Actions */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handlePlay}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white text-sm font-semibold transition-colors"
                  >
                    <Play className="w-4 h-4" aria-hidden="true" />
                    Play
                  </button>

                  <button
                    type="button"
                    disabled={isDownloading}
                    onClick={handleDownload}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
                  >
                    {isDownloading ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Download className="w-4 h-4" aria-hidden="true" />
                    )}
                    Download
                  </button>
                </div>

                {previewNotice && (
                  <p className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                    {previewNotice}
                  </p>
                )}
              </div>
            </div>

            {/* Built-in HTML5 Player when Play is clicked */}
            {previewUrl && (
              <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-primary-500" aria-hidden="true" />
                    Stream Preview
                  </span>
                  <div className="flex items-center gap-1">
                    {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => {
                          setPlaybackRate(rate);
                          if (videoRef.current) videoRef.current.playbackRate = rate;
                        }}
                        className={`px-2 py-0.5 rounded text-xs font-medium ${playbackRate === rate
                          ? 'bg-primary-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl overflow-hidden bg-black">
                  <video
                    ref={videoRef}
                    key={previewUrl}
                    src={previewUrl}
                    controls
                    autoPlay
                    playsInline
                    className="w-full max-h-[420px]"
                    onError={() =>
                      setPreviewNotice(
                        'Stream blocked by source CORS/expiry. Click Download to save and play the file.'
                      )
                    }
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Trust indicators */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <Shield className="w-4 h-4" aria-hidden="true" />
            Privacy First
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-green-500" aria-hidden="true" />
            No Registration
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-green-500" aria-hidden="true" />
            No Watermarks
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-green-500" aria-hidden="true" />
            Unlimited Quality
          </span>
        </div>
      </div>
    </section>
  );
}