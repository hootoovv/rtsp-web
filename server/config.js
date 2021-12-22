const config = {
  listenPort: "8080",
  apiUrl: "/api",
  ffmpegPath: "d:/tools/ffmpeg.exe",
  ffmpegParams1: ['-fflags', '+genpts'],
  ffmpegParams2: ['-rtsp_transport', 'tcp', '-c', 'copy', '-f', 'hls', '-hls_time', '5.0', '-hls_list_size', '5', '-hls_wrap', '10', '-y'],
  checkInterval: 2, // interval for cleaning up dead channels, unit in seconds
  channelTimeout: 60, // unit in seconds
  trace: false
};

module.exports = config;