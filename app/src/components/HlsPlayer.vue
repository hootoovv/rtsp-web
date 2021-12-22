<template>
  <el-dialog
    :title="$t('message.player.hls')"
    v-model="showPlayer"
    fullscreen
    :before-close="onCloseVideoPlay"
    @opened="createPlayer"
    >
    <div id="player" class="video">
    </div>
  </el-dialog>
</template>

<script>
import "video.js/dist/video-js.css";
import video_zhCN from "video.js/dist/lang/zh-CN.json";
import videoJS from "video.js";
import { ElLoadingService } from 'element-plus';

export default {
  name: "HlsPlayer",
  props: {
    url: {
      type: String,
      required: true,
      default: ''
    },
    poster: {
      type: String,
      default: ''
    },
    show: {
      type: Boolean,
      default: false
    }
  },
  emits: {
    close: null,
    error: null
  },
  data() {
    return {
      showPlayer: this.show,
      player: null,
      retry: 0
    };
  },
  watch: {
    show(s) {
      this.showPlayer = s;
    }
  },
  methods: {
    createPlayer() {
      let playerNew = document.createElement('div');

      let width = window.innerWidth - 40;
      let height = window.innerHeight - 120;

      playerNew.innerHTML = `
      <video id="video" controls autoplay errorDisplay width="${width}" height="${height}" class="video-js vjs-default-skin vjs-big-play-centered" poster="${this.poster}"
        style="margin: 0 auto; padding: 0;">
        <source src="${this.url}" type="application/x-mpegURL"/>
      </video>
      `;
      let playerDom = document.getElementById('player');
      playerDom.appendChild(playerNew);

      videoJS.addLanguage("zh-CN", video_zhCN); //设置播放器的语言

      this.player = videoJS('video');
      this.retry = 0;

      this.player.ready(() => {
        this.player.play();

        this.player.tech().on('retryplaylist', () => {
          this.retry++;

          if (this.retry >= 2) {
            this.destroyPlayer();
            this.$emit('error');
          }
        });
      });
    },
    destroyPlayer () {
      if (this.player) {
        this.player.dispose();
      }
    },
    onCloseVideoPlay(done) {
      this.destroyPlayer();
      this.$emit('close');
      done();
    }
  },
};
</script>

<style>
.video {
  background-color: black;
  width: 100%;
  height: 100%;
}
</style>

