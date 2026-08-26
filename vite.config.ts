import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron/simple'

/** 开发时 public/foxit-* 走 Vite 静态资源；打包进 dist 会导致安装包重复携带 SDK */
function excludeFoxitFromDist() {
  return {
    name: 'exclude-foxit-from-dist',
    apply: 'build' as const,
    closeBundle() {
      for (const name of ['foxit-lib', 'foxit-external']) {
        fs.rmSync(path.resolve(__dirname, 'dist', name), { recursive: true, force: true })
      }
    },
  }
}

export default defineConfig({
  plugins: [
    vue(),
    excludeFoxitFromDist(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
      preload: {
        input: 'electron/preload.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
      renderer: {},
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    headers: {
      'Service-Worker-Allowed': '/',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  publicDir: 'public',
})
