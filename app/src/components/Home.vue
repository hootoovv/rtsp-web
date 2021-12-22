<template>
  <el-container>
    <el-header>
      <img src="../assets/images/logo.png"/>
      <h1>IP摄像头预览</h1>
      <el-button type="text" @click="goWatch()">频道监控</el-button>
    </el-header>
    <el-main v-loading="loading" element-loading-text="频道启动中，请稍候..." element-loading-background="rgba(0, 0, 0, 0.6)" class="frame">
      <el-card class="box-card">
        <el-input v-model="rtspUrl" autofocus placeholder="IP摄像头的RTSP地址" @keyup.enter.native="onClickStart">
          <template #prepend>rtsp://</template>
        </el-input>
        <div style="margin: 60px;"></div>
        <div style="display: flex"><div style="align-self: flex-start; flex-grow: 1"></div><el-button type="primary" plain class="button" @click="onClickStart">启动观看</el-button></div>
      </el-card>
    </el-main>
  </el-container>
  <video-player :url="hlsUrl" :show="ready" @close="onClosePlayer" @error="onPlayerError">
  </video-player>
</template>

<script>
import VideoPlayer from './VideoPlayer.vue';

export default {
  name: "Home",
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
      // console.log(JSON.stringify(data));
      this.$http
        .post("/api/channel", data)
        .then((res) => {
          this.channel = res.data;
          this.loading = true;
          this.timer = setTimeout(this.checkChannelStatus, 1000);
        })
        .catch((err) => {
          console.log(err);
          this.$message.error('创建频道失败。');
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
              console.log(this.hlsUrl);

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
            this.$message.error('频道已关闭。');
          }
        })
        .catch((err) => {
          console.log(err);
          this.ready = false;
          this.loading = false;
          this.channel = null;
          this.$message.error('创建频道失败。');
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
            this.$message.error('频道已关闭。');
          }
        })
        .catch((err) => {
          // console.log(err);
          // this.$message.error('获取频道状态出错。' + err);
        });
    },
    stopChannel() {
      this.$http
        .delete("/api/channel/" + this.channel.id)
        .then((res) => {
          this.$message.error('频道已关闭。');
        })
        .catch((err) => {
          console.log(err);
          this.$message.error('关闭频道出错。');
        });
    },
    stopPlayer() {
      this.ready = false;
      this.hlsUrl = "";
      this.loading = false;
      clearTimeout(this.timer);

      // this.stopChannel();
    },
    onClickStart() {
      if (this.rtspUrl === "") {
        this.$message.error('请输入IP摄像头的RTSP地址。');
      }
      else {
        this.startChannel();
      }
    },
    onClosePlayer() {
      // console.log("player closed.");
      this.stopPlayer();
    },
    onPlayerError() {
      // console.log("player error.");
      this.stopPlayer();
    },
    goWatch() {
      this.$router.push(`/Status`);
    }
  },
};
</script>

<style scoped>
h1 {
  color: #ffffff;
  text-align: center;
  font-size: 26px;
}
.el-header {
  background-color: #444;
  height: 80px;
  display: flex; 
  align-items: center; 
  justify-content: space-between;
}
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
