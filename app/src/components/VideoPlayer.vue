<template>
  <el-dialog
    title="视频播放器"
    v-model="show"
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

export default {
  name: "VideoPlayer",
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
      player: null,
      retry: 0
    };
  },
  // mounted() {
  //   console.log("video player mounted.");
  // },
  // beforeUnmount() {
  //   console.log("video player unmounted.");
  // },
  methods: {
    createPlayer() {
      // console.log('Create Player');
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

      // console.log(this.url);
      this.player = videoJS('video');
      this.retry = 0;
      // this.player.src({src: this.url, type: 'application/x-mpegURL'});
      // this.player.load(this.url);

      this.player.ready(() => {
        this.player.play();

        this.player.tech().on('retryplaylist', () => {
          this.retry++;
          // console.log(`retry: ${this.retry}.`);

          if (this.retry >= 2) {
            this.destroyPlayer();
            // console.log("player emit error");
            this.$emit('error');
          }
        });
      });
    },
    destroyPlayer () {
      if (this.player) {
        this.player.dispose();
      }
      // console.log('Player released.');
    },
    onCloseVideoPlay(done) {
      this.destroyPlayer();
      // console.log("player emit close");
      this.$emit('close');
      done();
    }
  },
};
</script>

<style>
</style>

