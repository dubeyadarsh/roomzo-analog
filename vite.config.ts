/// <reference types="vitest" />

import { defineConfig } from 'vite';
import analog from '@analogjs/platform';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  build: {
    target: ['es2020'],
  },
  resolve: {
    mainFields: ['module'],
  },
  // ADD THIS SSR BLOCK:
  ssr: {
    noExternal: ['@angular/cdk', '@angular/material'],
  },
  plugins: [
    analog({
      prerender: {
        routes: [
          '/',
          '/about',
          '/faq',
          '/explore-listing',
          '/login',
          '/owner-auth'
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['**/*.spec.ts'],
    reporters: ['default'],
  },
}));