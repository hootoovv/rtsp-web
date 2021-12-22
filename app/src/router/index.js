import { createRouter, createWebHistory } from 'vue-router'

import Home from '../components/Home.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '',
    name: 'Home',
    component: Home
  },
  {
    path: '/lang/:lang',
    name: 'Lang',
    component: Home
  }
  // {
  //   path: '/status',
  //   name: 'Status',
  //   component: () => import('../components/Status.vue')
  // }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
