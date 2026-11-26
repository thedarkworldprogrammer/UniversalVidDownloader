import { useState } from 'react';
import { Moon, Sun, Monitor, Save, Loader2, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useVideoStore } from '../store';
import { api } from '../services/api';

export function SettingsPage() {
  const { theme, setTheme, isLoadingProviders, providers, setProviders } = useVideoStore();
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [mounted, setMounted] = useState(false);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    setSaveStatus('idle');
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    // Settings are already saved to localStorage via the store
    // This is just for visual feedback
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);
    setSaveStatus('success');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleRefreshProviders = async () => {
    try {
      const response = await api.getProviders();
      if (response.success && response.data) {
        setProviders(response.data.providers || []);
      }
    } catch (error) {
      console.error('Failed to refresh providers:', error);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Settings</h1>
        <p className="text-slate-600 dark:text-slate-400">Customize your Universal Video Downloader experience</p>
      </div>

      {/* Appearance Section */}
      <section className="mb-8 p-6 rounded-2xl glass-bg backdrop-blur-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
            <Monitor className="w-5 h-5 text-primary-600 dark:text-primary-400" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Appearance</h2>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Theme
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['light', 'dark', 'system'] as const).map((themeOption) => (
                <button
                  key={themeOption}
                  onClick={() => handleThemeChange(themeOption)}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                    theme === themeOption
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700'
                  }`}
                >
                  {themeOption === 'light' && <Sun className="w-6 h-6" aria-hidden="true" />}
                  {themeOption === 'dark' && <Moon className="w-6 h-6" aria-hidden="true" />}
                  {themeOption === 'system' && <Monitor className="w-6 h-6" aria-hidden="true" />}
                  <span className="font-medium text-slate-900 dark:text-white capitalize">
                    {themeOption}
                  </span>
                  {theme === themeOption && (
                    <CheckCircle className="w-5 h-5 text-primary-500" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              System setting follows your OS preference. Changes apply immediately.
            </p>
          </div>
        </div>
      </section>

      {/* Providers Section */}
      <section className="mb-8 p-6 rounded-2xl glass-bg backdrop-blur-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Providers</h2>
          </div>
          <button
            onClick={handleRefreshProviders}
            disabled={isLoadingProviders}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <Loader2 className={`w-4 h-4 ${isLoadingProviders ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
        </div>

        <div className="space-y-4">
          {mounted && (
            <>
              {isLoadingProviders ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-500" aria-hidden="true" />
                </div>
              ) : providers.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {providers.map((provider) => (
                    <div
                      key={provider.id}
                      className="p-4 rounded-xl glass-bg backdrop-blur-sm border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-slate-900 dark:text-white capitalize">
                          {provider.id}
                        </h3>
                        <CheckCircle className="w-5 h-5 text-green-500" aria-label="Provider active" />
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                        {provider.supportedDomains?.join(', ') || 'Multiple domains'}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className={`px-2 py-0.5 rounded ${
                          provider.requiresAuth
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {provider.requiresAuth ? 'Auth Required' : 'Public'}
                        </span>
                        <span className={`px-2 py-0.5 rounded ${
                          provider.supportsAudioOnly
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                            : 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400'
                        }`}>
                          {provider.supportsAudioOnly ? 'Audio Extraction' : 'Video Only'}
                        </span>
                        {provider.supportsLive && (
                          <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            Live Streams
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-600 dark:text-slate-400 py-8">
                  No providers loaded. Click Refresh to load provider information.
                </p>
              )}
            </>
          )}
        </div>
      </section>

      {/* Privacy & Data Section */}
      <section className="mb-8 p-6 rounded-2xl glass-bg backdrop-blur-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <AlertCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Privacy & Data</h2>
        </div>

        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <Info className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-medium text-slate-900 dark:text-white mb-1">No Personal Data Collected</p>
              <p>We don't store IP addresses, download history, or any personally identifiable information.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <Info className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-medium text-slate-900 dark:text-white mb-1">Temporary Processing Only</p>
              <p>Files are processed in memory and temporary storage, automatically deleted after 24 hours.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <Info className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-medium text-slate-900 dark:text-white mb-1">No Tracking or Analytics</p>
              <p>No cookies, no analytics, no third-party tracking. Your downloads are your business.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <Info className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-medium text-slate-900 dark:text-white mb-1">Open Source</p>
              <p>Full source code available on GitHub. Transparent, auditable, community-driven.</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="p-6 rounded-2xl glass-bg backdrop-blur-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">About</h2>
        </div>

        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
          <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
            <span>Version</span>
            <span className="font-mono text-slate-900 dark:text-white">1.0.0</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
            <span>Built With</span>
            <span className="font-mono text-slate-900 dark:text-white">MERN Stack + TypeScript</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
            <span>Extractor</span>
            <span className="font-mono text-slate-900 dark:text-white">yt-dlp</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
            <span>Queue</span>
            <span className="font-mono text-slate-900 dark:text-white">BullMQ + Redis</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
            <span>Media Processing</span>
            <span className="font-mono text-slate-900 dark:text-white">FFmpeg / FFprobe</span>
          </div>
          <div className="flex justify-between py-2">
            <span>License</span>
            <span className="font-mono text-slate-900 dark:text-white">MIT</span>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Universal Video Downloader is completely free and open source.
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 dark:text-primary-400 hover:underline"
            >
              GitHub Repository
            </a>
            <a
              href="https://github.com/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 dark:text-primary-400 hover:underline"
            >
              Report Issue
            </a>
            <a
              href="https://github.com/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 dark:text-primary-400 hover:underline"
            >
              Discussions
            </a>
          </div>
        </div>
      </section>

      {/* Save Status Toast */}
      {saveStatus === 'success' && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500 text-white shadow-lg">
            <CheckCircle className="w-5 h-5" aria-hidden="true" />
            <span>Settings saved successfully</span>
          </div>
        </div>
      )}
    </div>
  );
}