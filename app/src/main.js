import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import axios from 'axios'
import VueAxios from 'vue-axios'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'dayjs/locale/zh-cn'
import locale from 'element-plus/lib/locale/lang/zh-cn'

function getBaseUrl() {
  let url = window.location.href;
  url = url.substring(0, url.lastIndexOf('/'));

  if (process.env.NODE_ENV === "development") {
    url = 'http://127.0.0.1:8080';
  }

  return url;
}

const app = createApp(App);

app.config.globalProperties.getBaseUrl = getBaseUrl;

app.use(router);

app.use(VueAxios, axios);
axios.defaults.baseURL = getBaseUrl();
axios.defaults.timeout = 10000;

axios.interceptors.response.use(response => {
  const res = response.data;
  if (res.code !== 200) {
    return Promise.reject(new Error(res.message || 'Error'));
  } else {
    return res;
  }
}, err => {
  return Promise.reject(new Error(err.response.data.error || err.message));
});

app.use(ElementPlus, { locale });

app.mount('#app')

