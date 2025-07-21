// tests/backend/setup/jest.setup.ts

// Global test setup for backend tests

// Mock Firebase Admin SDK
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: {
    applicationDefault: jest.fn(),
    cert: jest.fn(),
  },
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      })),
      where: jest.fn(() => ({
        get: jest.fn(),
        orderBy: jest.fn(() => ({
          get: jest.fn(),
          limit: jest.fn(() => ({
            get: jest.fn(),
          })),
        })),
      })),
      add: jest.fn(),
    })),
    batch: jest.fn(() => ({
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn(),
    })),
  })),
  auth: jest.fn(() => ({
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    getUserByEmail: jest.fn(),
    verifyIdToken: jest.fn(),
    createCustomToken: jest.fn(),
  })),
}));

// Mock Firebase Functions
jest.mock('firebase-functions', () => ({
  config: jest.fn(() => ({})),
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  https: {
    onRequest: jest.fn((handler) => handler),
    onCall: jest.fn((handler) => handler),
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
  setGlobalOptions: jest.fn(),
}));

// Mock Firebase Functions Test
jest.mock('firebase-functions-test', () => {
  return jest.fn(() => ({
    wrap: jest.fn((fn) => fn),
    cleanup: jest.fn(),
    firestore: {
      makeDocumentSnapshot: jest.fn(),
      makeChange: jest.fn(),
    },
    auth: {
      makeUserRecord: jest.fn(),
    },
  }));
});

// Mock external services
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    verify: jest.fn().mockResolvedValue(true),
  })),
}));

jest.mock('twilio', () => {
  return jest.fn(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        sid: 'test-message-sid',
        status: 'sent',
      }),
    },
  }));
});

// Mock AWS SDK
jest.mock('aws-sdk', () => ({
  SNS: jest.fn(() => ({
    publish: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        MessageId: 'test-message-id',
      }),
    }),
  })),
  config: {
    update: jest.fn(),
  },
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
  genSalt: jest.fn().mockResolvedValue('salt'),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('jwt-token'),
  verify: jest.fn().mockReturnValue({ userId: 'test-user-id' }),
  decode: jest.fn().mockReturnValue({ userId: 'test-user-id' }),
}));

// Mock speakeasy (for 2FA)
jest.mock('speakeasy', () => ({
  generateSecret: jest.fn().mockReturnValue({
    base32: 'test-secret',
    otpauth_url: 'otpauth://totp/test',
  }),
  totp: {
    verify: jest.fn().mockReturnValue(true),
    generate: jest.fn().mockReturnValue('123456'),
  },
}));

// Mock sharp (for image processing)
jest.mock('sharp', () => {
  return jest.fn(() => ({
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed-image')),
    metadata: jest.fn().mockResolvedValue({
      width: 100,
      height: 100,
      format: 'jpeg',
    }),
  }));
});

// Global test utilities
global.testUtils = {
  // Create mock user
  createMockUser: (overrides = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
    firstName: 'Test',
    lastName: 'User',
    role: 'participant',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  // Create mock event
  createMockEvent: (overrides = {}) => ({
    id: 'test-event-id',
    title: 'Test Event',
    description: 'Test event description',
    type: 'meeting',
    status: 'published',
    startDateTime: new Date(Date.now() + 86400000), // Tomorrow
    endDateTime: new Date(Date.now() + 90000000), // Tomorrow + 1 hour
    organizerId: 'test-organizer-id',
    participants: ['test-participant-id'],
    location: {
      type: 'physical',
      address: {
        street: '123 Test St',
        city: 'Test City',
        postalCode: '12345',
        country: 'Test Country',
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  // Create mock attendance
  createMockAttendance: (overrides = {}) => ({
    id: 'test-attendance-id',
    eventId: 'test-event-id',
    userId: 'test-user-id',
    status: 'present',
    method: 'qr_code',
    checkInTime: new Date(),
    markedBy: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  // Create mock request
  createMockRequest: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: { uid: 'test-user-id' },
    ip: '127.0.0.1',
    get: jest.fn(),
    ...overrides,
  }),

  // Create mock response
  createMockResponse: () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  }),

  // Wait for async operations
  waitFor: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate random string
  randomString: (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  // Generate random email
  randomEmail: () => {
    const username = global.testUtils.randomString(8);
    const domain = global.testUtils.randomString(5);
    return `${username}@${domain}.com`;
  },
};

// Console override for cleaner test output
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  // Suppress console.log in tests unless explicitly needed
  log: process.env.VERBOSE_TESTS ? originalConsole.log : jest.fn(),
  // Keep error and warn for debugging
  error: originalConsole.error,
  warn: originalConsole.warn,
  info: process.env.VERBOSE_TESTS ? originalConsole.info : jest.fn(),
  debug: process.env.VERBOSE_TESTS ? originalConsole.debug : jest.fn(),
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

// Global test timeout
jest.setTimeout(30000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Clean up after all tests
afterAll(() => {
  jest.restoreAllMocks();
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Export test utilities for use in test files
export { global as testUtils };