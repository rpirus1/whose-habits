/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  server: {
    // Reachable from phones on the same Wi-Fi for playtesting.
    host: true,
    // Analytics endpoint: run `npm run dev:api` (the Worker + local D1) alongside.
    // The Worker only accepts same-origin posts; through this proxy the browser's Origin
    // (port 5173) differs from the Worker's (8788), so drop it in dev.
    proxy: {
      '/api': {
        target: 'http://localhost:8788',
        configure: (proxy) => proxy.on('proxyReq', (req) => req.removeHeader('origin')),
      },
    },
  },
  // The build-time prerender (src/lander/entry-server.tsx) runs in plain Node: bundle its
  // dependencies so ESM/CJS quirks in packages don't matter there.
  ssr: { noExternal: true },
  test: {
    include: [
      'src/**/*.test.ts',
      'scripts/**/*.test.ts',
      'worker/**/*.test.ts',
      'stats/**/*.test.ts',
    ],
  },
})
