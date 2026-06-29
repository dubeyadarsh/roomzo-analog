// vite.config.ts
/// <reference types="vitest" />

import { defineConfig } from 'vite';
import analog from '@analogjs/platform';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { buildPrerenderRoutes } from './scripts/sitemap-routes';

export default defineConfig(({ mode }) => ({
  build: {
    target: ['es2020'],
  },
  resolve: {
    mainFields: ['module'],
    alias: {
      // ✅ Force Vite to use the pre-bundled browser version of SockJS
      'sockjs-client': 'sockjs-client/dist/sockjs.js',
    },
  },
  ssr: {
    noExternal: ['@angular/cdk', '@angular/material'],
  },
  plugins: [
    analog({
      prerender: {
        routes: buildPrerenderRoutes,
        sitemap: {
          host: 'https://www.roomzo.in',
        },
      },
      nitro: {
        prerender: {
          routes: ['/sitemap.xml'],
        },
      },
    }),
    nodePolyfills({
      include: ['util', 'buffer', 'process'],
      globals: {
        global: true,
        process: true,
        Buffer: true,
      },
    })
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['**/*.spec.ts'],
    reporters: ['default'],
  },
}));