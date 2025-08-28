// backend/functions/.eslintrc.js
module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.dev.json'],
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/prefer-nullish-coalescing': 'off',
    '@typescript-eslint/prefer-optional-chain': 'off',
    'no-await-in-loop': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    'no-unused-vars': 'off',
    
    // Ou les changer en warnings au lieu d'errors
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/prefer-nullish-coalescing': 'warn',
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': 'off',//['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'off',
    "@typescript-eslint/prefer-nullish-coalescing": "off",
    "@typescript-eslint/prefer-nullish-coalescing": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "no-await-in-loop": "off",
    // General rules
    'no-console': 'off', // Allowed in backend for logging
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-undef':'off',
    'no-fallthrough':'off',
    'no-ex-assign': 'off',
    'no-control-regex': 'off',
    'no-var': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    
    // Import rules
    'sort-imports': ['error', {
      ignoreCase: true,
      ignoreDeclarationSort: true,
    }],
    
    // Security rules
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    
    // Performance rules
    'no-await-in-loop': 'warn',
    'prefer-promise-reject-errors': 'error',
  },
  ignorePatterns: [
    'lib/',
    'dist/',
    'node_modules/',
    '*.js',
    'coverage/',
  ],
};