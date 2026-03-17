import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'window',
  },
  server: {
    port: 3000,
    proxy: {
      '/ws': 'http://localhost:8080',
      '/app': 'http://localhost:8080',
      '/topic': 'http://localhost:8080'
    }
  }
});
