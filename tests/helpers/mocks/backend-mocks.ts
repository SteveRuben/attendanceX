// tests/helpers/mocks/backend-mocks.ts
import { Request, Response } from 'express';

// Mock Express Request
export const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  cookies: {},
  user: null,
  ...overrides,
});

// Mock Express Response
export const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    render: jest.fn().mockReturnThis(),
  };
  return res;
};

// Mock Next Function
export const createMockNext = (): jest.Mock => jest.fn();

// Mock Firebase Admin
export const mockFirebaseAdmin = {
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(),
  },
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({}),
          id: 'mock-doc-id',
        }),
        set: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
        collection: jest.fn(),
      })),
      add: jest.fn().mockResolvedValue({
        id: 'mock-doc-id',
      }),
      where: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [],
          size: 0,
        }),
        limit: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({
            empty: false,
            docs: [],
            size: 0,
          }),
        })),
      })),
      orderBy: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [],
          size: 0,
        }),
        limit: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({
            empty: false,
            docs: [],
            size: 0,
          }),
        })),
      })),
      limit: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [],
          size: 0,
        }),
      })),
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [],
        size: 0,
      }),
    })),
    batch: jest.fn(() => ({
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    })),
    runTransaction: jest.fn().mockImplementation((callback) => 
      callback({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({}),
        }),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      })
    ),
  })),
  auth: jest.fn(() => ({
    createUser: jest.fn().mockResolvedValue({
      uid: 'mock-user-id',
      email: 'test@example.com',
    }),
    updateUser: jest.fn().mockResolvedValue({
      uid: 'mock-user-id',
      email: 'test@example.com',
    }),
    deleteUser: jest.fn().mockResolvedValue(undefined),
    getUserByEmail: jest.fn().mockResolvedValue({
      uid: 'mock-user-id',
      email: 'test@example.com',
    }),
    getUser: jest.fn().mockResolvedValue({
      uid: 'mock-user-id',
      email: 'test@example.com',
    }),
    createCustomToken: jest.fn().mockResolvedValue('mock-custom-token'),
    verifyIdToken: jest.fn().mockResolvedValue({
      uid: 'mock-user-id',
      email: 'test@example.com',
    }),
  })),
};

// Mock Firebase Functions
export const mockFirebaseFunctions = {
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
};

// Mock Nodemailer
export const mockNodemailer = {
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'test-message-id',
      accepted: ['test@example.com'],
      rejected: [],
    }),
    verify: jest.fn().mockResolvedValue(true),
  })),
};

// Mock bcryptjs
export const mockBcrypt = {
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
  genSalt: jest.fn().mockResolvedValue('salt'),
};

// Mock jsonwebtoken
export const mockJwt = {
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({
    userId: 'test-user-id',
    email: 'test@example.com',
    role: 'participant',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  }),
  decode: jest.fn().mockReturnValue({
    userId: 'test-user-id',
    email: 'test@example.com',
    role: 'participant',
  }),
};

// Mock User Data
export const createMockUser = (overrides = {}) => ({
  id: 'mock-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  displayName: 'Test User',
  role: 'participant',
  status: 'active',
  emailVerified: true,
  mustChangePassword: false,
  twoFactorEnabled: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastLoginAt: new Date().toISOString(),
  ...overrides,
});

// Mock Tokens
export const createMockTokens = () => ({
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
});

// Mock Error Classes
export class MockValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class MockAuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class MockNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class MockConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class MockForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

// Test Database Helper
export const createTestDatabase = () => {
  const collections = new Map();
  
  return {
    collection: (name: string) => {
      if (!collections.has(name)) {
        collections.set(name, new Map());
      }
      
      const docs = collections.get(name);
      
      return {
        doc: (id: string) => ({
          get: () => Promise.resolve({
            exists: docs.has(id),
            data: () => docs.get(id),
            id,
          }),
          set: (data: any) => {
            docs.set(id, { ...data, id });
            return Promise.resolve();
          },
          update: (data: any) => {
            if (docs.has(id)) {
              docs.set(id, { ...docs.get(id), ...data });
            }
            return Promise.resolve();
          },
          delete: () => {
            docs.delete(id);
            return Promise.resolve();
          },
        }),
        add: (data: any) => {
          const id = `mock-${Date.now()}`;
          docs.set(id, { ...data, id });
          return Promise.resolve({ id });
        },
        where: () => ({
          get: () => Promise.resolve({
            empty: docs.size === 0,
            docs: Array.from(docs.values()).map(data => ({
              data: () => data,
              id: data.id,
            })),
            size: docs.size,
          }),
        }),
        get: () => Promise.resolve({
          empty: docs.size === 0,
          docs: Array.from(docs.values()).map(data => ({
            data: () => data,
            id: data.id,
          })),
          size: docs.size,
        }),
      };
    },
    clearAll: () => {
      collections.clear();
    },
  };
};