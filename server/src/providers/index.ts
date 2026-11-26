import { providerRegistry } from './registry';
import { ytdlpProvider } from './ytdlp';

/**
 * Initialize all providers
 */
export function initializeProviders(): void {
  providerRegistry.register(ytdlpProvider);

  // Add more providers here as they are implemented
  // providerRegistry.register(vimeoProvider);
  // providerRegistry.register(twitchProvider);
  // etc.

  console.log(`Initialized ${providerRegistry.size()} provider(s)`);
}

export { providerRegistry } from './registry';
export { IProvider, BaseProvider } from './base';
export { YtDlpProvider, ytdlpProvider } from './ytdlp';