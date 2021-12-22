<template>
  <el-main v-loading="loading" :element-loading-text="$t('message.loading')" element-loading-background="rgba(0, 0, 0, 0.6)" class="frame">
    <el-card class="box-card">
      <el-input v-model="rtspUrl" autofocus :placeholder="$t('message.input.placeholder')" @keyup.enter="onClickStart">
        <template #prepend>rtsp://</template>
      </el-input>
      <div style="margin: 60px;"></div>
      <div style="display: flex"><div style="align-self: flex-start; flex-grow: 1"></div>
      <el-button type="primary" plain class="button" @click="onClickStart">{{$t('message.button.start')}}</el-button></div>
    </el-card>
    <video-player :url="hlsUrl" :show="ready" @close="onClosePlayer" @error="onPlayerError">
    </video-player>
  </el-main>
</template>

<script>
import VideoPlayer from './VideoPlayer.vue';

export default {
  name: "Camera",
  components: {
    VideoPlayer
  },
  data() {
    return {
      rtspUrl: "", // "127.0.0.1/test.mkv",
      channel: null,
      ready: false,
      loading: false,
      timer: 0,
      hlsUrl: ""
    };
  },

  beforeUnmount() {
    clearTimeout(this.timer);
  },
  methods: {
    startChannel() {
      let data = { url: `rtsp://${this.rtspUrl}` };
      this.$http
        .post("/api/channel", data)
        .then((res) => {
          this.channel = res.data;
          this.loading = true;
          this.timer = setTimeout(this.checkChannelStatus, 1000);
        })
        .catch((err) => {
          console.error(err);
          this.$message.error(this.$t('error.create_channel'));
        });
    },
    checkChannelStatus() {
      this.$http
        .get("/api/channel/" + this.channel.id)
        .then((res) => {
          this.channel = res.data;
          if (this.channel.state === 'start') {
            this.ready = false;
            this.timer = setTimeout(this.checkChannelStatus, 1000);
          }
          else if (this.channel.state === 'ready') {
              this.hlsUrl = `${this.$http.defaults.baseURL}${this.channel.hls}`;

              // Channel started, wait for a while to generate more ts files and get smooth playing.
              if (!this.ready) {
                setTimeout(() => {

                this.ready = true;
                this.loading = false;
              }, 5000);
            }

            this.timer = setTimeout(this.activateChannel, 10000);
          }
          else {
            this.ready = false;
            this.loading = false;
            this.$message.error(this.$t('error.channel_closed'));
          }
        })
        .catch((err) => {
          console.log(err);
          this.ready = false;
          this.loading = false;
          this.channel = null;
          this.$message.error(this.$t('error.create_channel'));
        });
    },
    activateChannel() {
      this.$http
        .put("/api/channel/" + this.channel.id)
        .then((res) => {
          this.channel = res.data;
          if (this.channel.state === 'ready') {
            this.timer = setTimeout(this.activateChannel, 10000);
          }
          else {
            this.ready = false;
            this.hlsUrl = "";
            this.loading = false;
            this.$message.error(this.$t('error.channel_closed'));
          }
        })
        .catch(() => {
          // this.$message.error('获取频道状态出错。');
        });
    },
    stopChannel() {
      this.$http
        .delete("/api/channel/" + this.channel.id)
        .then(() => {
          this.$message.error(this.$t('error.channel_closed'));
        })
        .catch((err) => {
          console.log(err);
          this.$message.error(this.$t('error.close_channel'));
        });
    },
    stopPlayer() {
      this.ready = false;
      this.hlsUrl = "";
      this.loading = false;
      clearTimeout(this.timer);
    },
    onClickStart() {
      if (this.rtspUrl === "") {
        this.$message.error(this.$t('message.input.validate'));
      }
      else {
        this.startChannel();
      }
    },
    onClosePlayer() {
      this.stopPlayer();
    },
    onPlayerError() {
      this.stopPlayer();
    },
    goWatch() {
      this.$router.push(`/Status`);
    }
  },
};
</script>

<style scoped>
.frame {
  margin: 0px auto;
  padding: 0px;
  width: 100%;
  min-height: 800px;
}
.box-card {
  margin-top: 200px;
  margin-left: auto;
  margin-right: auto;
  padding: 40px;
  width: 500px;
  height: 180px;
}
.button {
  align-self: flex-end
}
</style>
