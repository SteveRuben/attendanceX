/**
 * Server Configuration Constants
 * Centralized configuration for the Express server
 */

export interface ServerConfig {
  maxInstances: number;
  memory: '256MiB' | '512MiB' | '1GiB' | '2GiB' | '4GiB' | '8GiB';
  timeoutSeconds: number;
  region: string;
  payloadLimit: string;
  parameterLimit: number;
  compressionLevel: number;
  compressionThreshold: number;
}

export const SERVER_CONFIG: ServerConfig = {
  maxInstances: 20,
  memory: '2GiB',
  timeoutSeconds: 300,
  region: 'europe-west1',
  payloadLimit: '10mb',
  parameterLimit: 100,
  compressionLevel: 6,
  compressionThreshold: 1024,
};

export const PAYLOAD_LIMITS = {
  JSON: '10mb',
  URL_ENCODED: '10mb',
  MAX_SIZE_BYTES: 10 * 1024 * 1024,
} as const;

export const LOGGING_CONFIG = {
  enableMorgan: process.env.APP_ENV !== 'production',
  enableRequestId: true,
  enablePerformanceMetrics: true,
} as const;