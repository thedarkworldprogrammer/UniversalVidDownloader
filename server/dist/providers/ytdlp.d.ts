import { IProvider, BaseProvider } from './base';
import { VideoMetadata, VideoFormat, ExtractionResult, ProviderCapabilities } from '../types';
/**
 * yt-dlp provider - uses yt-dlp for extraction
 * Supports 1000+ sites through yt-dlp's extensive extractor library
 */
export declare class YtDlpProvider extends BaseProvider implements IProvider {
    readonly id = "ytdlp";
    readonly name = "yt-dlp Universal Extractor";
    readonly version = "1.0.0";
    readonly status: 'active' | 'deprecated' | 'broken' | 'maintenance';
    readonly supportedDomains: string[];
    readonly capabilities: ProviderCapabilities;
    private ytdlpPath;
    constructor();
    canHandle(url: string): boolean;
    analyze(url: string): Promise<ExtractionResult>;
    private extractMetadata;
    private parseMetadata;
    getFormats(metadata: VideoMetadata): VideoFormat[];
    getPlaybackSource(metadata: VideoMetadata, formatId: string): Promise<string>;
    download(metadata: VideoMetadata, formatId: string, _outputPath: string): Promise<string>;
    private extractDomain;
}
export declare const ytdlpProvider: YtDlpProvider;
//# sourceMappingURL=ytdlp.d.ts.map