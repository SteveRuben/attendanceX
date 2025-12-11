// tests/backend/jest.config.js
module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // TypeScript support
  preset: 'ts-jest',
  
  // Root directory for tests
  rootDir: '../../',
  
  // Test match patterns
  testMatch: [
    '<rootDir>/tests/backend/**/*.test.ts',
    '<rootDir>/tests/backend/**/*.spec.ts'
  ],
  
  // Module paths
  moduleNameMapper: {
    '^@attendance-x/shared$': '<rootDir>/shared/src/index.ts',
    '^rebac/(.*)$': '<rootDir>/backend/functions/src/rebac/$1'
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/backend/setup/jest.setup.ts'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'backend/functions/src/**/*.ts',
    '!backend/functions/src/**/*.d.ts',
    '!backend/functions/src/index.ts',
    '!backend/functions/src/**/*.interface.ts',
    '!backend/functions/src/**/*.type.ts'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // Specific thresholds for critical components
    'backend/functions/src/services/': {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 90
    },
    'backend/functions/src/controllers/': {
      branches: 85,
      functions: 90,
      lines: 85,
      statements: 85
    },
    'backend/functions/src/models/': {
      branches: 85,
      functions: 90,
      lines: 85,
      statements: 85
    }
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],
  
  // Coverage directory
  coverageDirectory: '<rootDir>/coverage/backend',
  
  // Transform configuration
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'js',
    'json'
  ],
  
  // Test timeout
  testTimeout: 30000,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Globals for ts-jest
  globals: {
    'ts-jest': {
      tsconfig: {
        compilerOptions: {
          module: 'commonjs',
          target: 'es2020',
          lib: ['es2020'],
          moduleResolution: 'node',
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          skipLibCheck: true,
          strict: true,
          resolveJsonModule: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true
        }
      }
    }
  },
  
  // Test environment options
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/lib/',
    '/dist/',
    '/coverage/'
  ],
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Error on deprecated features
  errorOnDeprecated: true,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Max workers for parallel execution
  maxWorkers: '50%',
  
  // Cache directory
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // Reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-results/backend',
        outputName: 'junit.xml',
        suiteName: 'Backend Tests'
      }
    ],
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/test-results/backend',
        filename: 'report.html',
        expand: true
      }
    ]
  ]
};
