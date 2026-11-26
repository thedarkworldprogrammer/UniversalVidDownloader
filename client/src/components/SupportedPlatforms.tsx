import { useVideoStore } from '../store';
import { api } from '../services/api';
import { useEffect, useState } from 'react';
import { Globe, Loader2, CheckCircle, MoreHorizontal } from 'lucide-react';

const popularPlatforms = [
  { name: 'YouTube', domain: 'youtube.com', icon: '🎬', color: 'bg-red-500' },
  { name: 'Vimeo', domain: 'vimeo.com', icon: '📹', color: 'bg-blue-500' },
  { name: 'Twitter/X', domain: 'twitter.com', icon: '🐦', color: 'bg-slate-800' },
  { name: 'TikTok', domain: 'tiktok.com', icon: '🎵', color: 'bg-pink-500' },
  { name: 'Instagram', domain: 'instagram.com', icon: '📸', color: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500' },
  { name: 'Facebook', domain: 'facebook.com', icon: '👍', color: 'bg-blue-600' },
  { name: 'Twitch', domain: 'twitch.tv', icon: '🎮', color: 'bg-purple-600' },
  { name: 'Reddit', domain: 'reddit.com', icon: '🤖', color: 'bg-orange-500' },
  { name: 'Dailymotion', domain: 'dailymotion.com', icon: '📺', color: 'bg-indigo-500' },
  { name: 'SoundCloud', domain: 'soundcloud.com', icon: '🎧', color: 'bg-orange-500' },
  { name: 'Bilibili', domain: 'bilibili.com', icon: '📺', color: 'bg-pink-400' },
  { name: 'NicoNico', domain: 'nicovideo.jp', icon: '🎥', color: 'bg-green-500' },
];

const categories = [
  { name: 'Video Platforms', sites: ['YouTube', 'Vimeo', 'Dailymotion', 'Twitch', 'Bilibili', 'NicoNico', 'Veoh', 'Metacafe'] },
  { name: 'Social Media', sites: ['Twitter/X', 'Instagram', 'Facebook', 'TikTok', 'Reddit', 'LinkedIn', 'Pinterest', 'Tumblr'] },
  { name: 'Music & Audio', sites: ['SoundCloud', 'Bandcamp', 'Mixcloud', 'Audiomack', 'Spotify (podcasts)', 'Apple Music (previews)'] },
  { name: 'News & Education', sites: ['TED', 'Khan Academy', 'Coursera', 'edX', 'MIT OpenCourseWare', 'BBC', 'CNN', 'NYTimes'] },
  { name: 'Adult Sites', sites: ['Pornhub', 'XVideos', 'XHamster', 'RedTube', 'YouPorn', 'ManyVids', 'OnlyFans (public)'] },
  { name: 'Other', sites: ['Archive.org', 'Facebook Watch', 'IGTV', 'Periscope', 'Streamable', 'Gfycat', 'Imgur', 'VK'] },
];

export function SupportedPlatforms() {
  const store = useVideoStore() as any;
  const [localProviders, setLocalProviders] = useState<any[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);

  const providers =
    Array.isArray(store.providers) && store.providers.length > 0
      ? store.providers
      : localProviders;

  useEffect(() => {
    setMounted(true);
    loadProviders();
  }, []);

  const loadProviders = async () => {
    setIsLoadingProviders(true);
    try {
      const response = await api.getProviders();
      if (response.success && response.data) {
        const list = Array.isArray(response.data)
          ? response.data
          : (response.data as any).providers || [];
        setLocalProviders(list);
        if (typeof store.setProviders === 'function') {
          store.setProviders(list);
        }
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
    } finally {
      setIsLoadingProviders(false);
    }
  };

  const allPlatforms = [
    ...popularPlatforms,
    ...categories.flatMap(c => c.sites.filter(s => !popularPlatforms.find(p => p.name === s)).map(s => ({ name: s, domain: '', icon: '🌐', color: 'bg-slate-500' })))
  ];

  const displayPlatforms = showAll ? allPlatforms : popularPlatforms;

  return (
    <section id="platforms" className="py-20 lg:py-28 bg-slate-50 dark:bg-slate-900/50" aria-labelledby="platforms-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 id="platforms-heading" className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            2000+ Sites Supported
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Our modular provider architecture supports thousands of websites out of the box.
            Popular platforms are listed below - if you don't see yours, just paste the URL and try!
          </p>
        </div>

        {/* Popular Platforms Grid */}
        <div className="mb-12">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-6 text-center">
            Most Popular Platforms
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {displayPlatforms.slice(0, showAll ? undefined : 12).map((platform, index) => (
              <button
                key={index}
                className="group relative flex flex-col items-center gap-3 p-5 rounded-2xl glass-bg backdrop-blur-sm border border-slate-200 dark:border-slate-700 hover:border-primary-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/10"
                onClick={() => {
                  // Could set URL in input here
                }}
                aria-label={`Download from ${platform.name}`}
              >
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${platform.color} group-hover:scale-110 transition-transform`}>
                  {platform.icon}
                </div>
                <span className="font-medium text-slate-900 dark:text-white text-center text-sm leading-tight">
                  {platform.name}
                </span>
              </button>
            ))}
          </div>

          {!showAll && (
            <div className="text-center mt-8">
              <button
                onClick={() => setShowAll(true)}
                className="inline-flex items-center gap-2 px-6 py-3 text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors"
              >
                <MoreHorizontal className="w-5 h-5" aria-hidden="true" />
                Show All Platforms & Categories
              </button>
            </div>
          )}
        </div>

        {/* Categories - Only show when showAll is true */}
        {showAll && (
          <div className="space-y-12" id="all-platforms">
            {categories.map((category, catIndex) => (
              <div key={catIndex} className="animate-fade-in-up">
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary-500" aria-hidden="true" />
                  {category.name}
                </h4>
                <div className="flex flex-wrap gap-3">
                  {category.sites.map((site, siteIndex) => (
                    <span
                      key={siteIndex}
                      className="px-4 py-2 rounded-full glass-bg backdrop-blur-sm border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 hover:border-primary-500/50 hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer"
                    >
                      {site}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            <div className="text-center mt-8 pt-8 border-t border-slate-200 dark:border-slate-800">
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Don't see your site? Just paste any video URL above - yt-dlp supports <strong>1000+ sites</strong> automatically!
              </p>
              <button
                onClick={() => setShowAll(false)}
                className="inline-flex items-center gap-2 px-6 py-3 text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors"
              >
                <MoreHorizontal className="w-5 h-5" aria-hidden="true" />
                Show Less
              </button>
            </div>
          </div>
        )}

        {/* Provider Status */}
        {mounted && (
          <div className="mt-16 pt-8 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-6 text-center">
              Active Providers
            </h3>
            {isLoadingProviders ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" aria-hidden="true" />
              </div>
            ) : Array.isArray(providers) && providers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {providers.map((provider) => (
                  <div
                    key={provider.id}
                    className="p-4 rounded-xl glass-bg backdrop-blur-sm border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-slate-900 dark:text-white capitalize">
                        {provider.id}
                      </h4>
                      <CheckCircle className="w-5 h-5 text-green-500" aria-label="Provider active" />
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {provider.supportedDomains?.join(', ') || 'Multiple domains'}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
                      <span className={`px-2 py-0.5 rounded ${provider.requiresAuth ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'}`}>
                        {provider.requiresAuth ? 'Auth Required' : 'Public'}
                      </span>
                      <span className={`px-2 py-0.5 rounded ${provider.supportsAudioOnly ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400'}`}>
                        {provider.supportsAudioOnly ? 'Audio Extraction' : 'Video Only'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-600 dark:text-slate-400 py-8">
                Provider information will appear here after loading.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}