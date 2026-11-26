import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { VideoMetadata, VideoFormat, JobStatus } from '../types';

interface VideoStore {
  // Current analysis
  currentVideo: VideoMetadata | null;
  currentUrl: string;
  isAnalyzing: boolean;
  analysisError: string | null;

  // Download jobs
  jobs: Map<string, JobStatus>;
  activeJobId: string | null;

  // UI state
  selectedFormatId: string | null;
  showFormatSelector: boolean;

  // Actions
  setCurrentVideo: (video: VideoMetadata | null) => void;
  setCurrentUrl: (url: string) => void;
  setIsAnalyzing: (analyzing: boolean) => void;
  setAnalysisError: (error: string | null) => void;
  setSelectedFormat: (formatId: string | null) => void;
  setShowFormatSelector: (show: boolean) => void;
  addJob: (job: JobStatus) => void;
  updateJob: (jobId: string, updates: Partial<JobStatus>) => void;
  removeJob: (jobId: string) => void;
  setActiveJob: (jobId: string | null) => void;
  reset: () => void;
}

const initialState = {
  currentVideo: null,
  currentUrl: '',
  isAnalyzing: false,
  analysisError: null,
  jobs: new Map<string, JobStatus>(),
  activeJobId: null,
  selectedFormatId: null,
  showFormatSelector: false,
};

export const useVideoStore = create<VideoStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setCurrentVideo: (video) => set({ currentVideo: video, analysisError: null }),
      setCurrentUrl: (url) => set({ currentUrl: url }),
      setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
      setAnalysisError: (error) => set({ analysisError: error, isAnalyzing: false }),
      setSelectedFormat: (formatId) => set({ selectedFormatId: formatId }),
      setShowFormatSelector: (show) => set({ showFormatSelector: show }),

      addJob: (job) => set((state) => {
        const newJobs = new Map(state.jobs);
        newJobs.set(job.jobId, job);
        return { jobs: newJobs, activeJobId: job.jobId };
      }),

      updateJob: (jobId, updates) => set((state) => {
        const job = state.jobs.get(jobId);
        if (!job) return state;
        const newJobs = new Map(state.jobs);
        newJobs.set(jobId, { ...job, ...updates });
        return { jobs: newJobs };
      }),

      removeJob: (jobId) => set((state) => {
        const newJobs = new Map(state.jobs);
        newJobs.delete(jobId);
        return {
          jobs: newJobs,
          activeJobId: state.activeJobId === jobId ? null : state.activeJobId,
        };
      }),

      setActiveJob: (jobId) => set({ activeJobId: jobId }),

      reset: () => set(initialState),
    }),
    {
      name: 'video-downloader-store',
      partialize: (state) => ({
        currentUrl: state.currentUrl,
        // Don't persist jobs, video data, or UI state
      }),
    }
  )
);

// Selectors
export const useCurrentVideo = () => useVideoStore((state) => state.currentVideo);
export const useCurrentUrl = () => useVideoStore((state) => state.currentUrl);
export const useIsAnalyzing = () => useVideoStore((state) => state.isAnalyzing);
export const useAnalysisError = () => useVideoStore((state) => state.analysisError);
export const useSelectedFormatId = () => useVideoStore((state) => state.selectedFormatId);
export const useShowFormatSelector = () => useVideoStore((state) => state.showFormatSelector);
export const useJobs = () => useVideoStore((state) => Array.from(state.jobs.values()));
export const useActiveJob = () => useVideoStore((state) =>
  state.activeJobId ? state.jobs.get(state.activeJobId) || null : null
);
export const useJobById = (jobId: string) => useVideoStore((state) => state.jobs.get(jobId) || null);