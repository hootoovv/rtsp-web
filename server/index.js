const Https = require('https');
const Http = require('http');
const Path = require('path');
const Fs = require('fs');
const ChildProcess = require('child_process');

const Koa = require('koa');
const Router = require('koa-router');
const BodyParser = require('koa-bodyparser');
const StaticServer = require('koa-static');
const Cors = require('koa2-cors');
const Boom = require('boom');

const Yaml = require('js-yaml');
const UUID = require('uuid');
const Mediasoup = require('mediasoup');

const Config = require('./config');

// const staticPath = '/static';
const staticPath = '/';
const hlsFolder = '/hls'

let channelsMap = new Map();
let roomsMap = new Map();
let settings;
let worker;
let mediasoupRouter;

(async () => {
  try {
    await startWebServer();
    await startMediasoupWorker();
  } catch (err) {
    console.error(err);
  }
})();

async function startWebServer() {
  let yml = loadConfig(Path.join(process.cwd(), './config.yml'));
  settings = Object.assign(Config, yml);

  await prepareHlsFolder();

  const app = new Koa();

  if (settings.cors) {
    app.use(Cors({
      origin: (ctx) => {return settings.cors;},
      allowMethods: ['OPTIONS', 'GET', 'PUT', 'POST', 'DELETE'],
      allowHeaders: ['Content-Type', 'Origin', 'Accept', 'X-Requested-With']
      }));
    console.log(`Set CORS: ${settings.cors}.`);  
  }
  
  // log request URL:
  app.use(async (ctx, next) => {
    if (ctx.secure) {
      if (settings.trace) {
        console.log(`Process ${ctx.request.method} ${ctx.request.url}...`);
        await next();
      }
    }
    else {
      // force to access via https
      ctx.redirect(`https://${ctx.hostname}:${settings.listenSslPort}${ctx.url}`);
      return;
    }
  });  

  // parse request body:
  app.use(BodyParser());

  app.use(StaticServer(process.cwd() + staticPath));
  if (settings.hls.hlsPath) {
    app.use(StaticServer(settings.hls.hlsPath));
  }

  let router = new Router({
    prefix: settings.apiUrl
  });

  // add url-route:
  router.get('/channels', getChannels);
  router.get('/channel/:id', getChannel);
  router.post('/channel', postChannel);
  router.delete('/channel/:id', deleteChannel);
  router.put('/channel/:id', activateChannel);

  router.get('/rooms', getRooms);
  router.get('/room/rtpCapabilities', getRtpCapabilities);
  router.get('/room/:id', getRoom);
  router.post('/room', postRoom);
  router.delete('/room/:id', deleteRoom);
  router.post('/room/:id/consumer', createConsumer);
  router.post('/room/:rid/consumer/:cid/connect', connectConsumer);
  router.post('/room/:rid/consumer/:cid/start', startConsumer);
  router.post('/room/:rid/consumer/:cid/resume', resumeConsumer);
  router.put('/room/:rid/consumer/:cid', activeConsumer);

  // add router middleware:
  app.use(router.routes());
  app.use(router.allowedMethods({
    throw: true,
    notImplemented: () => new Boom.notImplemented(),
    methodNotAllowed: () => new Boom.methodNotAllowed()
  }));

  const http = Http.createServer(app.callback());

  http.on('error', (err) => {
    console.error('Starting web server failed:', err.message);
  });

  http.listen(settings.listenPort);
  console.log('Web server started at port ' + settings.listenPort + '...');

  let key, cert;

  if (!Path.isAbsolute(settings.tls.sslKey)) {
    key = Path.join(process.cwd(), settings.tls.sslKey);
  }
  else {
    key = settings.tls.sslKey;
  }

  if (!Path.isAbsolute(settings.tls.sslCrt)) {
    cert = Path.join(process.cwd(), settings.tls.sslCrt);
  }
  else {
    cert = settings.tls.sslCrt;
  }

  let options = {
    key: Fs.readFileSync(key),  //私钥文件路径
    cert: Fs.readFileSync(cert),  //证书文件路径
  	secureOptions : 'tlsv12',
    ciphers :
      [
        'ECDHE-ECDSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES128-GCM-SHA256',
        'ECDHE-ECDSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-ECDSA-CHACHA20-POLY1305',
        'ECDHE-RSA-CHACHA20-POLY1305',
        'DHE-RSA-AES128-GCM-SHA256',
        'DHE-RSA-AES256-GCM-SHA384'
      ].join(':'),
    honorCipherOrder : true
  };

  let webServer = Https.createServer(options, app.callback());

  webServer.on('error', (err) => {
    console.error('Starting secure web server failed:', err.message);
  });

  webServer.listen(settings.listenSslPort);
  console.log('Secure Web server started at port ' + settings.listenSslPort + '...');

  // start a periodical task to check HLS status or clean up channel and HLS cache folder when timeout
  setInterval(checkChannels, settings.checkInterval * 1000);
}

async function startMediasoupWorker() {
  worker = await Mediasoup.createWorker({
    logLevel: settings.rtc.worker.logLevel,
    logTags: settings.rtc.worker.logTags,
    rtcMinPort: settings.rtc.worker.rtcMinPort,
    rtcMaxPort: settings.rtc.worker.rtcMaxPort,
  });

  worker.on('died', () => {
    console.error(`Mediasoup server died, exiting in 2 seconds... [pid:${worker.pid}]`);
    setTimeout(() => process.exit(1), 2000);
  });

  const mediaCodecs = settings.rtc.router.mediaCodecs;
  mediasoupRouter = await worker.createRouter({ mediaCodecs });

  console.log('Mediasoup Router started.');
  
  // start a periodical task to check rtc status or clean up room and release mediasoup reources
  setInterval(checkRooms, settings.checkInterval * 1000);
}

Date.prototype.Format = function (fmt) {
  var o = {
  "M+": this.getMonth() + 1, //Month
  "d+": this.getDate(), //Day
  "H+": this.getHours(), //Hour
  "m+": this.getMinutes(), //Minute
  "s+": this.getSeconds(), //Second
  "q+": Math.floor((this.getMonth() + 3) / 3), //Season (Quater)
  "S": this.getMilliseconds() //Millisecond
  };
  if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
  for (var k in o)
  if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
  return fmt;
}

function loadConfig(file) {
  try {
    let doc = Yaml.load(Fs.readFileSync(file, 'utf8'));
    if (doc) {
      doc = doc.mediaserver;
    }
    else {
      doc = {};
    }
    return doc;
  } catch (e) {
    console.log(e);
    return {};
  }
}

async function prepareHlsFolder() {
  if (settings.hlsPath) {
    if (settings.hlsPath.slice(-1) === '/' || settings.hlsPath.slice(-1) === '\\') {
      settings.hlsPath = settings.hlsPath.slice(0, -1);
    }      
  }
  else {
    settings.hlsPath = process.cwd() + staticPath;
  }

  try {
    await Fs.promises.rmdir(settings.hlsPath + hlsFolder, { recursive: true });
    await Fs.promises.mkdir(settings.hlsPath + hlsFolder, { recursive: true });
  }
  catch (e) {
    console.error(`Failed to clean or create HLS cache folder: ${settings.hlsPath}${hlsFolder}. Exit.`);
    process.exit(100);
  }
}

// HLS Restful API
async function getChannels(ctx, next) {
  let channels = [];
  for (let ch of channelsMap.values()) {
    let c = Object.assign({}, ch);
    delete c.process;
    channels.push(c);
  }
  ctx.response.body = {"code": 200, "message": "Success", "data": channels};
};

async function getChannel(ctx, next) {
  let id = ctx.params.id;

  if (channelsMap.has(id)) {
    let ch = channelsMap.get(id);
    let c = Object.assign({}, ch);
    delete c.process;
    ctx.response.body = {"code": 200, "message": "Success", "data": c};
  }
  else {
    ctx.response.body = {"code": 404, "message": "Channel not found", "data": {}};
  }
};

async function postChannel(ctx, next) {
  let url = ctx.request.body.url;

  // request body: {"url": "rtsp://127.0.0.1/test.mkv"}

  for (let ch of channelsMap.values()) {
    if (ch.url.toLowerCase() === url.toLowerCase()) {
      ch.timestamp = Date.now();
      let c = Object.assign({}, ch);
      delete c.process;
      ctx.response.body = {"code": 200, "message": "Channel already exists", "data": c};
      return;
    }
  }

  let c = await doChannelCreate(url);
  ctx.response.body = {"code": 200, "message": "Success", "data": c};
}

async function deleteChannel(ctx, next) {
  let id = ctx.params.id;
    
  if (channelsMap.has(id)) {
    await doChannelStop(id);
    ctx.response.body = {"code": 200, "message": "Success", "data": {}};
  }
  else {
    ctx.response.body = {"code": 404, "message": "Channel not found", "data": {}};
  }
}

// client should call this api every 10s at least, to keep the channel alive. 
async function activateChannel(ctx, next) {
  let id = ctx.params.id;
    
  if (channelsMap.has(id)) {
    let ch = channelsMap.get(id);
    ch.timestamp = Date.now();
    let c = Object.assign({}, ch);
    delete c.process;
    ctx.response.body = {"code": 200, "message": "Success", "data": c};
  }
  else {
    ctx.response.body = {"code": 404, "message": "Channel not found", "data": {}};
  }
}

async function doChannelCreate(url) {
  let id = UUID.v4();
  let ch = {"id": id, "url": url};

  let path = settings.hlsPath + hlsFolder + "/" + id;

  await Fs.promises.mkdir(path, { recursive: true });

  let args = settings.hls.ffmpegParams1.concat(['-i', `${ch.url}`], settings.hls.ffmpegParams2, [`${path}/index.m3u8`]);

  // console.log(args.join(' '));

  ch.hls = `${hlsFolder}/${id}/index.m3u8`;
  ch.state = 'start';
  try {
    ch.process = ChildProcess.execFile(settings.ffmpegPath, args, (error, stdout, stderr) => {
      // console.log('ffmpeg exit.');
      if (error) {
        if (ch.state === 'kill') {
          ch.state = 'exit';
        }
        else {
          console.log(error.cmd);
          console.error(stderr);
          ch.state = 'error';
        }
      }
      else {
        console.log(stdout);
        ch.state = 'exit';
      }
    });

    console.log(`Created - Channel: ${ch.id}.`);
  }
  catch (e) {
    ch.state = 'error';
  }
  
  let now = new Date();
  ch.timestamp = now.getTime();
  ch.startTime = now.Format("yyyy-MM-dd HH:mm:ss.S");

  channelsMap.set(id, ch);

  let c = Object.assign({}, ch);
  delete c.process;

  return c;
}

function doChannelStop(id) {
  let ch = channelsMap.get(id);

  console.log(`Timeout - Channel: ${ch.id}.`);
  try {
    ch.state = 'kill';
    ch.process.kill('SIGINT');
  }
  catch (e) {
    console.error(e);
  }

  return;
}

async function doChannelDelete(id, killProcess = false) {
  let ch = channelsMap.get(id);

  let path = settings.hlsPath + hlsFolder + '/' + ch.id;

  await Fs.promises.rmdir(path, { force: true, recursive: true });

  console.log(`Clean Up - Channel: ${ch.id}.`);

  channelsMap.delete(id);
}

async function checkChannels() {
  let now = Date.now();

  channelsMap.forEach(async (ch, id) => {
    // channel state changing flow:
    // start: async folk ffmpeg process
    //   |--error: cannot start ffmpeg process. e.g. cannot find ffmpeg, wrong rtsp address or any other error
    //   |--exit: ffmpeg exit without any error when folk the ffmpeg process
    //   |--ready: the m3u8 file appears, client should be able streaming the ts files. (watching with hls.js)
    //        |--kill: channel timeout, killing the ffmpeg process
    //        |--exit: killed.

    // find m3u8 file and set the channel status from start to ready, means client side can start watching the channel
    if (ch.state === 'start') {
      let path = settings.hlsPath + hlsFolder + '/' + ch.id + "/" + 'index.m3u8';

      try {
        await Fs.promises.access(path);
        ch.state = 'ready';
        console.log(`Ready - Channel: ${ch.id}.`);
      }
      catch (e) {
      }
    }

    // find timeout channel and kill ffmpeg streaming
    if (ch.timestamp + settings.channelTimeout * 1000 <= now && ( ch.state === 'ready' || ch.state === 'start')) {
      doChannelStop(id);
    }

    // find dead channel, clean up disk folder and channel map in memory
    // if ffmpeg failed to start or be killed when channel timeout, the state will be error or exit
    if (ch.state === 'error' || ch.state === 'exit') {
      await doChannelDelete(id);
    }

  });
}

// RTC Restful API
async function getRtpCapabilities(ctx, next) {
  const rtpCapabilities = mediasoupRouter.rtpCapabilities;
  ctx.response.body = {"code": 200, "message": "Success", "data": rtpCapabilities };
};

async function getRooms(ctx, next) {
  let rooms = [];
  for (let rm of roomsMap.values()) {
    let r = Object.assign({}, rm);
    delete r.process;
    delete r.producer;
    delete r.consumers;
    // let cos = [];
    // for (let co of rm.consumers.values()) {
    //   cos.push(co);
    // }
    // r.consumers = cos;
    rooms.push(r);
  }
  ctx.response.body = {"code": 200, "message": "Success", "data": rooms};
};

async function getRoom(ctx, next) {
  let id = ctx.params.id;

  if (roomsMap.has(id)) {
    let rm = roomsMap.get(id);
    let r = Object.assign({}, rm);
    delete r.process;
    delete r.producer;
    delete r.consumer;
    ctx.response.body = {"code": 200, "message": "Success", "data": r};
  }
  else {
    ctx.response.body = {"code": 404, "message": "Room not found", "data": {}};
  }
};

async function createConsumer(ctx, next) {
  let id = ctx.params.id;
  let cid = UUID.v4();

  if (roomsMap.has(id)) {
    let rm = roomsMap.get(id);

    try {
      const transport = await createWebRtcTransport();

      // Set Transport events.
      transport.observer.on('close', () => {
        // console.log("Consumer transport closed.");
        deleteConsumer(id, cid);
      });

      const consumer = { id: cid, transport: transport, timestamp: Date.now() };

      rm.consumers.set(cid, consumer);

      const parameters = {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters
      };

      ctx.response.body = {"code": 200, "message": "Success", "data": { cid: cid, parameters: parameters } };
    } catch (err) {
      console.error(err);
      ctx.response.body = {"code": 200, "message": "Success", "data": {}};
    }
  }
  else {
    ctx.response.body = {"code": 404, "message": "Room not found", "data": {}};
  }
}

async function connectConsumer(ctx, next) {
  let rid = ctx.params.rid;
  let cid = ctx.params.cid;

  if (roomsMap.has(rid)) {
    let rm = roomsMap.get(rid);

    if (rm.consumers.has(cid)) {
      let co = rm.consumers.get(cid);
      let dtlsParameters = ctx.request.body.dtlsParameters;

      await co.transport.connect({ dtlsParameters: dtlsParameters });

      // Set Consumer events.
      co.consumer.on('transportclose', () => {
        // console.log("transport closed.");
        deleteConsumer(rid, cid);
      });

      co.consumer.on('producerclose', () => {
        // console.log("producer closed.");
        deleteConsumer(rid, cid);
      });
          
      ctx.response.body = {"code": 200, "message": "Success", "data": {}};
    }
    else {
      ctx.response.body = {"code": 404, "message": "Consumer not found", "data": {}};
    }
  }
  else {
    ctx.response.body = {"code": 404, "message": "Room not found", "data": {}};
  }
}

async function startConsumer(ctx, next) {
  let rid = ctx.params.rid;
  let cid = ctx.params.cid;

  if (roomsMap.has(rid)) {
    let rm = roomsMap.get(rid);

    if (rm.consumers.has(cid)) {
      let co = rm.consumers.get(cid);
      let data = {audio: {}, video: {}};

      let audio = await consume(co, rm.producer.audio.producer, ctx.request.body.rtpCapabilities, 'audio');
      if (audio) {
        data.audio = audio;
      }
      else {
        console.log("consume audio failed.");
        deleteConsumer(rid, cid);
        ctx.response.body = {"code": 500, "message": "Failed to connect audio producer", "data": {}};
        return;
      }

      let video = await consume(co, rm.producer.video.producer, ctx.request.body.rtpCapabilities, 'video');
      if (video) {
        data.video = video;
      }
      else {
        console.log("consume video failed.");
        deleteConsumer(rid, cid);
        ctx.response.body = {"code": 500, "message": "Failed to connect video producer", "data": {}};
        return;
      }

      console.log(`Created - Consumer: ${cid} in Room: ${rid}`);
      ctx.response.body = {"code": 200, "message": "Success", "data": data};
    }
    else {
      ctx.response.body = {"code": 404, "message": "Consumer not found", "data": {}};
    }
  }
  else {
    ctx.response.body = {"code": 404, "message": "Room not found", "data": {}};
  }
}

async function resumeConsumer(ctx, next) {
  let rid = ctx.params.rid;
  let cid = ctx.params.cid;

  if (roomsMap.has(rid)) {
    let rm = roomsMap.get(rid);

    if (rm.consumers.has(cid)) {
      let co = rm.consumers.get(cid);
      co.consumer.resume();
      ctx.response.body = {"code": 200, "message": "Success", "data": {}};
    }
    else {
      ctx.response.body = {"code": 404, "message": "Consumer not found", "data": {}};
    }
  }
  else {
    ctx.response.body = {"code": 404, "message": "Room not found", "data": {}};
  }
}

// client should call this api every 10s at least, to keep the channel alive. 
async function activeConsumer(ctx, next) {
  let rid = ctx.params.rid;
  let cid = ctx.params.cid;

  if (roomsMap.has(rid)) {
    let rm = roomsMap.get(rid);

    if (rm.consumers.has(cid)) {
      let co = rm.consumers.get(cid);
      co.timestamp = Date.now();
      ctx.response.body = {"code": 200, "message": "Success", "data": {}};
    }
    else {
      ctx.response.body = {"code": 404, "message": "Consumer not found", "data": {}};
    }
  }
  else {
    ctx.response.body = {"code": 404, "message": "Room not found", "data": {}};
  }
}

async function consume (co, producer, rtpCapabilities, type) {
  if (!mediasoupRouter.canConsume(
    {
      producerId: producer.id,
      rtpCapabilities,
    })
  ) {
    console.error('can not consume ' + type);
    return {};
  }

  let consumer;

  try {
    consumer = await co.transport.consume({
      producerId: producer.id,
      rtpCapabilities,
      paused: type === 'video',
    });
  } catch (error) {
    console.error(type + 'consume failed', error);
    return {};
  }

  co.consumer = consumer;

  data = {
    producerId: producer.id,
    id: consumer.id,
    kind: consumer.kind,
    rtpParameters: consumer.rtpParameters,
    type: consumer.type,
    producerPaused: consumer.producerPaused
  };

  return data;
}

function deleteConsumer(rid, cid) {
  if (roomsMap.has(rid)) {
    let rm = roomsMap.get(rid);

    if (rm.consumers.has(cid)) {
      // release transport
      consumer = rm.consumers.get(cid);
      // console.log("close consumer");
      consumer.consumer.close();
      // console.log("close transport");
      consumer.transport.close();

      console.log(`Delete - Consumer: ${cid} in Room: ${rid}`);
      rm.consumers.delete(cid);
    }

    // check if it is the last consumer should delete the room
    if (rm.consumers.size == 0) {
      deleteRoom(rid);
    }
  }
}

function deleteRoom (id) {
  if (roomsMap.has(id)) {
    let rm = roomsMap.get(id);

    try {
      rm.state = 'kill';
      rm.process.kill('SIGINT');
    }
    catch (e) {
      console.error(e);
    }
    
    // release producer transport
    if (rm.producer) {
      if (rm.producer.audio) {
        if (rm.producer.audio.producer) {
          rm.producer.audio.producer.close();
        }
        if (rm.producer.audio.transport) {
          rm.producer.audio.transport.close();
        }
      }
      if (rm.producer.video) {
        if (rm.producer.video.producer) {
          rm.producer.video.producer.close();
        }
        if (rm.producer.video.transport) {
          rm.producer.video.transport.close();
        }
      }

      console.log(`Deleted - Producer in Room: ${id}`);
    }
    
    // release consumers transport
    if (rm.consumers) {
      for (let c of rm.consumers.values()) {
        if (c.consumer) {
          c.consumer.close();
        }
        if (c.transport) {
          c.transport.close();
        }

        console.log(`Deleted - Consumer: ${c.id} in Room: ${id}`);
      }
    }

    roomsMap.delete(id);
    console.log(`Deleted - Room: ${id}`);
  }
}

async function postRoom(ctx, next) {
  let url = ctx.request.body.url;

  // request body: {"url": "rtsp://127.0.0.1/test.mkv"}

  for (let rm of roomsMap.values()) {
    if (rm.url.toLowerCase() === url.toLowerCase()) {
      rm.timestamp = Date.now();
      let r = Object.assign({}, rm);
      delete r.process;
      delete r.producer;
      delete r.consumer;
      ctx.response.body = {"code": 200, "message": "Room already exists", "data": r};
      return;
    }
  }

  let r = await doRoomCreate(url);
  ctx.response.body = {"code": 200, "message": "Success", "data": r};
}

async function doRoomCreate(url) {
  let id = UUID.v4();
  let consumers = new Map();
  let rm = {id: id, url: url, producer: { audio: {}, video: {} }, consumers: consumers};

  const audioSSRC = 1000 + Math.floor(Math.random() * 999);
  const videoSSRC = 2000 + Math.floor(Math.random() * 999);
  const audioPT = 100;
  const videoPT = 101;

  // Create a PlainTransport in the mediasoup to send our audio using plain RTP over UDP.
  try {
    const audioTransport = await createPlainTransport();
    rm.producer.audio.transport = audioTransport;
  } catch (err) {
    console.error(err);
    return {};
  }

  const audioTransportIp = rm.producer.audio.transport.tuple.localIp;
  const audioTransportPort = rm.producer.audio.transport.tuple.localPort;
  const audioTransportRtcpPort = rm.producer.audio.transport.rtcpTuple ? rm.producer.audio.transport.rtcpTuple.localPort : undefined;

  // Create a PlainTransport in the mediasoup to send our video using plain RTP over UDP.
  try {
    const videoTransport = await createPlainTransport();
    rm.producer.video.transport = videoTransport;
  } catch (err) {
    console.error(err);
    return {};
  }

  const videoTransportIp = rm.producer.video.transport.tuple.localIp;
  const videoTransportPort = rm.producer.video.transport.tuple.localPort;
  const videoTransportRtcpPort = rm.producer.video.transport.rtcpTuple ? rm.producer.video.transport.rtcpTuple.localPort : undefined;

  // Create a mediasoup Producer to send audio
  const audioRtpParameters = { 
    codecs: [
      {
        mimeType: "audio/opus", 
        payloadType: audioPT, 
        clockRate: 48000, 
        channels: 2
      }
    ], 
    encodings: 
    [
      { 
        ssrc: audioSSRC
      } 
    ] 
  };

  const audioProducer = await rm.producer.audio.transport.produce({kind: 'audio', rtpParameters: audioRtpParameters});

  // Set Producer events.
  audioProducer.on('transportclose', () => {
    // console.log("audio producer transport closed.");
    deleteRoom(id);
  });

  rm.producer.audio.producer = audioProducer;

  // Create a mediasoup Producer to send video
  const videoRtpParameters = {
    codecs: [
      { mimeType: "video/vp8",
        payloadType: videoPT,
        clockRate: 90000 
      }
    ],
    encodings: 
    [
      { 
        ssrc: videoSSRC
      } 
    ] 
  }

  const videoProducer = await rm.producer.video.transport.produce({kind: 'video', rtpParameters: videoRtpParameters});

  // Set Producer events.
  videoProducer.on('transportclose', () => {
    // console.log("video producer transport closed.");
    deleteRoom(id);
  });

  rm.producer.video.producer = videoProducer;

  let rtpParams = [`[select=a:f=rtp:ssrc=${audioSSRC}:payload_type=${audioPT}]rtp://${audioTransportIp}:${audioTransportPort}?rtcpport=${audioTransportRtcpPort}|[select=v:f=rtp:ssrc=${videoSSRC}:payload_type=${videoPT}]rtp://${videoTransportIp}:${videoTransportPort}?rtcpport=${videoTransportRtcpPort}`];
  let args = settings.rtc.ffmpegParams1.concat(['-i', `${rm.url}`], settings.rtc.ffmpegParams2, rtpParams);

  console.log(args.join(' '));

  rm.state = 'start';
  try {
    rm.process = ChildProcess.execFile(settings.ffmpegPath, args, (error, stdout, stderr) => {
      // console.log('ffmpeg exit.');
      if (error) {
        if (rm.state === 'kill') {
          rm.state = 'exit';
        }
        else {
          console.log(error.cmd);
          console.error(stderr);
          rm.state = 'error';
        }
      }
      else {
        console.log(stdout);
        rm.state = 'exit';
      }
    });

    console.log(`Created - Room: ${rm.id}.`);
  }
  catch (e) {
    rm.state = 'error';
  }
  
  let now = new Date();
  rm.timestamp = now.getTime();
  rm.startTime = now.Format("yyyy-MM-dd HH:mm:ss.S");

  roomsMap.set(id, rm);

  let r = Object.assign({}, rm);
  delete r.process;
  delete r.producer;

  return r;
}

async function checkRooms() {
  let now = Date.now();

  roomsMap.forEach(async (rm, id) => {

    if (rm.state === 'start') {
      try {
        if (rm.process.exitCode == null) {
          rm.state = 'ready';
          console.log(`Ready - Room: ${rm.id}.`);          
        }
      }
      catch (e) {
      }
    }

    rm.consumers.forEach((co) => {
      // check consumer is still ative
      if (co.timestamp + settings.consumerTimeout * 1000 <= now && ( rm.state === 'ready' || rm.state === 'start')) {
        if (co.transport) {
          co.transport.close();
        }
      }    
    });

    // find dead room
    if (rm.state === 'error' || rm.state === 'exit') {
      deleteRoom(id);
    }
  });
}

async function createWebRtcTransport() {
  const {
    maxIncomingBitrate,
    initialAvailableOutgoingBitrate
  } = settings.rtc.webRtcTransportOptions;

  const transport = await mediasoupRouter.createWebRtcTransport({
    listenIps: settings.rtc.webRtcTransportOptions.listenIps,
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate,
  });
  if (maxIncomingBitrate) {
    try {
      await transport.setMaxIncomingBitrate(maxIncomingBitrate);
    } catch (error) {
    }
  }
  return transport;
}

async function createPlainTransport() {
  const plainTransportOptions =
  {
    ...settings.rtc.plainTransportOptions,
    rtcpMux : false,
    comedia : true
  };

  const transport = await mediasoupRouter.createPlainTransport(plainTransportOptions);

  return transport;
}
