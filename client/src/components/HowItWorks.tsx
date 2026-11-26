import { ArrowRight, Search, List, Download, Play, CheckCircle2, Zap, Shield, Clock } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Paste URL',
    description: 'Copy any video URL from 2000+ supported sites and paste it into the input field above.',
    details: 'Supports YouTube, Vimeo, Twitter, TikTok, Instagram, Facebook, Twitch, Reddit, and thousands more.'
  },
  {
    number: '02',
    icon: List,
    title: 'Analyze Formats',
    description: 'Our backend extracts all available formats using yt-dlp - no quality restrictions or watermarks.',
    details: 'Get video+audio, video-only, audio-only formats in multiple resolutions from 144p to 8K.'
  },
  {
    number: '03',
    icon: Play,
    title: 'Preview & Select',
    description: 'Watch a preview in the browser and pick your preferred format, resolution, and codec.',
    details: 'See file sizes, durations, and codec info before downloading. Audio extraction to M4A/MP3 available.'
  },
  {
    number: '04',
    icon: Download,
    title: 'Download',
    description: 'Start the download with real-time progress tracking. Files are processed server-side securely.',
    details: 'Background processing with BullMQ queue. Automatic cleanup after 24 hours. No tracking or logs kept.'
  },
];

const features = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Optimized extraction with yt-dlp and parallel processing for maximum speed.'
  },
  {
    icon: Shield,
    title: 'Security First',
    description: 'SSRF protection, rate limiting, private IP blocking, and no shell injection vulnerabilities.'
  },
  {
    icon: Clock,
    title: 'Privacy Focused',
    description: 'No registration, no tracking, temporary processing only, automatic file cleanup after 24 hours.'
  },
  {
    icon: CheckCircle2,
    title: 'Completely Free',
    description: 'No subscriptions, no paywalls, no watermarks, no quality limits - forever free and open source.'
  },
];

export function HowItWorks() {
  return (
    <section id="features" className="py-20 lg:py-28 bg-white dark:bg-slate-900" aria-labelledby="how-it-works-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 id="how-it-works-heading" className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            How It Works
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Four simple steps to download any video. No complexity, no compromises.
          </p>
        </div>

        {/* Steps */}
        <div className="relative mb-20">
          {/* Connecting line */}
          <div className="hidden lg:block absolute left-1/2 top-16 bottom-16 w-0.5 bg-gradient-to-b from-primary-500 to-purple-500 -translate-x-1/2" />

          <div className="space-y-16">
            {steps.map((step, index) => {
              const isEven = index % 2 === 0;
              return (
                <div
                  key={index}
                  className={`flex items-start gap-8 lg:gap-12 animate-fade-in-up ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'}`}
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  {/* Step Number & Icon */}
                  <div className={`flex-shrink-0 w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl lg:text-3xl shadow-lg shadow-primary-500/25 z-10 ${isEven ? 'ml-auto' : 'mr-auto'}`}>
                    {step.number}
                  </div>

                  {/* Content */}
                  <div className={`flex-1 lg:w-1/2 p-6 lg:p-8 rounded-2xl glass-bg backdrop-blur-sm border border-slate-200 dark:border-slate-700 ${isEven ? 'lg:mr-20' : 'lg:ml-20'}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                        <step.icon className="w-6 h-6 text-primary-600 dark:text-primary-400" aria-hidden="true" />
                      </div>
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{step.title}</h3>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 mb-3">{step.description}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{step.details}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Key Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-2xl glass-bg backdrop-blur-sm border border-slate-200 dark:border-slate-700 hover:border-primary-500/50 transition-all duration-300 animate-fade-in-up"
              style={{ animationDelay: `${(steps.length + index) * 100}ms` }}
            >
              <div className="p-3 rounded-xl bg-primary-100 dark:bg-primary-900/30 w-fit mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6 text-primary-600 dark:text-primary-400" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}