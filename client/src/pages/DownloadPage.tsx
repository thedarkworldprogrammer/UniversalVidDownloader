import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Download,
  Play,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Volume2,
} from 'lucide-react';
import { useVideoStore } from '../store';
import {
  api,
  createJobPoller,
  formatFileSize,
  formatDuration,
  getFormatTypeLabel,
} from '../services/api';
import type { VideoFormat, JobStatus } from '../types';

export function DownloadPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { jobs, setActiveJob, addJob, updateJob, currentVideo } = useVideoStore();

  const [job, setJob] = useState<JobStatus | null>(null);
  const [selectedFormatId, setSelectedFormatId] = useState<string>('');
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isStartingDownload, setIsStartingDownload] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pollerRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  const formats: VideoFormat[] = currentVideo?.formats || [];
  const selectedFormat =
    formats.find((f) => f.formatId === selectedFormatId) || formats[0] || null;

  useEffect(() => {
    if (formats.length > 0 && !selectedFormatId) {
      setSelectedFormatId(formats[0].formatId);
    }
  }, [formats, selectedFormatId]);

  useEffect(() => {
    if (!jobId) return;

    const existingJob = Array.isArray(jobs)
      ? jobs.find((j) => j.jobId === jobId)
      : (jobs as Record<string, JobStatus> | undefined)?.[jobId];

    if (existingJob) {
      setJob(existingJob);
      if (typeof setActiveJob === 'function') setActiveJob(jobId);
      beginPolling(jobId);
    } else {
      fetchJobStatus(jobId);
    }

    return () => {
      pollerRef.current?.stop();
    };
  }, [jobId]);

  const fetchJobStatus = async (id: string) => {
    try {
      const response = await api.getJobStatus(id);
      if (response.success && response.data) {
        setJob(response.data);
        if (typeof addJob === 'function') addJob(response.data);
        if (typeof setActiveJob === 'function') setActiveJob(id);
        beginPolling(id);
      }
    } catch (error) {
      console.error('Failed to fetch job status:', error);
    }
  };

  const beginPolling = (id: string) => {
    pollerRef.current?.stop();
    const poller = createJobPoller(
      id,
      (status) => {
        setJob(status);
        if (typeof updateJob === 'function') updateJob(id, status);
      },
      () => { }
    );
    pollerRef.current = poller;
    poller.start();
  };

  const handleFormatChange = (newFormatId: string) => {
    setSelectedFormatId(newFormatId);
    setPreviewError(null);
    const fmt = formats.find((f) => f.formatId === newFormatId);
    if (fmt && (fmt as any).playbackUrl && activePreviewUrl) {
      setActivePreviewUrl((fmt as any).playbackUrl);
    }
  };

  const handlePlaySelected = () => {
    setPreviewError(null);
    if (!selectedFormat) return;

    const directStreamUrl = (selectedFormat as any).playbackUrl;
    if (selectedFormat.playable && directStreamUrl) {
      setActivePreviewUrl(directStreamUrl);
      return;
    }

    if (job?.status === 'completed' && job.jobId) {
      setActivePreviewUrl(`/api/video/download/${job.jobId}?preview=true`);
      return;
    }

    setPreviewError(
      `Direct browser preview is unavailable for ${selectedFormat.ext.toUpperCase()} (${selectedFormat.resolution}) because it requires server-side FFmpeg muxing or audio transcoding. Click Download to process and preview it.`
    );
  };

  const handleDownloadSelected = async (formatToDownload: VideoFormat | null = selectedFormat) => {
    if (!currentVideo || !formatToDownload) return;

    setIsStartingDownload(true);
    try {
      const response = await api.download(currentVideo.url, formatToDownload.formatId);
      if (response.success && (response.jobId || response.data?.jobId)) {
        const newJobId = response.jobId || response.data!.jobId;
        const initialStatus: JobStatus = {
          jobId: newJobId,
          status: 'pending',
          progress: 0,
          message: 'Queued for download',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        addJob(initialStatus);
        setActiveJob(newJobId);
        navigate(`/download/${newJobId}`);
      }
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsStartingDownload(false);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const formatOptionLabel = (fmt: VideoFormat): string => {
    const ext = (fmt.ext || 'MP4').toUpperCase();
    const res = fmt.resolution || (fmt.hasVideo ? 'Video' : 'Audio Only');
    const type = getFormatTypeLabel(fmt);
    const size = fmt.filesize ? formatFileSize(fmt.filesize) : 'Size N/A';
    const codec = fmt.hasVideo
      ? [fmt.vcodec, fmt.acodec].filter((c) => c && c !== 'none').join('+')
      : fmt.acodec && fmt.acodec !== 'none'
        ? fmt.acodec
        : '';
    return `${ext} | ${res} | ${type} | ${size}${codec ? ` (${codec})` : ''}`;
  };

  const isComplete = job?.status === 'completed';
  const isFailed = job?.status === 'failed';
  const isProcessing = job?.status === 'processing' || job?.status === 'pending';

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Back to Home
      </Link>

      {/* Video Metadata Card */}
      {currentVideo && (
        <div className="mb-6 p-6 rounded-2xl glass-bg backdrop-blur-sm border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col md:flex-row gap-6">
            {currentVideo.thumbnail && (
              <img
                src={currentVideo.thumbnail}
                alt={currentVideo.title}
                className="w-full md:w-64 h-auto rounded-xl object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-semibold">
                  {currentVideo.source}
                </span>
                {currentVideo.duration && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDuration(currentVideo.duration)}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {currentVideo.title}
              </h1>
              {currentVideo.uploader && (
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                  by {currentVideo.uploader}
                </p>
              )}

              {/* Dynamic Format Selector Dropdown + Play & Download Actions */}
              {formats.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <label
                    htmlFor="format-select"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Select Available Format ({formats.length} detected)
                  </label>
                  <select
                    id="format-select"
                    value={selectedFormat?.formatId || ''}
                    onChange={(e) => handleFormatChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500"
                  >
                    {formats.map((fmt) => (
                      <option key={`${fmt.formatId}-${fmt.ext}`} value={fmt.formatId}>
                        {formatOptionLabel(fmt)}
                      </option>
                    ))}
                  </select>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handlePlaySelected}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white text-sm font-semibold transition-colors"
                    >
                      <Play className="w-4 h-4" aria-hidden="true" />
                      Play Preview
                    </button>

                    <button
                      type="button"
                      disabled={isStartingDownload}
                      onClick={() => handleDownloadSelected(selectedFormat)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
                    >
                      {isStartingDownload ? (
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Download className="w-4 h-4" aria-hidden="true" />
                      )}
                      Download Selected
                    </button>
                  </div>

                  {previewError && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{previewError}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Built-in HTML5 Media Player */}
      {(activePreviewUrl || (isComplete && (job?.outputPath || job?.downloadUrl))) && (
        <div className="mb-6 p-4 rounded-2xl glass-bg backdrop-blur-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-primary-500" aria-hidden="true" />
              Media Player Preview
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">Speed:</span>
              {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleSpeedChange(rate)}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${playbackRate === rate
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
              key={activePreviewUrl || `/api/video/download/${job?.jobId}?preview=true`}
              src={activePreviewUrl || `/api/video/download/${job?.jobId}?preview=true`}
              controls
              playsInline
              className="w-full max-h-[480px]"
              onError={() =>
                setPreviewError(
                  'Browser could not play this stream directly due to codec or CORS restrictions. Use Download Selected to save the file locally.'
                )
              }
            >
              Your browser does not support HTML5 media playback.
            </video>
          </div>
        </div>
      )}

      {/* Job Processing / Download Status Card */}
      {job && (
        <div
          className={`mb-6 p-6 rounded-2xl glass-bg backdrop-blur-sm border transition-colors ${isComplete
            ? 'border-green-500/50 bg-green-500/5'
            : isFailed
              ? 'border-red-500/50 bg-red-500/5'
              : 'border-slate-200 dark:border-slate-700'
            }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${isComplete
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : isFailed
                    ? 'bg-red-100 dark:bg-red-900/30'
                    : 'bg-primary-100 dark:bg-primary-900/30 animate-pulse'
                  }`}
              >
                {isComplete && (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" aria-hidden="true" />
                )}
                {isFailed && (
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" aria-hidden="true" />
                )}
                {isProcessing && (
                  <Loader2
                    className="w-5 h-5 text-primary-600 dark:text-primary-400 animate-spin"
                    aria-hidden="true"
                  />
                )}
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white capitalize">
                  {job.status} {job.message ? `— ${job.message}` : ''}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Job ID: {job.jobId.slice(0, 8)}...
                </p>
              </div>
            </div>

            {(isComplete || isFailed) && jobId && (
              <button
                type="button"
                onClick={() => fetchJobStatus(jobId)}
                className="px-4 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4 inline mr-1" aria-hidden="true" />
                Refresh
              </button>
            )}
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Processing Progress</span>
                <span className="font-mono text-primary-600 dark:text-primary-400">
                  {(job.progress || 0).toFixed(0)}%
                </span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all duration-300"
                  style={{ width: `${job.progress || 0}%` }}
                />
              </div>
            </div>
          )}

          {isFailed && job.error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-red-800 dark:text-red-300 text-sm">{job.error}</p>
              </div>
            </div>
          )}

          {isComplete && (job.outputPath || job.downloadUrl) && (
            <div className="mt-4">
              <a
                href={`/api/video/download/${job.jobId}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
                download={job.filename || true}
              >
                <Download className="w-5 h-5" aria-hidden="true" />
                Save File{' '}
                {job.totalBytes || (job as any).filesize
                  ? `(${formatFileSize(job.totalBytes || (job as any).filesize)})`
                  : ''}
              </a>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Temporary files are automatically removed after expiry.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}