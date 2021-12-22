# RTSP Web Server

View rtsp stream from browser.

## Keywords

RTSP, HLS, WebRTC, Mediasoup, FFmpeg, Vue3, Element-plus, Video.js

## Description

this is a web server which can support transcode (copy or re-encode) rtsp stream into hls stream or WebRTC realtime streaming.

### HLS mode

this web server will wrap an ffmpeg process to pull rtsp source stream and generate hls m3u8 and ts files.

HLS player has default 30s timeout (default restful heartbeat is 10s). if close playback, server will stop the hls in 30s, supervisor mode from channel list page will not activate the HLS watching session (won't trigger heartbeat).

### WebRTC mode

this web server will use mediasoup as WebRTC SFU, and start an ffmpeg process to publish RTSP stream into SFU via plainRTC. and front end will use mediasoup-client to work as consumer to playback the a/v. it use restful to communicate between client and server to co-ordinate mediasoup client and server's transport, producer and consumer.

RTC player has default 5s timeout. once player close and no any other watcher, the server will stop the ffmpeg producer in 5s.

## Install

this web app has 2 parts: frontend app and backend server. front end can be build into static webpage and put to server's static or root folder(need change server/index.js). since pkg seems cannot handle running mediasoup's worker binary in a sub-process, so suggest you npm run or distribute the server as docker image. Docker filer is not ready though.

For HLS, you can config ffmpeg params in the yml file to control if transcode a/v. default -c copy is not transcode. however this may need your source stream to be h264/h265 and aac. please check HLS TS supported codec.

## Source code

WebRTC need HTTPS, so change the frontend and backend to support HTTPS. you need put cert file under both side certs folder. to generate certs pem file:

```
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout privkey.pem -out fullchain.pem
```

### app

#### Install

```
yarn install
```

#### Debug

```
yarn serve
```

#### Release

···
yarn build
···

then copy everything under dist to server / folder.

### server

#### install

```
npm install
```

#### Release 

build the webserver into a single exe (on windows) with pkg.

```
npm run build
```

