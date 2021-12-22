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
    <rtc-player :visible="ready" :room="roomId" @close="onClosePlayer" @error="onPlayerError">
    </rtc-player>
  </el-main>
</template>

<script>
import RtcPlayer from './RtcPlayer.vue';

export default {
  name: "RtcCamera",
  components: {
    RtcPlayer
  },
  data() {
    return {
      rtspUrl: "", // "127.0.0.1/test.mkv",
      room: null,
      roomId: '',
      ready: false,
      loading: false,
      timer: 0
    };
  },

  beforeUnmount() {
    clearTimeout(this.timer);
  },
  methods: {
    startRoom() {
      const data = { url: `rtsp://${this.rtspUrl}` };
      this.$http
        .post("/api/room", data)
        .then((res) => {
          this.room = res.data;
          this.roomId = this.room.id;
          this.loading = true;
          this.timer = setTimeout(this.checkRoomStatus, 1000);
        })
        .catch((err) => {
          console.error(err);
          this.$message.error(this.$t('error.create_channel'));
        });
    },
    checkRoomStatus() {
      this.$http
        .get("/api/room/" + this.roomId)
        .then((res) => {
          this.room = res.data;
          if (this.room.state === 'start') {
            this.ready = false;
            this.timer = setTimeout(this.checkRoomStatus, 1000);
          }
          else if (this.room.state === 'ready') {
            this.ready = true;
            this.loading = false;
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
          this.room = null;
          this.roomId = '';
          this.$message.error(this.$t('error.create_channel'));
        });
    },
    onClickStart() {
      if (this.rtspUrl === "") {
        this.$message.error(this.$t('message.input.validate'));
      }
      else {
        this.startRoom();
      }
    },
    onClosePlayer() {
      // console.log("player closed");
      this.ready = false;
    },
    onPlayerError() {
      // console.log("player error");
      this.ready = false;
      this.$message.error(this.$t('error.channel_closed'));
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
