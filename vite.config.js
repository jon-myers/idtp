import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
console.log(__dirname)
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
  },
});