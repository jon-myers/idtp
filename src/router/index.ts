import { createWebHistory, createRouter } from 'vue-router';

const routes = [
  {
    path: '/files',
    name: 'Files',
    component: () => import('@/components/files/FileManager.vue')
  },
  {
    path: '/audioEvents',
    name: 'AudioEvents',
    component: () => import('@/components/audioEvents/AudioEvents.vue')
  },
  {
    path: '/audioRecordings',
    name: 'AudioRecordings',
    component: () => import('@/components/audioRecordings/AudioRecordings.vue')
  },
  {
    path: '/raagEditor',
    name: 'RaagEditor',
    component: () => import('@/components/RaagEditor.vue')
  },
  {
    path: '/editor',
    name: 'EditorComponent',
    component: () => import('@/components/editor/EditorComponent.vue')
  },
  {
    path: '/analyzer',
    name: 'AnalyzerComponent',
    component: () => import('@/components/analysis/AnalyzerComponent.vue')

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
  },
  {
    path: '/collections',
    name: 'Collections',
    component: () => import('@/components/collections/CollectionsComponent.vue')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  linkActiveClass: 'active',
  linkExactActiveClass: 'active'
})

export default router; 
