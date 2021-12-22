<template>
  <el-config-provider :locale="elementLocale">
    <el-container style="justify-content: stretch; height: 100%; width: 100%; ">
      <el-header>
        <img src="../assets/images/logo.png"/>
        <h1>{{header}}</h1>
        <div class="button-bar">
          <el-select v-model="mode" size="small" default-first-option >
            <el-option label="HLS" key="hls" value="Hls"></el-option>
            <el-option label="WebRTC" key="rtc" value="Rtc"></el-option>
          </el-select>
          <div style="padding: 15px"></div>
          <el-button type="text" @click="onClick()">{{button}}</el-button>
          <div style="padding: 15px"></div>
          <el-dropdown size="medium" @command="changeLanguage">
            <el-button type="text" class="el-dropdown-link">{{languageName}}<el-icon class="el-icon--right"><arrow-down /></el-icon></el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item :disabled="language==='zh-CN'" command="zh-CN">中文</el-dropdown-item>
                <el-dropdown-item :disabled="language==='en'" command="en">English</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <template v-if="mode === 'Hls'">
        <template v-if="page === 'Camera'">
          <hls-camera />
        </template>
        <template v-else>
          <hls-status />
        </template>
      </template>
      <template v-else>
        <template v-if="page === 'Camera'">
          <rtc-camera />
        </template>
        <template v-else>
          <rtc-status />
        </template>
      </template>
    </el-container>
  </el-config-provider>
</template>

<script>
import elementCn from 'element-plus/lib/locale/lang/zh-cn';
import elementEn from 'element-plus/lib/locale/lang/en';

import { ArrowDown } from '@element-plus/icons'
import HlsCamera from './HlsCamera.vue';
import HlsStatus from './HlsStatus.vue';
import RtcCamera from './RtcCamera.vue';
import RtcStatus from './RtcStatus.vue';

export default {
  name: "Home",
  components: {
    HlsCamera,
    HlsStatus,
    RtcCamera,
    RtcStatus,
    ArrowDown
  },
  data() {
    return {
      page: "Camera", // "Status",
      mode: "Rtc", // "Hls", 
      lang: this.$route.params.lang,
      language: this.$i18n.locale
    };
  },
  mounted() {
    if (this.lang) {
      this.language = this.lang;
      this.$i18n.locale = this.language;
    }
  },
  computed: {
    header() {
      if (this.page === 'Camera') {
        return this.$t('message.header.view');
      }
      else {
        return this.$t('message.header.status');
      }
    },
    button() {
      if (this.page === 'Camera') {
        return this.$t('message.button.status');
      }
      else {
        return this.$t('message.button.view');
      }
    },
    languageName() {
      if (this.language === 'zh-CN') {
        return '中文';
      }
      else {
        return 'English';
      }
    },
    elementLocale() {
      if (this.language === 'zh-CN') {
        return elementCn;
      }
      else {
        return elementEn;
      }
    }
  },
  methods: {
    onClick() {
      if (this.page === 'Camera')
        this.page = 'Status';
      else 
        this.page = 'Camera';
    },
    changeLanguage() {
      if (this.language === 'zh-CN') {
        this.language = 'en';
      }
      else {
        this.language = 'zh-CN';
      }

      this.$i18n.locale = this.language;
    }
  }
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
.button-bar {
  display: flex; 
  align-items: center; 
  justify-content: space-between;
}
</style>
