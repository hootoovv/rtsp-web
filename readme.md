# RTSP Web Server

View rtsp stream from browser. 

## Keywords

RTSP, HLS, WebRTC, Mediasoup, FFmpeg, Vue3, Element-plus, Video.js

## Description

this is a web server which can support transcode (copy or re-encode) rtsp stream into hls stream or WebRTC realtime streaming. it is easy to add MpegDash mode (samilar as HLS). for HLS, normally it can copy source stream. for WebRtc, normally it need transcode, means take your webserver's cpu, you also can change ffmpeg params to support QSV or NvEnc HW encode.

### HLS mode

this web server will wrap an ffmpeg process to pull rtsp source stream and generate hls m3u8 and ts files.

HLS player has default 30s timeout (default restful heartbeat is 10s). if close playback, server will stop the hls in 30s, supervisor mode from channel list page will not activate the HLS watching session (won't trigger heartbeat).

For HLS, you can config ffmpeg params in the yml file to control if transcode a/v. default -c copy is not transcode. however this may need your source stream to be h264/h265 and aac. please check HLS TS supported codec.

### WebRTC mode

this web server will use mediasoup as WebRTC SFU, and start an ffmpeg process to publish RTSP stream into SFU via plainRTC. and front end will use mediasoup-client to work as consumer to playback the a/v. it use restful to communicate between client and server to co-ordinate mediasoup client and server's transport, producer and consumer.

RTC player has default 5s timeout. once player close and no any other watcher, the server will stop the ffmpeg producer in 5s.

## Build and Install

this web app has 2 parts: frontend app and backend server. front end can be build into static webpage and put to server's static folder. since pkg seems cannot handle running mediasoup's worker binary in a sub-process, so suggest you npm run or distribute the server as docker image.

### mediasoup on Windows10

install VS2009 with C++ support
install python 3.x
pip install meson ninja
get nsam.exe and put it to your %path%
install MinGW with MSYS and add msys bin into %path%
copy cp.exe to copy.exe (under MinGW/msys/1.0/bin folder)
prepare follow env variable:

```
set PYTHON=your_python_exe_path
"C:\Program Files (x86)\Microsoft Visual Studio\2019\Community\VC\Auxiliary\Build\vcvars64.bat"
```

you are ready to go: npm i

during the installation process it will download some source code from Internet, if you got bad luck, try to download them manually (node_modules\mediasoup\worker\subprojects\, open all wrap file and download each file listed and then put into packagecache folder). each time, when you make worker report cannot find meson.build in a folder, you clean all the source code folder under above subproejcts folder (keep packagefiles and packagecache ). it will extract and build from packagecache folder's tgz files.


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

