// tests/config/jest.frontend.config.js - Configuration pour frontend
module.exports = {
  displayName: 'frontend',
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  
  // Racine et patterns
  rootDir: '../../frontend',
  testMatch: ['<rootDir>/../tests/frontend/**/*.test.{ts,tsx}'],
  
  // Module paths
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@attendance-x/shared$': '<rootDir>/../shared/src',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  
  // Setup
  setupFilesAfterEnv: [
    '<rootDir>/../tests/helpers/setup/test-environment.ts',
    '@testing-library/jest-dom'
  ],
  
  // Transform
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Coverage
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/main.tsx'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};