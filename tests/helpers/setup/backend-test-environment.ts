// tests/helpers/setup/backend-test-environment.ts
import { config } from 'dotenv';
import { join } from 'path';

// Load test environment variables
config({ path: join(__dirname, '../../../backend/functions/.env.test') });

// Mock Firebase Admin SDK
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(),
  },
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        collection: jest.fn(),
      })),
      add: jest.fn(),
      where: jest.fn(() => ({
        get: jest.fn(),
        limit: jest.fn(() => ({
          get: jest.fn(),
        })),
      })),
      orderBy: jest.fn(() => ({
        get: jest.fn(),
        limit: jest.fn(() => ({
          get: jest.fn(),
        })),
      })),
      limit: jest.fn(() => ({
        get: jest.fn(),
      })),
      get: jest.fn(),
    })),
    batch: jest.fn(() => ({
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn(),
    })),
    runTransaction: jest.fn(),
  })),
  auth: jest.fn(() => ({
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    getUserByEmail: jest.fn(),
    getUser: jest.fn(),
    createCustomToken: jest.fn(),
    verifyIdToken: jest.fn(),
  })),
}));

// Mock Firebase Functions
jest.mock('firebase-functions', () => ({
  config: jest.fn(() => ({
    jwt: {
      secret: 'test-jwt-secret',
      refresh_secret: 'test-refresh-secret',
    },
    email: {
      provider: 'test',
      smtp: {
        host: 'localhost',
        port: 1025,
        user: 'test',
        pass: 'test',
      },
    },
  })),
  https: {
    onRequest: jest.fn(),
    onCall: jest.fn(),
  },
  firestore: {
    document: jest.fn(() => ({
      onCreate: jest.fn(),
      onUpdate: jest.fn(),
      onDelete: jest.fn(),
    })),
  },
  auth: {
    user: jest.fn(() => ({
      onCreate: jest.fn(),
      onDelete: jest.fn(),
    })),
  },
  pubsub: {
    schedule: jest.fn(() => ({
      onRun: jest.fn(),
    })),
  },
}));

// Mock external services
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    verify: jest.fn().mockResolvedValue(true),
  })),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
  genSalt: jest.fn().mockResolvedValue('salt'),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({
    userId: 'test-user-id',
    email: 'test@example.com',
    role: 'participant',
  }),
  decode: jest.fn().mockReturnValue({
    userId: 'test-user-id',
    email: 'test@example.com',
    role: 'participant',
  }),
}));

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
  jest.restoreAllMocks();
});

afterAll(async () => {
  // Global cleanup
  jest.clearAllTimers();
});

// Increase timeout for async operations
jest.setTimeout(30000);

// Suppress console logs in tests unless explicitly needed
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  Object.assign(console, originalConsole);
});

// Helper to restore console for specific tests
export const restoreConsole = () => {
  Object.assign(console, originalConsole);
};

// Helper to mock console for specific tests
export const mockConsole = () => {
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
};