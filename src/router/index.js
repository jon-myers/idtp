import { createWebHistory, createRouter } from 'vue-router';
import FileManager from '@/components/FileManager.vue';
import AudioEvents from '@/components/AudioEvents.vue';
import RaagEditor from '@/components/RaagEditor.vue';
import AltEditor from '@/components/AltEditor.vue';

const routes = [
  // {
  //   path: '/editor',
  //   name: 'Editor',
  //   component: EditorComponent,
  // },
  {
    path: '/files',
    name: 'Files',
    component: FileManager
  },
  {
    path: '/audioEvents',
    name: 'AudioEvents',
    component: AudioEvents
  },
  {
    path: '/raagEditor',
    name: 'RaagEditor',
    component: RaagEditor
  },
  {
    path: '/altEditor',
    name: 'AltEditor',
    component: AltEditor
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  linkActiveClass: 'active',
  linkExactActiveClass: 'active'
})

export default router; 
