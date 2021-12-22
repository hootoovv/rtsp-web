<template>
  <el-container>
    <el-header>
      <img src="../assets/images/logo.png"/>
      <h1>频道列表</h1>
      <el-button type="text" @click="goStart">启动频道</el-button>
    </el-header>
    <el-main>
      <el-table :data="channels" style="width: 100%;" :row-class-name="tableRowClassName">
        <el-table-column prop="state" label="状态" sortable width="100">
          <template #default="scope">
            <el-tag
              :type="scope.row.state === 'ready' ? 'success' : 'warning'"
              disable-transitions
              >{{ scope.row.state }}</el-tag
            >
          </template>
        </el-table-column>
        <el-table-column prop="startTime" label="启动时间" sortable width="240"></el-table-column>
        <el-table-column prop="id" label="频道" sortable></el-table-column>
        <el-table-column prop="url" label="RTSP地址" sortable></el-table-column>
        <el-table-column prop="hls" label="HLS地址" width="80" align="center">
          <template #default="scope">
            <template v-if="scope.row.state === 'ready'">
              <el-button type="text" @click="playVideo(scope.row.id, scope.row.hls)">观看</el-button>
            </template>
            <template v-else>
              <span>启动中</span>
            </template>
          </template>
        </el-table-column>
      </el-table>
    </el-main>
  </el-container>
  <video-player :url="hlsUrl" :show="play" @close="onClosePlayer" @error="onPlayerError">
  </video-player>
</template>

<script>
import VideoPlayer from './VideoPlayer.vue';

export default {
  name: "Status",
  components: {
    VideoPlayer
  },
  data() {
    return {
      channels: [],
      baseUrl: this.$http.defaults.baseURL,
      timer: 0,
      play: false,
      hlsUrl: '',
      id: ''
    };
  },
  mounted() {
    this.fetcChannels();
  },
  beforeUnmount() {
    clearTimeout(this.timer);
  },
  methods: {
    fetcChannels() {
      this.$http
        .get(`/api/channels`)
        .then((res) => {
          this.channels = res.data;
          this.timer = setTimeout(this.fetcChannels, 2000);
        })
        .catch((err) => {
          console.log(err);
          this.$message.error("获取频道数据失败。");
        });
    },
    goStart() {
      this.$router.push(`/`);
    },
    tableRowClassName({ row }) {
      if (row.state === 'ready') {
        return 'success-row';
      }
      return 'warning-row';
    },
    playVideo (id, url) {
      this.id = id;
      this.hlsUrl = this.getBaseUrl() + url;
      this.play = true;
      // stop fetch channels while playing
      clearTimeout(this.timer);
    },
    onClosePlayer() {
      // console.log("player closed.");
      // resume fetch channels when stop playing
      this.timer = setTimeout(this.fetcChannels, 50);
    },
    onPlayerError() {
      // console.log("player error.");
      this.timer = setTimeout(this.fetcChannels, 50);
      this.play = false;
      this.$message.error("频道已关闭。");
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
.el-main {
  margin: 0 auto;
  width: 100%;
  min-width: 600px;
}
.el-table .warning-row {
  --el-table-tr-bg-color: var(--el-color-warning-lighter);
}
.el-table .success-row {
  --el-table-tr-bg-color: var(--el-color-success-lighter);
}
</style>
