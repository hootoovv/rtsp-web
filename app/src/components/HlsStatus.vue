<template>
  <el-main>
    <el-table :data="channels" style="width: 100%;" :row-class-name="tableRowClassName">
      <el-table-column prop="state" :label="$t('message.table.state')" sortable width="100">
        <template #default="scope">
          <el-tag
            :type="scope.row.state === 'ready' ? 'success' : 'warning'"
            disable-transitions
            >{{ scope.row.state }}</el-tag
          >
        </template>
      </el-table-column>
      <el-table-column prop="startTime" :label="$t('message.table.start_time')" sortable width="240"></el-table-column>
      <el-table-column prop="id" :label="$t('message.table.id')" sortable></el-table-column>
      <el-table-column prop="url" :label="$t('message.table.rtsp')" sortable></el-table-column>
      <el-table-column prop="hls" :label="$t('message.table.hls')" width="120" align="center">
        <template #default="scope">
          <template v-if="scope.row.state === 'ready'">
            <el-button type="text" @click="playVideo(scope.row.id, scope.row.hls)">{{$t('message.button.watch')}}</el-button>
          </template>
          <template v-else>
            <span>{{$t('message.table.starting')}}"</span>
          </template>
        </template>
      </el-table-column>
    </el-table>
    <hls-player :url="hlsUrl" :show="play" @close="onClosePlayer" @error="onPlayerError">
    </hls-player>
  </el-main>
</template>

<script>
import HlsPlayer from './HlsPlayer.vue';

export default {
  name: "HlsStatus",
  components: {
    HlsPlayer
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
          console.error(err);
          this.$message.error(this.$t('error.get_channels'));
        });
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
      // resume fetch channels when stop playing
      this.timer = setTimeout(this.fetcChannels, 50);
    },
    onPlayerError() {
      this.timer = setTimeout(this.fetcChannels, 50);
      this.play = false;
      this.$message.error(this.$t('error.channel_closed'));
    }
  },
};
</script>

<style scoped>
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
