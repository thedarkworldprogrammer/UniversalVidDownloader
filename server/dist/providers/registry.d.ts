import { IProvider } from './base';
import { ProviderInfo } from '../types';
/**
 * Provider registry - manages all available providers
 */
export declare class ProviderRegistry {
    private providers;
    private domainMap;
    /**
     * Register a provider
     */
    register(provider: IProvider): void;
    /**
     * Unregister a provider
     */
    unregister(providerId: string): void;
    /**
     * Get provider by ID
     */
    get(providerId: string): IProvider | undefined;
    /**
     * Find provider that can handle the URL
     */
    findProvider(url: string): IProvider | undefined;
    /**
     * Get all registered providers
     */
    getAll(): IProvider[];
    /**
     * Get provider info for all providers
     */
    getAllInfo(): ProviderInfo[];
    /**
     * Get active providers only
     */
    getActive(): IProvider[];
    /**
     * Get count of registered providers
     */
    size(): number;
    /**
     * Check if a provider is registered
     */
    has(providerId: string): boolean;
}
export declare const providerRegistry: ProviderRegistry;
//# sourceMappingURL=registry.d.ts.map