import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/slack-api': {
        target: 'https://slack.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/slack-api/, '/api'),
      },
    },
  },
})
