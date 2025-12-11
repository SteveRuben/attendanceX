// tests/config/jest.config.js - Configuration Jest globale
const path = require('path');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: path.resolve(__dirname, '..'),
  
  // Projets multiples (monorepo)
  projects: [
    '<rootDir>/config/jest.backend.config.js',
    '<rootDir>/config/jest.frontend.config.js'
  ],
  
  // Coverage global
  collectCoverage: true,
  coverageDirectory: '<rootDir>/reports/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  
  // Setup global
  setupFilesAfterEnv: ['<rootDir>/config/test-setup.ts'],
  
  // Reporters
  reporters: ['default'],
  
  // Timeout
  testTimeout: 30000
};
