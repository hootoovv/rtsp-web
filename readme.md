# RTSP Web Server

View rtsp stream from browser.

this is a web server which can support transcode (copy or re-encode) rtsp stream into hls stream.

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
