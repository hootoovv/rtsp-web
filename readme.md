# RTSP Web Server

View rtsp stream from browser.

this is a web server which can support transcode (copy or re-encode) rtsp stream into hls stream.

### Install

this web app has 2 parts: frontend app and backend server. first build app into dist folder then build server into a exe file. finally copy everything in front end dist folder and server exe, yml into a saperated folder and run the exe there.

you can config ffmpeg params in the yml file to control if transcode a/v. default -c copy is not transcode. however this may need your source stream to be h264/h265 and aac. please check HLS TS supported codec.

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

#### Run Release

copy the exe, yml and app dist content into a clean folder and run the exe. if not provide a external HLS cache folder, it will auto generate a hls sub-folder under current folder and cache all hls streaming files there.
