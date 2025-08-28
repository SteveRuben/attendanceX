// vitest.config.organization-flow.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Configuration spécifique pour les tests du flux d'organisation
    include: [
      'backend/tests/integration/organization-membership-flow.integration.test.ts',
      'backend/tests/unit/user-organizations.test.ts',
      'frontend/tests/unit/components/OrganizationSetup.error-handling.test.tsx',
      'frontend/tests/unit/pages/Dashboard.error-handling.test.tsx',
      'frontend/tests/e2e/organization-membership-flow.e2e.test.ts'
    ],
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'backend/functions/src/services/user.service.ts',
        'backend/functions/src/services/organization.service.ts',
        'backend/functions/src/routes/users.routes.ts',
        'frontend/src/components/organization/OrganizationSetup.tsx',
        'frontend/src/pages/Dashboard/Dashboard.tsx',
        'frontend/src/hooks/use-error-handler.ts'
      ],
      exclude: [
        'node_modules/',
        'dist/',
        'build/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/test-helpers.ts',
        'backend/tests/',
        'frontend/tests/'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        // Seuils spécifiques pour les composants critiques
        'frontend/src/components/organization/OrganizationSetup.tsx': {
          branches: 85,
          functions: 90,
          lines: 85,
          statements: 85
        },
        'backend/functions/src/services/user.service.ts': {
          branches: 90,
          functions: 95,
          lines: 90,
          statements: 90
        }
      }
    },
    // Timeout plus long pour les tests d'intégration
    testTimeout: 10000,
    // Configuration des mocks
    globals: true,
    // Parallélisation des tests
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './frontend/src'),
      '@attendance-x/shared': path.resolve(__dirname, './shared/src')
    }
  },
  // Configuration pour les tests frontend
  esbuild: {
    target: 'node14'
  }
});