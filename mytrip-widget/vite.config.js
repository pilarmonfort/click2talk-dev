import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import dotenv from 'dotenv';
import { viteStaticCopy } from 'vite-plugin-static-copy';

dotenv.config(); // load env vars from .env

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    viteStaticCopy({
      targets: [
        {
          src: 'src/styles/widget.css',
          dest: 'src'
        },
        {
          src: 'widgetcontent.html',
          dest: '.'
        },
        {
          src: 'src/assets/*',
          dest: 'src/assets'
        }
      ]
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    emptyOutDir: true,
    rollupOptions: {
      input: {
        widget: resolve('src/widget.js'),
      },
      output: {
        assetFileNames: 'assets/[name].[ext]',
        chunkFileNames: '[name].js',
        entryFileNames: '[name].js'
      }
    },
  },
})
