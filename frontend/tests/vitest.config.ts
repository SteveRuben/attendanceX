// frontend/tests/vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Configuration pour les tests frontend
    environment: 'jsdom',
    include: [
      'tests/**/*.test.{ts,tsx}'
    ],
    exclude: [
      'node_modules/',
      'dist/',
      'build/'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/**/*.{ts,tsx}'
      ],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'tests/**/*',
        'src/main.tsx',
        'src/vite-env.d.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    testTimeout: 10000,
    globals: true,
    setupFiles: ['./tests/setup.ts']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
      '@attendance-x/shared': path.resolve(__dirname, '../../shared/src')
    }
  }
});