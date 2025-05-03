import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    'process.env': {}
  },
  plugins: [react({
    jsxImportSource: 'react',
    jsxRuntime: 'automatic'
  })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  },
  optimizeDeps: {
    include: ['lucide-react','@tanstack/react-query']
  },
  build: {
    commonjsOptions: {
      include: [/lucide-react/]
    },
    rollupOptions: {
      external: ['@rollup/rollup-linux-x64-gnu']
    }
  }
});