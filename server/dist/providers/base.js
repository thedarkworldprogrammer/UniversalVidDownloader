"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseProvider = void 0;
/**
 * Abstract base class for providers
 */
class BaseProvider {
    getProviderInfo() {
        return {
            id: this.id,
            name: this.name,
            supportedDomains: this.supportedDomains,
            capabilities: this.capabilities,
            status: this.status,
            version: this.version,
        };
    }
    validateFormat(metadata, formatId) {
        return metadata.formats.some((f) => f.formatId === formatId);
    }
    sanitizeFilename(filename) {
        return filename
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/^\.+|\.+$/g, '')
            .substring(0, 200);
    }
    /**
     * Normalize format data from extraction tools
     */
    normalizeFormat(raw) {
        return {
            formatId: raw.format_id || raw.formatId || `${raw.ext}-${raw.height || 'unknown'}`,
            ext: raw.ext || 'unknown',
            resolution: raw.height ? `${raw.height}p` : raw.resolution,
            mimeType: raw.mimeType || raw.mime_type,
            hasAudio: raw.hasAudio ?? (raw.acodec !== 'none' && raw.acodec !== undefined),
            hasVideo: raw.hasVideo ?? (raw.vcodec !== 'none' && raw.vcodec !== undefined),
            filesize: raw.filesize || raw.filesize_approx,
            filesizeApprox: raw.filesize_approx || raw.filesize,
            vcodec: raw.vcodec,
            acodec: raw.acodec,
            fps: raw.fps,
            playable: this.isPlayableInBrowser(raw),
            downloadable: true,
            quality: raw.quality,
            bitrate: raw.tbr || raw.vbr,
            abr: raw.abr,
            vbr: raw.vbr,
            language: raw.language,
            container: raw.container,
        };
    }
    /**
     * Check if format is playable in browser
     */
    isPlayableInBrowser(format) {
        const browserPlayable = [
            'mp4',
            'webm',
            'ogg',
            'm4v',
        ];
        const ext = (format.ext || '').toLowerCase();
        const vcodec = (format.vcodec || '').toLowerCase();
        const acodec = (format.acodec || '').toLowerCase();
        // Check container
        if (!browserPlayable.includes(ext)) {
            return false;
        }
        // Check video codec
        if (format.hasVideo) {
            const supportedVideoCodecs = ['avc1', 'h264', 'vp8', 'vp9', 'av01', 'hev1', 'hvc1'];
            if (!supportedVideoCodecs.some((c) => vcodec.includes(c))) {
                return false;
            }
        }
        // Check audio codec
        if (format.hasAudio) {
            const supportedAudioCodecs = ['mp4a', 'aac', 'opus', 'vorbis', 'mp3'];
            if (!supportedAudioCodecs.some((c) => acodec.includes(c))) {
                return false;
            }
        }
        return true;
    }
}
exports.BaseProvider = BaseProvider;
//# sourceMappingURL=base.js.map