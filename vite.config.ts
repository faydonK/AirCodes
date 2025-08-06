import { defineConfig } from 'vite'

export default defineConfig({
  root: 'src/web',
  build: {
    outDir: '../../dist/public',
    emptyOutDir: true
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:3000',
      '/auth': 'http://127.0.0.1:3000',
      '/discord': 'http://127.0.0.1:3000',
      '/invite': 'http://127.0.0.1:3000',
      '/i': 'http://127.0.0.1:3000'
    }
  }
})