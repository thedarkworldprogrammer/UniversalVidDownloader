declare module 'fluent-ffmpeg' {
  export function setFfmpegPath(path: string): void;
  export function setFfprobePath(path: string): void;
  export function ffmpeg(inputPath: string): FfmpegCommand;
}

declare module 'fluent-ffmpeg/core' {
  export class FfmpegCommand {
    audioCodec(codec: string): this;
    audioBitrate(bitrate: number | string): this;
    noVideo(): this;
    output(outputPath: string): this;
    on(event: 'start' | 'progress' | 'end' | 'error', handler: (...args: any[]) => void): this;
    run(): NodeJS.Process;
  }
}