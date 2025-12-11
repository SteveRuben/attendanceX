// tests/config/jest.backend.config.js - Configuration pour backend
module.exports = {
  displayName: 'backend',
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Racine et patterns
  rootDir: '../../',
  testMatch: ['<rootDir>/tests/backend/**/*.test.ts'],
  
  // Module paths
  moduleNameMapper: {
    '^@attendance-x/shared$': '<rootDir>/shared/src/index.ts',
    '^rebac/(.*)$': '<rootDir>/backend/functions/src/rebac/$1'
  },
  
  // Setup
  setupFilesAfterEnv: [
    '<rootDir>/tests/helpers/setup/backend-test-environment.ts'
  ],
  
  // Coverage
  collectCoverageFrom: [
    'backend/functions/src/**/*.ts',
    '!backend/functions/src/**/*.d.ts',
    '!backend/functions/src/**/index.ts',
    '!backend/functions/src/types/**/*',
    '!backend/functions/src/config/firebase.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },
  
  // Environnement variables
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  },
  
  // Timeout pour les tests async
  testTimeout: 30000,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Transform
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: '<rootDir>/tests/tsconfig.json'
    }]
  },
  
  // Extensions
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/lib/',
    '/dist/'
  ]
};
