declare module 'fluent-ffmpeg' {
  interface FfmpegCommand {
    audioCodec(codec: string): FfmpegCommand;
    audioBitrate(bitrate: number): FfmpegCommand;
    noVideo(): FfmpegCommand;
    output(path: string): FfmpegCommand;
    on(event: 'start', listener: () => void): FfmpegCommand;
    on(event: 'progress', listener: (progress: { percent?: number }) => void): FfmpegCommand;
    on(event: 'end', listener: () => void): FfmpegCommand;
    on(event: 'error', listener: (err: Error) => void): FfmpegCommand;
    run(): void;
  }

  function ffmpeg(input: string): FfmpegCommand;

  export = ffmpeg;
}