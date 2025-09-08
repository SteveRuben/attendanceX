// dev-tools/health-checks/index.ts

export { demonstrateEmailVerification } from './email-verification-demo';

// Re-export all health check utilities for easy access
export * from './email-verification-demo';
export * from './setup-test-email';
export * from './test-auth-apis';
export * from './test-cors';
export * from './test-email-config';
export * from './test-env';
export * from './test-smtp-direct';