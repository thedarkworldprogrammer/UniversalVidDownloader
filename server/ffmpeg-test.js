const ffmpegPath = require('ffmpeg-static');
console.log('ffmpeg-static path:', ffmpegPath);

const { execSync } = require('child_process');
try {
  const result = execSync(['"'+ffmpegPath+'"', '-version'].join(' '), { stdio: 'pipe' });
  console.log('FFmpeg is working');
  console.log(result.toString().split('\n')[0]);
} catch(e) {
  console.log('FFmpeg failed:', e.message);
}