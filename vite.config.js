import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';
import path from 'path';
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  build: {
    sourcemap: true
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
  },
  // logLevel: 'warn'
});