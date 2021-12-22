const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const staticServer = require('koa-static');
const Boom = require('boom');

const yaml = require('js-yaml');
const fs   = require('fs');

// const { mkdir, rmdir, access } = require('fs/promises');
const ChildProcess = require('child_process');
const UUID = require('uuid');

const Config = require('./config');

let yml = loadConfig(process.cwd() + '/config.yml');

let Settings = Object.assign(Config, yml);

const app = new Koa();

if (Settings.cors) {
  const cors = require('koa2-cors');
  app.use(cors({
    origin: (ctx) => {return Settings.cors;},
    allowMethods: ['OPTIONS', 'GET', 'PUT', 'POST', 'DELETE'],
    allowHeaders: ['Content-Type', 'Origin', 'Accept', 'X-Requested-With']
    }));
  console.log(`Set CORS: ${Settings.cors}.`);  
}

// parse request body:
app.use(bodyParser());

// const staticPath = '/static';
const staticPath = '/';
const hlsFolder = '/hls'

prepareHlsFolder();

app.use(staticServer(process.cwd() + staticPath));
app.use(staticServer(Settings.hlsPath));

// log request URL:
if (Settings.trace) {
  app.use(async (ctx, next) => {
      console.log(`Process ${ctx.request.method} ${ctx.request.url}...`);
      await next();
  });  
}

// console.log(process.cwd());

const router = new Router({
  prefix: Settings.apiUrl
});

// add url-route:
router.get('/channels', getChannels);

router.get('/channel/:id', getChannel);
router.post('/channel', postChannel);
router.delete('/channel/:id', deleteChannel);
router.put('/channel/:id', activateChannel);

let channelsMap = new Map();

// add router middleware:
app.use(router.routes());
app.use(router.allowedMethods({
  throw: true,
  notImplemented: () => new Boom.notImplemented(),
  methodNotAllowed: () => new Boom.methodNotAllowed()
}));

// start a periodical task to check HLS status or clean up channel and HLS cache folder when timeout
setInterval(checkChannels, Settings.checkInterval * 1000);

// app.on('error', (err, ctx) => {
//   log.error('Server error', err, ctx)
// });

app.listen(Settings.listenPort);
console.log('API server started at port ' + Settings.listenPort + '...');

async function getChannels(ctx, next) {
  let channels = [];
  for (let ch of channelsMap.values()) {
    let c = Object.assign({}, ch);
    delete c.process;
    channels.push(c);
  }
  ctx.response.body = {"code":200, "message":"Success", "data":channels};
};

async function getChannel(ctx, next) {
  let id = ctx.params.id;

  if (channelsMap.has(id)) {
    let ch = channelsMap.get(id);
    let c = Object.assign({}, ch);
    delete c.process;
    ctx.response.body = {"code":200, "message":"Success", "data":c};
  }
  else {
    ctx.response.body = {"code":404, "message":"Channel not found", "data":{}};
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
      ctx.response.body = {"code":200, "message":"Channel already exists", "data":c};
      return;
    }
  }

  let c = await doChannelCreate(url);
  ctx.response.body = {"code":200, "message":"Success", "data":c};
}

async function deleteChannel(ctx, next) {
  let id = ctx.params.id;
    
  if (channelsMap.has(id)) {
    await doChannelStop(id);
    ctx.response.body = {"code":200, "message":"Success", "data":{}};
  }
  else {
    ctx.response.body = {"code":404, "message":"Channel not found", "data":{}};
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
    ctx.response.body = {"code":200, "message":"Success", "data":c};
  }
  else {
    ctx.response.body = {"code":404, "message":"Channel not found", "data":{}};
  }
}

async function doChannelCreate(url) {
  let id = UUID.v4();
  let ch = {"id": id, "url": url};

  let path = Settings.hlsPath + hlsFolder + "/" + id;

  await fs.promises.mkdir(path, { recursive: true });

  let args = Settings.ffmpegParams1.concat(['-i', `${ch.url}`], Settings.ffmpegParams2, [`${path}/index.m3u8`]);

  // console.log(args.join(' '));

  ch.hls = `${hlsFolder}/${id}/index.m3u8`;
  ch.state = 'start';
  try {
    ch.process = ChildProcess.execFile(Settings.ffmpegPath, args, (error, stdout, stderr) => {
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

  let path = Settings.hlsPath + hlsFolder + '/' + ch.id;

  await fs.promises.rmdir(path, { force: true, recursive: true });

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
      let path = Settings.hlsPath + hlsFolder + '/' + ch.id + "/" + 'index.m3u8';

      try {
        await fs.promises.access(path);
        ch.state = 'ready';
        console.log(`Ready - Channel: ${ch.id}.`);
      }
      catch (e) {
      }
    }

    // find timeout channel and kill ffmpeg streaming
    if (ch.timestamp + Settings.channelTimeout * 1000 <= now && ( ch.state === 'ready' || ch.state === 'start')) {
      doChannelStop(id);
    }

    // find dead channel, clean up disk folder and channel map in memory
    // if ffmpeg failed to start or be killed when channel timeout, the state will be error or exit
    if (ch.state === 'error' || ch.state === 'exit') {
      await doChannelDelete(id);
    }

  });
}

function loadConfig(file) {
  try {
    let doc = yaml.load(fs.readFileSync(file, 'utf8'));
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
  if (Settings.hlsPath) {
    if (Settings.hlsPath.slice(-1) === '/' || Settings.hlsPath.slice(-1) === '\\') {
      Settings.hlsPath = Settings.hlsPath.slice(0, -1);
    }      
  }
  else {
    Settings.hlsPath = process.cwd() + staticPath;
  }

  try {
    await fs.promises.rmdir(Settings.hlsPath + hlsFolder, { recursive: true });
    await fs.promises.mkdir(Settings.hlsPath + hlsFolder, { recursive: true });
  }
  catch (e) {
    console.error(`Failed to clean or create HLS cache folder: ${Settings.hlsPath}${hlsFolder}. Exit.`);
    process.exit(100);
  }
}

Date.prototype.Format = function (fmt) {
  var o = {
  "M+": this.getMonth() + 1, //月份
  "d+": this.getDate(), //日
  "H+": this.getHours(), //小时
  "m+": this.getMinutes(), //分
  "s+": this.getSeconds(), //秒
  "q+": Math.floor((this.getMonth() + 3) / 3), //季度
  "S": this.getMilliseconds() //毫秒
  };
  if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
  for (var k in o)
  if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
  return fmt;
}
