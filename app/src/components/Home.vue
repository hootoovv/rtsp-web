<template>
  <el-config-provider :locale="elementLocale">
    <el-container>
      <el-header>
        <img src="../assets/images/logo.png"/>
        <h1>{{header}}</h1>
        <div class="button-bar">
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
      <template v-if="page === 'Camera'">
        <camera />
      </template>
      <template v-else>
        <status />
      </template>
    </el-container>
  </el-config-provider>
</template>

<script>
import elementCn from 'element-plus/lib/locale/lang/zh-cn';
import elementEn from 'element-plus/lib/locale/lang/en';

import { ArrowDown } from '@element-plus/icons'
import Camera from './Camera.vue';
import Status from './Status.vue';

export default {
  name: "Home",
  components: {
    Camera,
    Status,
    ArrowDown
  },
  data() {
    return {
      page: "Camera", // "Status",
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
