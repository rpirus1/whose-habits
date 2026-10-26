/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * /api/deck in `npm run dev`, from the same code the Worker runs (worker/deck.ts), so a game
 * starts without `npm run dev:api`. Registered before Vite's own middleware, so the /api proxy
 * below only gets the other routes. No rate limit or own-page check here.
 */
function devDeck(): Plugin {
  return {
    name: 'dev-deck',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/deck', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end()
        }
        let body = ''
        for await (const chunk of req) body += chunk
        const { deal, parseDeckRequest } = await server.ssrLoadModule('/worker/deck.ts')
        const { BANK } = await server.ssrLoadModule('/worker/bank.ts')
        let parsed = null
        try {
          parsed = parseDeckRequest(JSON.parse(body))
        } catch {
          // Not JSON: a 400 below.
        }
        if (!parsed) {
          res.statusCode = 400
          return res.end()
        }
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(deal(BANK, parsed, Math.random)))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), devDeck()],
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
