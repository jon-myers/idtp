import { createWebHistory, createRouter } from 'vue-router';
import EditorComponent from '@/components/EditorComponent.vue';
import FileManager from '@/components/FileManager.vue';
import AudioEvents from '@/components/AudioEvents.vue';

const routes = [
  {
    path: '/editor',
    name: 'Editor',
    component: EditorComponent,
  },
  {
    path: '/files',
    name: 'Files',
    component: FileManager
  },
  {
    path: '/audioEvents',
    name: 'AudioEvents',
    component: AudioEvents
  }
  
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  linkActiveClass: 'active',
  linkExactActiveClass: 'active'
})

export default router; 
