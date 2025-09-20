// tests/config/jest.shared.config.js - Configuration pour package shared
module.exports = {
  displayName: 'shared',
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Racine et patterns
  rootDir: '../../shared',
  testMatch: ['<rootDir>/../tests/shared/**/*.test.ts'],
  
  // Module paths
  moduleNameMapping: {
    '^../(.*)$': '<rootDir>/src/$1'
  },
  
  // Coverage
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};