import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * GitHub Pages serves a project site from a subpath, so every absolute URL the
 * app emits - the manifest, its icons, the service worker scope and its
 * navigation fallback - has to be prefixed. Set VITE_BASE in CI; local builds
 * stay at the root.
 */
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
  build: { target: 'es2022' },
  plugins: [
    VitePWA({
      // We never auto-activate. A waiting worker is activated by the shell only
      // when no run is in progress, so an update can never discard a run.
      registerType: 'prompt',
      injectRegister: false,
      // A cached shell masks code changes during development, so the worker is
      // production-only and explicit preview runs.
      devOptions: { enabled: false },
      workbox: {
        // The whole game is static and small, so everything is precached up
        // front. Lazy caching would make offline play depend on play history.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        cleanupOutdatedCaches: true,
        clientsClaim: false,
        skipWaiting: false,
        navigateFallback: `${base}index.html`,
      },
      manifest: {
        name: 'Stacked Match',
        short_name: 'Stacked',
        description: 'A calm, colourful stacked brick matching puzzle.',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#1b1630',
        background_color: '#12101f',
        categories: ['games', 'puzzle'],
        icons: [
          { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
          {
            src: `${base}icons/icon-maskable-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
});
