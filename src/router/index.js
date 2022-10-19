import { createWebHistory, createRouter } from 'vue-router';

const lazyLoad = view => {
  return () => import (`@/components/${view}.vue`)
}

const routes = [
  {
    path: '/files',
    name: 'Files',
    component: lazyLoad('FileManager')
  },
  {
    path: '/audioEvents',
    name: 'AudioEvents',
    component: lazyLoad('AudioEvents')
  },
  {
    path: '/raagEditor',
    name: 'RaagEditor',
    component: lazyLoad('RaagEditor')
  },
  {
    path: '/altEditor',
    name: 'AltEditor',
    component: lazyLoad('AltEditor')
  },
  {
    path: '/',
    name: 'LogIn',
    component: lazyLoad('LogIn')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  linkActiveClass: 'active',
  linkExactActiveClass: 'active'
})

export default router; 
