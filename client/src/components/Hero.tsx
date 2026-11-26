import { useState, FormEvent } from 'react';
import { Search, Loader2, Globe, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { useVideoStore } from '../store';
import { api } from '../services/api';
import { useTheme } from './ThemeProvider';

export function Hero() {
  const { theme } = useTheme();
  const { setCurrentUrl, setIsAnalyzing, setCurrentVideo, setAnalysisError, setShowFormatSelector } = useVideoStore();
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validateUrl = (input: string): boolean => {
    try {
      const parsed = new URL(input);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!url.trim()) {
      setSubmitError('Please enter a video URL');
      return;
    }

    if (!validateUrl(url)) {
      setSubmitError('Please enter a valid HTTP/HTTPS URL');
      return;
    }

    setIsSubmitting(true);
    setIsAnalyzing(true);
    setCurrentUrl(url);

    try {
      const response = await api.analyze(url);

      if (response.success && response.data) {
        setCurrentVideo(response.data);
        setShowFormatSelector(true);
        setSubmitError(null);
      } else {
        setSubmitError(response.error || 'Failed to analyze video');
        setAnalysisError(response.error || 'Failed to analyze video');
      }
    } catch (error: any) {
      const message = error?.error || error?.message || 'Analysis failed';
      setSubmitError(message);
      setAnalysisError(message);
    } finally {
      setIsSubmitting(false);
      setIsAnalyzing(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').trim();
    if (text && validateUrl(text)) {
      setUrl(text);
    }
  };

  return (
    <section className="relative py-20 lg:py-32 overflow-hidden" aria-labelledby="hero-heading">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-bg backdrop-blur-sm border border-white/20 dark:border-white/10 mb-8 animate-fade-in-up">
          <CheckCircle className="w-4 h-4 text-green-500" aria-hidden="true" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Completely Free • No Registration • 2000+ Sites Supported
          </span>
        </div>

        {/* Main Heading */}
        <h1 id="hero-heading" className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-white mb-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          Download Videos from{' '}
          <span className="bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Any Website
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 mb-10 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          Paste any video URL and get instant access to all available formats.
          No watermarks, no quality limits, no subscriptions - ever.
        </p>

        {/* URL Input Form */}
        <form onSubmit={handleSubmit} className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="relative max-w-3xl mx-auto">
            <label htmlFor="video-url" className="sr-only">
              Video URL
            </label>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
              <input
                id="video-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit(e as unknown as FormEvent)}
                placeholder="https://youtube.com/watch?v=... or any video URL"
                disabled={isSubmitting}
                className="w-full px-12 py-4 pl-12 text-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-50"
                aria-describedby={submitError ? 'url-error' : undefined}
                autoComplete="url"
                autoFocus
              />
              {isSubmitting ? (
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400"
                  disabled
                  aria-label="Analyzing video..."
                >
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors focus:ring-2 focus:ring-primary-500/50 focus:outline-none disabled:opacity-50"
                  aria-label="Analyze video"
                >
                  <Search className="w-5 h-5 inline-block" aria-hidden="true" />
                </button>
              )}
            </div>
            {submitError && (
              <p id="url-error" className="mt-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-center gap-1.5 animate-shake" role="alert">
                <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                {submitError}
              </p>
            )}
          </div>
        </form>

        {/* Trust indicators */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-400 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
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