import { createWebHistory, createRouter } from 'vue-router';

const routes = [
  {
    path: '/files',
    name: 'Files',
    component: () => import('@/components/FileManager.vue')
  },
  {
    path: '/audioEvents',
    name: 'AudioEvents',
    component: () => import('@/components/AudioEvents.vue')
  },
  {
    path: '/raagEditor',
    name: 'RaagEditor',
    component: () => import('@/components/RaagEditor.vue')
  },
  {
    path: '/editor',
    name: 'EditorComponent',
    component: () => import('@/components/EditorComponent.vue')
  },
  {
    path: '/analyzer',
    name: 'AnalyzerComponent',
    component: () => import('@/components/AnalyzerComponent.vue')

  },
  {
    path: '/logIn',
    name: 'LogIn',
    component: () => import('@/components/LogIn.vue')
  },
  {
    path: '/',
    name: 'LandingPage',
    component: () => import('@/components/LandingPage.vue')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  linkActiveClass: 'active',
  linkExactActiveClass: 'active'
})

export default router; 
