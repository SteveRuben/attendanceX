// tests/config/jest.backend.config.js - Configuration pour backend
module.exports = {
  displayName: 'backend',
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Racine et patterns
  rootDir: '../../backend/functions',
  testMatch: ['<rootDir>/../../tests/backend/**/*.test.ts'],
  
  // Module paths
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@attendance-x/shared$': '<rootDir>/../../shared/src'
  },
  
  // Setup
  setupFilesAfterEnv: [
    '<rootDir>/../../tests/helpers/setup/test-environment.ts'
  ],
  
  // Coverage
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/types/**/*'
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
  }
};