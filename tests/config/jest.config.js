// tests/config/jest.config.js - Configuration Jest globale
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Projets multiples (monorepo)
  projects: [
    '<rootDir>/tests/config/jest.shared.config.js',
    '<rootDir>/tests/config/jest.backend.config.js',
    '<rootDir>/tests/config/jest.frontend.config.js'
  ],
  
  // Coverage global
  collectCoverage: true,
  coverageDirectory: '<rootDir>/tests/reports/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  
  // Setup global
  setupFilesAfterEnv: ['<rootDir>/tests/config/test-setup.ts'],
  
  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/tests/reports/junit',
      outputName: 'junit.xml'
    }]
  ],
  
  // Timeout
  testTimeout: 30000
};