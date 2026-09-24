import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Deployment context path (e.g. "/cms_sftp/"). BrowserRouter's basename
  // (src/App.tsx) reads import.meta.env.BASE_URL, which Vite derives from this.
  const basePath = env.VITE_APP_BASE_PATH || '/'

  return {
    plugins: [react()],
    resolve: {
      dedupe: ['react', 'react-dom', 'react-router', '@mui/material', '@emotion/react', '@emotion/styled'],
    },
    base: basePath,
    server: {
      host: '0.0.0.0',
      // 5174 is airtelcms_react's dev port.
      port: 5175,
    },
    build: {
      rollupOptions: {
        output: {
          // Same reasoning as airtelcms_react: MUI/Emotion/React have circular
          // internals, so vendor code stays in a single chunk.
          manualChunks(id: string) {
            return id.includes('node_modules') ? 'vendor' : undefined
          },
        },
      },
    },
  }
})
