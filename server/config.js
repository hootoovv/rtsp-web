const config = {
  listenPort: '8080',
  listenSslPort: '8443',
  apiUrl: '/api',
  ffmpegPath: 'd:/tools/ffmpeg.exe',
  checkInterval: 2, // interval for cleaning up dead channels, unit in seconds
  channelTimeout: 60, // unit in seconds
  consumerTimeout: 5, // room consumer idle timeout, unit in seconds
  trace: false,
  hls: {
    ffmpegParams1: ['-fflags', '+genpts'],
    ffmpegParams2: ['-rtsp_transport', 'tcp', '-c', 'copy', '-f', 'hls', '-hls_time', '5.0', '-hls_list_size', '5', '-hls_wrap', '10', '-y'],
  },
  tls: {
    sslCrt: './certs/fullchain.pem',
    sslKey: './certs/privkey.pem',
  },
  rtc: {
    ffmpegParams1: ['-fflags', '+genpts'],
    ffmpegParams2: ['-rtsp_transport', 'tcp', '-map', '0:a:0', '-acodec', 'libopus', '-ab', '128k', '-ac', '2', '-ar', '48000', '-map', '0:v:0', '-pix_fmt', 'yuv420p', '-c:v', 'libvpx', '-b:v', '1000k', '-deadline', 'realtime', '-f', 'tee'],
    // Worker settings
    worker: {
      rtcMinPort: 10000,
      rtcMaxPort: 10100,
      logLevel: 'warn',
      logTags: [
        'info',
        'ice',
        'dtls',
        'rtp',
        'srtp',
        'rtcp',
        // 'rtx',
        // 'bwe',
        // 'score',
        // 'simulcast',
        // 'svc'
      ],
    },
    // Router settings
    router: {
      mediaCodecs:
      [
        {
          kind      : 'audio',
          mimeType  : 'audio/opus',
          clockRate : 48000,
          channels  : 2
        },
        {
          kind       : 'video',
          mimeType   : 'video/VP8',
          clockRate  : 90000,
          parameters :
          {
            'x-google-start-bitrate' : 1000
          }
        },
        {
          kind       : 'video',
          mimeType   : 'video/VP9',
          clockRate  : 90000,
          parameters :
          {
            'profile-id'             : 2,
            'x-google-start-bitrate' : 1000
          }
        },
        {
          kind       : 'video',
          mimeType   : 'video/h264',
          clockRate  : 90000,
          parameters :
          {
            'packetization-mode'      : 1,
            'profile-level-id'        : '4d0032',
            'level-asymmetry-allowed' : 1,
            'x-google-start-bitrate'  : 1000
          }
        },
        {
          kind       : 'video',
          mimeType   : 'video/h264',
          clockRate  : 90000,
          parameters :
          {
            'packetization-mode'      : 1,
            'profile-level-id'        : '42e01f',
            'level-asymmetry-allowed' : 1,
            'x-google-start-bitrate'  : 1000
          }
        }
      ]
    },
		// mediasoup WebRtcTransport options for WebRTC endpoints (mediasoup-client,
		// libmediasoupclient).
		// See https://mediasoup.org/documentation/v3/mediasoup/api/#WebRtcTransportOptions
		webRtcTransportOptions :
		{
			listenIps :
			[
				{
					ip          : process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0',
					announcedIp : process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1'
				}
			],
			initialAvailableOutgoingBitrate : 1000000,
			minimumAvailableOutgoingBitrate : 600000,
			maxSctpMessageSize              : 262144,
			// Additional options that are not part of WebRtcTransportOptions.
			maxIncomingBitrate              : 1500000
		},
		// mediasoup PlainTransport options for legacy RTP endpoints (FFmpeg,
		// GStreamer).
		// See https://mediasoup.org/documentation/v3/mediasoup/api/#PlainTransportOptions
		plainTransportOptions :
		{
			listenIp :
			{
				ip          : process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0',
				announcedIp : process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1'
			},
			maxSctpMessageSize : 262144
		}
  }
};

module.exports = config;