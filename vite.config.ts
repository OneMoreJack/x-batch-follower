
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Fix: Define __dirname for ESM environment to resolve paths correctly
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'background.js'),
        content: resolve(__dirname, 'content.js'),
        execute: resolve(__dirname, 'execute.js'),
      },
      output: {
        // 确保插件脚本文件名固定，不带 hash，否则 manifest.json 会找不到文件
        entryFileNames: (chunkInfo) => {
          return ['background', 'content', 'execute'].includes(chunkInfo.name) 
            ? '[name].js' 
            : 'assets/[name]-[hash].js';
        },
      },
    },
  },
});
