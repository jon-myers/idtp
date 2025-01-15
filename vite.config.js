import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';
import Markdown from 'unplugin-vue-markdown/vite';
import path from 'path';
export default defineConfig({
  plugins: [
    Markdown(),
    vue({
      include: [/\.vue$/, /\.md$/],
    }),
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
