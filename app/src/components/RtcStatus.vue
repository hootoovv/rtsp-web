<template>
  <el-main>
    <el-table :data="rooms" style="width: 100%;" :row-class-name="tableRowClassName">
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
      <el-table-column :label="$t('message.table.hls')" width="120" align="center">
        <template #default="scope">
          <template v-if="scope.row.state === 'ready'">
            <el-button type="text" @click="playVideo(scope.row.id)">{{$t('message.button.watch')}}</el-button>
          </template>
          <template v-else>
            <span>{{$t('message.table.starting')}}"</span>
          </template>
        </template>
      </el-table-column>
    </el-table>
    <rtc-player :room="id" :visible="play" @close="onClosePlayer" @error="onPlayerError">
    </rtc-player>
  </el-main>
</template>

<script>
import RtcPlayer from './RtcPlayer.vue';

export default {
  name: "RtcStatus",
  components: {
    RtcPlayer
  },
  data() {
    return {
      rooms: [],
      baseUrl: this.$http.defaults.baseURL,
      timer: 0,
      play: false,
      id: ''
    };
  },
  mounted() {
    this.fetcRooms();
  },
  beforeUnmount() {
    clearTimeout(this.timer);
  },
  methods: {
    fetcRooms() {
      this.$http
        .get(`/api/rooms`)
        .then((res) => {
          this.rooms = res.data;
          this.timer = setTimeout(this.fetcRooms, 2000);
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
    playVideo (id) {
      this.id = id;
      this.play = true;

      // stop fetch channels while playing
      clearTimeout(this.timer);
    },
    onClosePlayer() {
      // resume fetch channels when stop playing
      this.timer = setTimeout(this.fetcRooms, 50);
      this.play = false;
    },
    onPlayerError() {
      this.timer = setTimeout(this.fetcRooms, 50);
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
