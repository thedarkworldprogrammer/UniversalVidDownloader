import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, Download, Play, Pause, Volume2, VolumeX, Settings, ArrowLeft, RefreshCw, Trash2, Music, Film, FileAudio } from 'lucide-react';
import { useVideoStore } from '../store';
import { api, createJobPoller, formatFileSize, formatDuration, getQualityLabel, getFormatBadgeColor, getFormatTypeLabel } from '../services/api';
import type { VideoFormat, JobStatus } from '../types';

export function DownloadPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { jobs, activeJobId, setActiveJob, addJob, updateJob, removeJob, currentVideo, setShowFormatSelector } = useVideoStore();
  const [job, setJob] = useState<JobStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showFormatSelector, setShowFormatSelectorState] = useState(false);

  // Get job from store or create from jobId
  useEffect(() => {
    if (jobId) {
      // Check if job exists in store
      const existingJob = jobs.find(j => j.jobId === jobId);
      if (existingJob) {
        setJob(existingJob);
        setActiveJob(jobId);
        startPolling(existingJob);
      } else {
        // Fetch job status
        fetchJobStatus();
      }
    }
  }, [jobId]);

  const fetchJobStatus = async () => {
    if (!jobId) return;
    try {
      const response = await api.getJobStatus(jobId);
      if (response.success && response.data) {
        const jobData = response.data;
        setJob(jobData);
        addJob(jobData);
        setActiveJob(jobId);
        startPolling(jobData);
      }
    } catch (error) {
      console.error('Failed to fetch job status:', error);
    }
  };

  const startPolling = (initialJob: JobStatus) => {
    if (isPolling) return;
    setIsPolling(true);

    const poller = createJobPoller(
      jobId!,
      (status) => {
        setJob(status);
        updateJob(jobId!, status);
      },
      () => {
        setIsPolling(false);
      }
    );

    poller.start();

    // Cleanup on unmount
    return () => {
      poller.stop();
      setIsPolling(false);
    };
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      setIsPolling(false);
    };
  }, []);

  const handleDownload = async (format: VideoFormat) => {
    if (!jobId || !currentVideo) return;

    try {
      const response = await api.download(currentVideo.url, format.formatId);
      if (response.success && response.data) {
        // New job created for download
        const downloadJob = response.data;
        addJob(downloadJob);
        setActiveJob(downloadJob.jobId);
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleRetry = () => {
    if (jobId) {
      fetchJobStatus();
    }
  };

  const handleCancel = () => {
    // TODO: Implement cancel job API
    console.log('Cancel job:', jobId);
  };

  const formatSpeed = (bytesPerSec: number): string => {
    return formatFileSize(bytesPerSec) + '/s';
  };

  const formatProgress = (progress: number): string => {
    return `${progress.toFixed(1)}%`;
  };

  const getFormatIcon = (format: VideoFormat) => {
    if (format.hasVideo && format.hasAudio) return <Film className="w-4 h-4" aria-hidden="true" />;
    if (format.hasVideo && !format.hasAudio) return <Film className="w-4 h-4" aria-hidden="true" />;
    return <Music className="w-4 h-4" aria-hidden="true" />;
  };

  const getFormatIconColor = (format: VideoFormat) => {
    if (format.hasVideo && format.hasAudio) return 'text-green-500';
    if (format.hasVideo && !format.hasAudio) return 'text-blue-500';
    return 'text-purple-500';
  };

  const getFormatCategory = (format: VideoFormat): string => {
    if (format.hasVideo && format.hasAudio) return 'Video + Audio';
    if (format.hasVideo && !format.hasAudio) return 'Video Only';
    return 'Audio Only';
  };

  if (!job) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-500 mx-auto mb-4" aria-hidden="true" />
          <p className="text-slate-600 dark:text-slate-400 text-lg">Loading download status...</p>
        </div>
      </div>
    );
  }

  const isComplete = job.status === 'completed';
  const isFailed = job.status === 'failed';
  const isProcessing = job.status === 'processing' || job.status === 'pending';
  const hasFormats = currentVideo?.formats && currentVideo.formats.length > 0;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Link */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Back to Home
      </Link>

      {/* Video Info Card */}
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
              <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2 truncate">
                {currentVideo.title}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                {currentVideo.uploader ? `by ${currentVideo.uploader}` : 'Unknown uploader'}
                {currentVideo.duration && ` • ${formatDuration(currentVideo.duration)}`}
              </p>
              <div className="flex flex-wrap gap-2">
                {currentVideo.formats && (
                  <>
                    <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium">
                      {currentVideo.formats.filter(f => f.hasVideo && f.hasAudio).length} Video+Audio
                    </span>
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-medium">
                      {currentVideo.formats.filter(f => f.hasVideo && !f.hasAudio).length} Video Only
                    </span>
                    <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 text-xs font-medium">
                      {currentVideo.formats.filter(f => !f.hasVideo && f.hasAudio).length} Audio Only
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Card */}
      <div className={`mb-6 p-6 rounded-2xl glass-bg backdrop-blur-sm border transition-colors ${
        isComplete ? 'border-green-500/50 bg-green-500/5' :
        isFailed ? 'border-red-500/50 bg-red-500/5' :
        'border-slate-200 dark:border-slate-700'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isComplete ? 'bg-green-100 dark:bg-green-900/30' :
              isFailed ? 'bg-red-100 dark:bg-red-900/30' :
              'bg-primary-100 dark:bg-primary-900/30 animate-pulse'
            }`}>
              {isComplete && <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" aria-hidden="true" />}
              {isFailed && <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" aria-hidden="true" />}
              {isProcessing && <Loader2 className="w-5 h-5 text-primary-600 dark:text-primary-400 animate-spin" aria-hidden="true" />}
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white capitalize">
                {job.status}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Job ID: {job.jobId.slice(0, 8)}...
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isProcessing && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
            {(isComplete || isFailed) && (
              <button
                onClick={handleRetry}
                className="px-4 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4 inline mr-1" aria-hidden="true" />
                Refresh
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Progress</span>
              <span className="font-mono text-primary-600 dark:text-primary-400">
                {formatProgress(job.progress || 0)}
              </span>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all duration-300"
                style={{ width: `${job.progress || 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-500">
              {job.downloadedBytes && job.totalBytes && (
                <>
                  <span>Downloaded: {formatFileSize(job.downloadedBytes)}</span>
                  <span>Total: {formatFileSize(job.totalBytes)}</span>
                </>
              )}
              {job.speed && <span>Speed: {formatSpeed(job.speed)}</span>}
              {job.eta && <span>ETA: {formatDuration(job.eta)}</span>}
            </div>
          </div>
        )}

        {/* Error Message */}
        {isFailed && job.error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-red-800 dark:text-red-300 text-sm">{job.error}</p>
            </div>
          </div>
        )}

        {/* Completed - Download Button */}
        {isComplete && job.outputPath && (
          <div className="mt-4">
            <a
              href={`/api/video/download/${job.jobId}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
              download
            >
              <Download className="w-5 h-5" aria-hidden="true" />
              Download File ({job.totalBytes ? formatFileSize(job.totalBytes) : 'Unknown size'})
            </a>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              File will be deleted automatically after 24 hours.
            </p>
          </div>
        )}
      </div>

      {/* Format Selector - Shows when video has formats but job not started */}
      {hasFormats && isProcessing && job.status === 'pending' && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Select Format to Download
          </h3>

          {/* Category tabs */}
          <div className="mb-4 flex flex-wrap gap-2">
            {['Video + Audio', 'Video Only', 'Audio Only'].map((category) => (
              <button
                key={category}
                className="px-4 py-2 text-sm font-medium rounded-lg glass-bg backdrop-blur-sm border border-slate-200 dark:border-slate-700 hover:border-primary-500/50 transition-all"
              >
                {category}
                <span className="ml-2 px-2 py-0.5 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full">
                  {currentVideo?.formats?.filter(f => getFormatCategory(f) === category).length || 0}
                </span>
              </button>
            ))}
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {currentVideo?.formats?.map((format) => (
              <button
                key={format.formatId}
                onClick={() => handleDownload(format)}
                className="w-full p-4 rounded-xl glass-bg backdrop-blur-sm border border-slate-200 dark:border-slate-700 hover:border-primary-500/50 transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-lg ${getFormatIconColor(format)} bg-opacity-10`}>
                      {getFormatIcon(format)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-slate-900 dark:text-white truncate">
                          {getQualityLabel(format)}
                        </p>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getFormatBadgeColor(format)}`}>
                          {getFormatCategory(format)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {format.ext?.toUpperCase()} • {format.vcodec !== 'none' ? format.vcodec : 'audio only'}
                        {format.acodec !== 'none' && ` + ${format.acodec}`}
                        {format.abr && ` • ${format.abr}kbps`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    {format.filesize && (
                      <span className="text-sm font-mono text-slate-600 dark:text-slate-400">
                        {formatFileSize(format.filesize)}
                      </span>
                    )}
                    <Download className="w-5 h-5 text-primary-500 group-hover:scale-110 transition-transform" aria-hidden="true" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Video Preview - Available when completed */}
      {isComplete && job.outputPath && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Preview
          </h3>
          <div className="rounded-xl overflow-hidden bg-black">
            <video
              ref={setVideoElement}
              src={`/api/video/download/${job.jobId}`}
              controls
              className="w-full"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onVolumeChange={(e) => setIsMuted(e.target.muted)}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}
    </div>
  );
}