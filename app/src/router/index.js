import { createRouter, createWebHistory } from 'vue-router'

import Home from '../components/Home.vue'
// import Course from '../components/Course.vue'

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
    path: '/status',
    name: 'Status',
    component: () => import('../components/Status.vue')
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
