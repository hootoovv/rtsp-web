<template>
  <el-dialog
    :title="$t('message.player.rtc')"
    v-model="visible"
    fullscreen
    :before-close="onCloseVideoPlay"
    @opened="createPlayer"
    >
    <div class="video">
      <video id="remote_video" controls autoplay playsinline :width="width" :height="height" style="margin: 0 auto; padding: 0;"></video>
    </div>
  </el-dialog>
</template>

<script>
import * as mediasoupClient from 'mediasoup-client';
import UrlParse from 'url-parse';

export default {
  name: "RtcPlayer",
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    room: {
      type: String,
      required: true,
      default: ''
    }
  },
  emits: {
    close: null,
    error: null
  },
  data() {
    return {
      width: 1280,
      height: 720,
      device: null,
      transport: null,
      audioConsumer: null,
      videoConsumer: null,
      consumerId: '',
      timer: 0
    };
  },
  methods: {
    onResize() {
      this.width = window.innerWidth - 40;
      this.height = window.innerHeight - 120;
    },
    async createPlayer() {
      this.width = window.innerWidth - 40;
      this.height = window.innerHeight - 120;

      window.onresize = this.onResize;

      if (process.env.NODE_ENV === "development") {
        window.localStorage.setItem('debug', 'mediasoup-client:*');
      }

      console.log('createPlayer');

      const routerRtpCapabilities = await this.getRtpCapabilities();

      await this.loadDevice(routerRtpCapabilities);

      if (this.device && this.device.loaded) {
        // console.log("load device OK");
      }
      else {
        // console.log("load device failed");
        this.handleError();
        return;
      }

      await this.startStreaming();
    },
    async destroyPlayer() {
      // console.log('destroyPlayer');
      clearTimeout(this.timer);

      if (this.audioConsumer && !this.audioConsumer.closed) {
        // console.log('close audio consumer');
        await this.audioConsumer.close();
      }

      if (this.videoConsumer && !this.videoConsumer.closed) {
        // console.log('close video consumer');
        await this.videoConsumer.close();
      }
      
      if (this.transport && !this.transport.closed) {
        // console.log('close transport');
        await this.transport.close();
      }
      this.device = null;
    },
    async getRtpCapabilities() {
      return this.$http
        .get("/api/room/rtpCapabilities")
        .then((res) => {
          return res.data;
        })
        .catch((err) => {
          console.error(err);
          this.handleError();
        });
    },
    async loadDevice(routerRtpCapabilities) {
      const urlParser = new UrlParse(window.location.href, true);
      const handler = urlParser.query.handler;
      try {
        this.device = new mediasoupClient.Device({
					handlerName : handler
				});
      } 
      catch (error) {
        if (error.name === 'UnsupportedError') {
          console.error('browser not supported');
         }
        console.error('cannot create device. ' + error);
        return;
      }
      await this.device.load({ routerRtpCapabilities });
    },
    async startStreaming() {
      const params = await this.createServerTransport();

      if (params) {
        const { cid, parameters } = params;
        this.consumerId = cid;
        // console.log(parameters);

        this.transport = this.device.createRecvTransport(parameters);

        this.transport.on('connect', ({ dtlsParameters }, callback, errback) => {
          // console.log("transport connect");
          // connect consumer on router
          this.connectServerConsumer(dtlsParameters)
            .then(callback)
            .catch(errback);
        });

        this.transport.on('connectionstatechange', async (state) => {
          switch (state) {
            case 'connecting':
              // console.log("transport connecting");
              // this.$loading({ fullscreen: true });
              break;

            case 'connected':
              // console.log("transport connected");
              // this.$loading.close();
              // start local consume
              // console.log("start local consume");
              document.querySelector('#remote_video').srcObject = await stream;
              this.resumeStreams();
              this.activateConsumer();
              break;

            case 'failed':
              // console.log('transport failed');
              this.handleError();
              break;

            default: break;
          }
        });

        // console.log("transport created.");
        const stream = this.consumeStreams();
      }  
      else {
        console.error("Failed to create consumer transport");
        this.handleError();
      }
    },
    async createServerTransport() {
      return this.$http
        // create consumer on router
        .post(`/api/room/${this.room}/consumer`)
        .then((res) => {
          let params = res.data;
          // console.log('create consumer');
          return params;
        })
        .catch((err) => {
          console.error(err);
          this.handleError();
        });
    },
    connectServerConsumer(dtlsParameters) {
      return this.$http
        .post(`/api/room/${this.room}/consumer/${this.consumerId}/connect`, { dtlsParameters })
        .then((res) => {
          // console.log("connect Rounter consumer");
        })
        .catch((err) => {
          console.error(err);
          this.handleError();
        });
    },
    async startConsumer() {
      const { rtpCapabilities } = this.device;
      return this.$http
        .post(`/api/room/${this.room}/consumer/${this.consumerId}/start`, { rtpCapabilities })
        .then((res) => {
          // console.log("start consumer");
          return res.data;
        })
        .catch((err) => {
          console.error(err);
          this.handleError();
        });
    },
    async consumeStreams() {
      // console.log('consumeStreams');
      const data = await this.startConsumer();

      if (!data) {
        return;
      }

      this.videoConsumer = await this.consume(data.video);
      this.audioConsumer = await this.consume(data.audio);

      const stream = new MediaStream();
      stream.addTrack(this.videoConsumer.track);
      stream.addTrack(this.audioConsumer.track);
      return stream;
    },
    async consume(data) {
      let {
        producerId,
        id,
        kind,
        rtpParameters,
      } = data;

      let codecOptions = {};
      // console.log('transport.consume');
      const consumer = await this.transport.consume({
        id,
        producerId,
        kind,
        rtpParameters,
        codecOptions,
      });

      return consumer;
    },
    resumeStreams() {
      this.$http
        .post(`/api/room/${this.room}/consumer/${this.consumerId}/resume`)
        .then((res) => {
          // console.log("resume stream");
        })
        .catch((err) => {
          console.error(err);
          this.handleError();
        });
    },
    activateConsumer() {
      this.$http
        .put(`/api/room/${this.room}/consumer/${this.consumerId}`)
        .then((res) => {
          this.timer = setTimeout(this.activateConsumer, 2000);
        })
        .catch(() => {
          console.error("Activate consumer failed.");
          this.handleError();
        });
    },
    async onCloseVideoPlay(done) {
      await this.destroyPlayer();
      this.$emit('close');
      done();
    },
    async handleError() {
      await this.destroyPlayer();
      this.$emit('error');
    }
  }
};
</script>

<style>
.video {
  background-color: black;
  width: 100%;
  height: 100%;
}
</style>

