<template>
  <el-main v-loading="loading" :element-loading-text="$t('message.loading')" element-loading-background="rgba(0, 0, 0, 0.6)" class="frame">
    <div style="align-self: center;">
      <el-card class="box-card">
        <el-input v-model="rtspUrl" autofocus :placeholder="$t('message.input.placeholder')" @keyup.enter="onClickStart">
          <template #prepend>rtsp://</template>
        </el-input>
        <div style="margin: 40px;"></div>
        <div style="display: flex">
          <div style="align-self: flex-start; flex-grow: 1"></div>
          <el-button type="primary" plain class="button" @click="onClickStart">{{$t('message.button.start')}}</el-button>
        </div>
      </el-card>
      <div style="margin: 180px;"></div>
    </div>
    <hls-player :url="hlsUrl" :show="ready" @close="onClosePlayer" @error="onPlayerError">
    </hls-player>
  </el-main>
</template>

<script>
import HlsPlayer from './HlsPlayer.vue';

export default {
  name: "HlsCamera",
  components: {
    HlsPlayer
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
      const data = { url: `rtsp://${this.rtspUrl}` };
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
          console.error(err);
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
          this.ready = false;
          this.hlsUrl = "";
          this.loading = false;
          this.$message.error(this.$t('error.channel_closed'));
        });
    },
    stopChannel() {
      this.$http
        .delete("/api/channel/" + this.channel.id)
        .then(() => {
          this.$message.error(this.$t('error.channel_closed'));
        })
        .catch((err) => {
          console.error(err);
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
    }
  },
};
</script>

<style scoped>
.frame {
  display: flex;
  flex-direction: column;
  align-content: center;
  justify-content: space-around;
}
.box-card {
  padding: 20px;
  width: 500px;
  height: 160px;
}
.button {
  align-self: flex-end
}
</style>
