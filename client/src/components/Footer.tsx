import { Link } from 'react-router-dom';
import { Github, Heart, Shield, Globe, Info, AlertTriangle } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { label: 'Supported Sites', href: '/#platforms' },
      { label: 'Features', href: '/#features' },
      { label: 'FAQ', href: '/#faq' },
      { label: 'Changelog', href: 'https://github.com' },
    ],
    legal: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'DMCA', href: '/dmca' },
      { label: 'Disclaimer', href: '/disclaimer' },
    ],
    community: [
      { label: 'GitHub', href: 'https://github.com', external: true },
      { label: 'Issues', href: 'https://github.com/issues', external: true },
      { label: 'Discussions', href: 'https://github.com/discussions', external: true },
      { label: 'Contributing', href: 'https://github.com/contributing', external: true },
    ],
  };

  const features = [
    { icon: Shield, label: 'No Ads or Tracking', desc: 'Completely free, no subscriptions, no registration required' },
    { icon: Globe, label: '2000+ Sites Supported', desc: 'YouTube, Vimeo, Twitter, TikTok, and thousands more' },
    { icon: Heart, label: 'Privacy First', desc: 'No data collection, temporary processing only' },
    { icon: Info, label: 'Open Source', desc: 'Transparent code, community-driven development' },
  ];

  const disclaimers = [
    'This tool is for personal use only. Respect copyright laws and terms of service of content providers.',
    'Downloading copyrighted content without permission may violate intellectual property rights.',
    'We are not responsible for content downloaded using this tool. Use at your own risk.',
  ];

  return (
    <footer className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="flex flex-col gap-3 p-4 rounded-xl glass-bg backdrop-blur-sm">
                <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 w-fit">
                  <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" aria-hidden="true" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{feature.label}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{feature.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Product Links */}
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Product</h3>
            <ul className="space-y-2">
              {footerLinks.product.map((link, index) => (
                <li key={index}>
                  <Link
                    to={link.href}
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Legal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link, index) => (
                <li key={index}>
                  <Link
                    to={link.href}
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community Links */}
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Community</h3>
            <ul className="space-y-2">
              {footerLinks.community.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noopener noreferrer' : undefined}
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-1"
                  >
                    {link.label}
                    {link.external && (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-8 mb-8">
          <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" aria-hidden="true" />
            Important Disclaimers
          </h4>
          <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
            {disclaimers.map((disclaimer, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600" aria-hidden="true" />
                {disclaimer}
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-500">
          <p>
            © {currentYear} Universal Video Downloader. Built with{' '}
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
              open source
            </a>
            {' '}software.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              aria-label="GitHub"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}