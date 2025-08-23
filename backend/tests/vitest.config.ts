// backend/tests/vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Configuration pour les tests backend
    environment: 'node',
    include: [
      'tests/**/*.test.ts'
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
        'functions/src/**/*.ts'
      ],
      exclude: [
        'functions/src/**/*.test.ts',
        'functions/src/**/*.spec.ts',
        'tests/**/*'
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
      '@attendance-x/shared': path.resolve(__dirname, '../shared/src')
    }
  }
});