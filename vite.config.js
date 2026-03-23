import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // We are reverting to default 'esbuild' (faster and standard for React 19)
    minify: 'esbuild',
    sourcemap: false,
  },
  // Ensure we don't need manual optimization for standard React hooks
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});