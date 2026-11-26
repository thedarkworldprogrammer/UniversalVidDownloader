import { IProvider } from './base';
import { ProviderInfo } from '../types';

/**
 * Provider registry - manages all available providers
 */
export class ProviderRegistry {
  private providers: Map<string, IProvider> = new Map();
  private domainMap: Map<string, string> = new Map(); // domain -> providerId

  /**
   * Register a provider
   */
  register(provider: IProvider): void {
    if (this.providers.has(provider.id)) {
      console.warn(`Provider ${provider.id} already registered, overwriting`);
    }

    this.providers.set(provider.id, provider);

    // Map domains to provider
    for (const domain of provider.supportedDomains) {
      this.domainMap.set(domain.toLowerCase(), provider.id);
    }

    console.log(`Registered provider: ${provider.name} (${provider.id})`);
  }

  /**
   * Unregister a provider
   */
  unregister(providerId: string): void {
    const provider = this.providers.get(providerId);
    if (provider) {
      for (const domain of provider.supportedDomains) {
        this.domainMap.delete(domain.toLowerCase());
      }
      this.providers.delete(providerId);
      console.log(`Unregistered provider: ${providerId}`);
    }
  }

  /**
   * Get provider by ID
   */
  get(providerId: string): IProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Find provider that can handle the URL
   */
  findProvider(url: string): IProvider | undefined {
    try {
      const domain = new URL(url).hostname.toLowerCase().replace(/^www\./, '');

      // Direct domain match
      const providerId = this.domainMap.get(domain);
      if (providerId) {
        const provider = this.providers.get(providerId);
        if (provider && provider.canHandle(url)) {
          return provider;
        }
      }

      // Fallback: check all providers
      for (const provider of this.providers.values()) {
        if (provider.canHandle(url)) {
          return provider;
        }
      }
    } catch {
      // Invalid URL
    }

    return undefined;
  }

  /**
   * Get all registered providers
   */
  getAll(): IProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get provider info for all providers
   */
  getAllInfo(): ProviderInfo[] {
    return this.getAll().map((p) => p.getProviderInfo());
  }

  /**
   * Get active providers only
   */
  getActive(): IProvider[] {
    return this.getAll().filter((p) => p.getProviderInfo().status === 'active');
  }

  /**
   * Get count of registered providers
   */
  size(): number {
    return this.providers.size;
  }

  /**
   * Check if a provider is registered
   */
  has(providerId: string): boolean {
    return this.providers.has(providerId);
  }
}

// Singleton instance
export const providerRegistry = new ProviderRegistry();