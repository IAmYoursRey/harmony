import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { normalizePath } from 'vite';
import { fileURLToPath, URL } from 'node:url';

const require = createRequire(import.meta.url);
const cesiumBuild = join(dirname(require.resolve('cesium/package.json')), 'Build', 'Cesium');

export default defineConfig({
  plugins: [react(), viteStaticCopy({
    targets: ['Workers', 'ThirdParty', 'Assets', 'Widgets'].map(folder => ({
      src: normalizePath(join(cesiumBuild, folder)), dest: 'cesium',
    })),
  })],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: {
      clientPort: 5173,
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {

  },
});
