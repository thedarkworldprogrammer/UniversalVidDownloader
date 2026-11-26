"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerRegistry = exports.ProviderRegistry = void 0;
/**
 * Provider registry - manages all available providers
 */
class ProviderRegistry {
    providers = new Map();
    domainMap = new Map(); // domain -> providerId
    /**
     * Register a provider
     */
    register(provider) {
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
    unregister(providerId) {
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
    get(providerId) {
        return this.providers.get(providerId);
    }
    /**
     * Find provider that can handle the URL
     */
    findProvider(url) {
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
        }
        catch {
            // Invalid URL
        }
        return undefined;
    }
    /**
     * Get all registered providers
     */
    getAll() {
        return Array.from(this.providers.values());
    }
    /**
     * Get provider info for all providers
     */
    getAllInfo() {
        return this.getAll().map((p) => p.getProviderInfo());
    }
    /**
     * Get active providers only
     */
    getActive() {
        return this.getAll().filter((p) => p.getProviderInfo().status === 'active');
    }
    /**
     * Get count of registered providers
     */
    size() {
        return this.providers.size;
    }
    /**
     * Check if a provider is registered
     */
    has(providerId) {
        return this.providers.has(providerId);
    }
}
exports.ProviderRegistry = ProviderRegistry;
// Singleton instance
exports.providerRegistry = new ProviderRegistry();
//# sourceMappingURL=registry.js.map