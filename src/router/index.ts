import { createWebHistory, createRouter } from 'vue-router';
import store from '@/main.ts'
const routes = [
  {
    path: '/transcriptions',
    name: 'Transcriptions',
    component: () => import('@/comps/files/FileManager.vue')
  },
  {
    path: '/audioEvents',
    name: 'AudioEvents',
    component: () => import('@/comps/audioEvents/AudioEvents.vue')
  },
  {
    path: '/audioRecordings',
    name: 'AudioRecordings',
    component: () => import('@/comps/audioRecordings/AudioRecordings.vue')
  },
  {
    path: '/raagEditor',
    name: 'RaagEditor',
    component: () => import('@/comps/RaagEditor.vue')
  },
  {
    path: '/editor',
    name: 'EditorComponent',
    component: () => import('@/comps/editor/EditorComponent.vue')
  },
  {
    path: '/analyzer',
    name: 'AnalyzerComponent',
    component: () => import('@/comps/analysis/AnalyzerComponent.vue')

  },
  {
    path: '/logIn',
    name: 'LogIn',
    component: () => import('@/comps/LogIn.vue')
  },
  {
    path: '/',
    name: 'LandingPage',
    component: () => import('@/comps/LandingPage.vue')
  },
  {
    path: '/collections',
    name: 'Collections',
    component: () => import('@/comps/collections/CollectionsComponent.vue')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  linkActiveClass: 'active',
  linkExactActiveClass: 'active'
})

router.beforeEach((to, from, next) => {
  if (to.name !== 'LandingPage' && to.name !== 'LogIn' && store.state.userID === undefined) {
    
    console.log('redirecting to login')
      next({ name: 'LogIn' })
  } else {
      next()
  }
})

export default router; 
