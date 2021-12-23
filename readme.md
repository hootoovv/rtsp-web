# Web Server for watching RTSP video

View rtsp stream from browser.

## Keywords

RTSP, HLS, WebRTC, Mediasoup, FFmpeg, Vue3, Element-plus, Video.js

## Description

This is a web server which can support transcode (copy or re-encode) rtsp stream into HLS streaming or WebRTC realtime streaming. It is easy to add MpegDASH suport (samilar to HLS).

* For HLS, normally it can just copy source stream.
* For WebRtc, normally it need realtime transcode, means take your webserver's cpu, you also can change ffmpeg params to support QSV or NvEnc HW acc.

### HLS mode

This web server will wrap an ffmpeg process to pull rtsp source stream and generate hls m3u8 and ts files.

HLS player has default 30s timeout (default restful heartbeat is 10s). If close playback, server will stop the hls in 30s, supervisor mode from channel list page will not activate the HLS watching session (won't trigger heartbeat).

For HLS, you can config ffmpeg params in the yml file to control if transcode a/v. Default '-c copy' is not transcode. However it depends your source stream to be h264/h265 and aac. Please check HLS TS supported codec.

### WebRTC mode

This web server will use mediasoup as WebRTC SFU and start an ffmpeg process to publish RTSP stream into SFU via plainRTC. Front end will use mediasoup-client to work as consumer to playback the a/v. It uses restful to communicate between client and server to co-ordinate mediasoup client and server's transport, producer and consumer.

RTC player has default 5s timeout. Once player close and no any other watcher present, the server will stop the ffmpeg producer in 5s.

## Build and Install

This web app has 2 parts: frontend app and backend server. Front end can be build into static webpage and put to server's static folder. Then backend server will use pkg to build all stuff (including frontend app pages) into a single exe.

The code within is build for Windows, for building mesiasoup on win10 is complicated, I include a modified mediasoup module named mediasoup-win in this source code. It contains a prebuild mediasoup worker (3.9.2) and a little change to start the worker binary in pkg generated exe. It is a small trick, pkg generated exe seems cannot get process.env.MEDIASOUP_WORKER_BIN, so just change code to pass the workerPath directly.

For linux like env, remove the mediasoup from package.json and add it normally (will download official versoin from npm repo). You may also need to change the server code slightly to remove the workerPath param when calling Mediasoup.createWorker. You may also need to change server\package.json to adjust pkg targets param for Linux.

```shell
cd app
yarn
yarn build
cd ..
cd server
# following 2 lines is for linux to use official mediasoup, you need change server/index.js Mediasoup.createWorker() call.
# npm uinstall mediasoup
# npm install -S mediasoup
mkdir certs
cd certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout privkey.pem -out fullchain.pem
cd ..
npm i
npm run build
```

At the end, copy rtsp-web.exe, config.yml, certs and tools folder to your destination folder and run the exe there.

### mediasoup on Windows

Optional, prebuild mediasoup worker already included.

* Install VS2009 with C++ support
* Pnstall python 3.x
* Install python based C++ build tools: pip install meson ninja
* Get nsam.exe and put it to your %path% (optianal, speed up openssl lib)
* Install MinGW with MSYS and add msys bin into %path%
* Copy cp.exe to copy.exe (under MinGW/msys/1.0/bin folder)
* Prepare following env variable:

```shell
set PYTHON=your_python_exe_path
"C:\Program Files (x86)\Microsoft Visual Studio\2019\Community\VC\Auxiliary\Build\vcvars64.bat"
```

You are ready to go: 
```shell
npm i
```

During the installation process it will download some source code from Internet. Here is another trick for Chinese: try to download them manually from other channel. Go to node_modules\mediasoup\worker\subprojects\, open all wrap file and download each file listed and then put into packagecache folder. Each time, when you make worker report cannot find meson.build in a folder, you clean all the source code folder under above subproejcts folder (keep packagefiles and packagecache ). It will extract and build from packagecache folder's tgz files. I do it on Win10 with Python3.8 successully, but failed on Win11 with Python 3.10.

## Source code and debug

WebRTC need HTTPS, so both frontend and backend to support HTTPS. you need put cert file under both side certs folder. To generate certs pem file:

```shell
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout privkey.pem -out fullchain.pem
```

### App

#### Install

```shell
yarn install
```

#### Debug

```shell
yarn serve
```

#### Release

```shell
yarn build
```

then copy everything under dist to server / folder.

### Server

#### Install

```shell
npm install
```

#### Release

build the webserver into a single exe (on windows) with pkg.

```shell
npm run build
```
