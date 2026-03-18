import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      jsxImportSource: 'react',
      // Disable aggressive optimizations that break React 18
      babel: {
        parserOpts: {
          plugins: ['jsx']
        }
      }
    })
  ],
  // Prevent React from being tree-shaken
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime', 'react-router-dom', '@supabase/supabase-js'],
    exclude: [] // Don't exclude anything
  },
  build: {
    // Use terser for better React compatibility
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        pure_funcs: [], // Never remove function calls
        keep_fnames: true, // Keep function names for debugging
        keep_classnames: true
      },
      format: {
        comments: false
      }
    },
    // Split React into its own chunk to prevent tree-shaking
    rollupOptions: {
      output: {
        manualChunks: {
          'react-core': ['react', 'react/jsx-runtime'],
          'react-dom-core': ['react-dom', 'react-dom/client'],
          'router': ['react-router-dom'],
          'supabase': ['@supabase/supabase-js']
        }
      }
    },
    // Increase chunk size warning limit (optional)
    chunkSizeWarningLimit: 1000
  },
  // Ensure proper module resolution
  resolve: {
    alias: {
      'react': 'react',
      'react-dom': 'react-dom'
    }
  }
})