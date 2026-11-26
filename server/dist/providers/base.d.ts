import { VideoMetadata, VideoFormat, ProviderInfo, ProviderCapabilities, ExtractionResult } from '../types';
/**
 * Base provider interface - all providers must implement this
 */
export interface IProvider {
    readonly id: string;
    readonly name: string;
    readonly supportedDomains: string[];
    readonly capabilities: ProviderCapabilities;
    readonly version: string;
    readonly status: 'active' | 'deprecated' | 'broken' | 'maintenance';
    /**
     * Check if this provider can handle the given URL
     */
    canHandle(url: string): boolean;
    /**
     * Extract video metadata and formats from URL
     */
    analyze(url: string): Promise<ExtractionResult>;
    /**
     * Get available formats for the extracted metadata
     */
    getFormats(metadata: VideoMetadata): VideoFormat[];
    /**
     * Get direct playback URL for a format
     */
    getPlaybackSource(metadata: VideoMetadata, formatId: string): Promise<string>;
    /**
     * Download a specific format
     */
    download(metadata: VideoMetadata, formatId: string, outputPath: string): Promise<string>;
    /**
     * Get provider information
     */
    getProviderInfo(): ProviderInfo;
    /**
     * Validate if a format is available
     */
    validateFormat(metadata: VideoMetadata, formatId: string): boolean;
    /**
     * Sanitize filename for safe download
     */
    sanitizeFilename(filename: string): string;
}
/**
 * Abstract base class for providers
 */
export declare abstract class BaseProvider implements IProvider {
    abstract readonly id: string;
    abstract readonly name: string;
    abstract readonly supportedDomains: string[];
    abstract readonly capabilities: ProviderCapabilities;
    abstract readonly version: string;
    abstract readonly status: 'active' | 'deprecated' | 'broken' | 'maintenance';
    abstract canHandle(url: string): boolean;
    abstract analyze(url: string): Promise<ExtractionResult>;
    abstract getFormats(metadata: VideoMetadata): VideoFormat[];
    abstract getPlaybackSource(metadata: VideoMetadata, formatId: string): Promise<string>;
    abstract download(metadata: VideoMetadata, formatId: string, outputPath: string): Promise<string>;
    getProviderInfo(): ProviderInfo;
    validateFormat(metadata: VideoMetadata, formatId: string): boolean;
    sanitizeFilename(filename: string): string;
    /**
     * Normalize format data from extraction tools
     */
    protected normalizeFormat(raw: any): VideoFormat;
    /**
     * Check if format is playable in browser
     */
    protected isPlayableInBrowser(format: any): boolean;
}
//# sourceMappingURL=base.d.ts.map