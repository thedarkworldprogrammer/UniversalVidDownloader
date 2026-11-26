import { useState } from 'react';
import { ChevronDown, CheckCircle, AlertCircle, Info, Shield } from 'lucide-react';

const faqs = [
  {
    question: 'Is this service completely free?',
    answer: 'Yes! Universal Video Downloader is 100% free with no subscriptions, paywalls, registration requirements, watermarks, or quality restrictions. We believe video downloading should be accessible to everyone.',
    icon: CheckCircle,
  },
  {
    question: 'Which websites are supported?',
    answer: 'We support 2000+ websites through yt-dlp, including YouTube, Vimeo, Twitter/X, TikTok, Instagram, Facebook, Twitch, Reddit, SoundCloud, Bilibili, and thousands more. Just paste any video URL - if yt-dlp supports it, we do too!',
    icon: Info,
  },
  {
    question: 'Do I need to create an account?',
    answer: 'No registration or account creation is required. Simply paste a URL and start downloading. We don\'t collect any personal data or track your usage.',
    icon: CheckCircle,
  },
  {
    question: 'Is there a limit on video quality?',
    answer: 'No quality limits whatsoever. You can download in any available resolution from 144p up to 8K, depending on what the source video offers. All formats (video+audio, video-only, audio-only) are available.',
    icon: CheckCircle,
  },
  {
    question: 'Can I extract audio only?',
    answer: 'Yes! You can extract audio as M4A (AAC) or MP3 formats. This is perfect for saving music, podcasts, or audio from any video. The conversion happens server-side using FFmpeg.',
    icon: Info,
  },
  {
    question: 'Is my privacy protected?',
    answer: 'Absolutely. We don\'t store your IP address, download history, or any personal information. Files are processed temporarily and automatically deleted after 24 hours. No logs, no tracking, no analytics.',
    icon: Shield,
  },
  {
    question: 'Are there any download limits?',
    answer: 'We implement reasonable rate limiting (10 analyses/minute, 5 downloads/minute) to prevent abuse and ensure fair usage for everyone. There are no daily/monthly limits on the number of videos you can download.',
    icon: AlertCircle,
  },
  {
    question: 'Is downloading videos legal?',
    answer: 'This tool is for personal use only. You should respect copyright laws and the terms of service of content providers. Downloading copyrighted content without permission may violate intellectual property rights. We are not responsible for content downloaded using this tool.',
    icon: AlertCircle,
  },
  {
    question: 'What formats are available for download?',
    answer: 'Available formats depend on the source video but typically include: MP4 (H.264/H.265), WebM (VP8/VP9/AV1), M4A (AAC audio), MP3 audio. You\'ll see all available options with file sizes, resolutions, and codecs before downloading.',
    icon: Info,
  },
  {
    question: 'How long do downloads take?',
    answer: 'Analysis typically takes 2-10 seconds. Download speed depends on the video size, your connection, and server load. Progress is shown in real-time. Large files (4K/8K) may take longer to process and download.',
    icon: Info,
  },
  {
    question: 'Can I download private or age-restricted videos?',
    answer: 'Only publicly accessible videos can be downloaded. Private, age-restricted, geo-blocked, or login-required content cannot be accessed without authentication, which we don\'t support for privacy reasons.',
    icon: AlertCircle,
  },
  {
    question: 'Is the source code available?',
    answer: 'Yes! Universal Video Downloader is open source. Check out our GitHub repository for the complete source code, issue tracking, and contribution guidelines. Community contributions are welcome!',
    icon: Info,
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 lg:py-28 bg-slate-50 dark:bg-slate-900/50" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 id="faq-heading" className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            Everything you need to know about Universal Video Downloader
          </p>
        </div>

        <div className="space-y-4" role="list">
          {faqs.map((faq, index) => (
            <details
              key={index}
              className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
              open={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            >
              <summary
                className="flex items-center gap-4 p-5 cursor-pointer list-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-800"
                aria-expanded={openIndex === index}
              >
                <div className="flex-shrink-0 p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                  <faq.icon className="w-5 h-5 text-primary-600 dark:text-primary-400" aria-hidden="true" />
                </div>
                <h3 className="flex-1 font-medium text-slate-900 dark:text-white text-left">
                  {faq.question}
                </h3>
                <ChevronDown
                  className="flex-shrink-0 w-5 h-5 text-slate-400 transition-transform duration-200 group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <div className="px-5 pb-5 pt-0 animate-slide-down">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </details>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Still have questions? Check our{' '}
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline">
              GitHub Discussions
            </a>
            {' '}or open an issue.
          </p>
        </div>
      </div>
    </section>
  );
}