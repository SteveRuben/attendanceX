// tests/frontend/setup.ts
import { beforeAll, afterEach, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock localStorage
const localStorageMock = {
  getItem: (key: string) => {
    return localStorageMock.store[key] || null;
  },
  setItem: (key: string, value: string) => {
    localStorageMock.store[key] = value;
  },
  removeItem: (key: string) => {
    delete localStorageMock.store[key];
  },
  clear: () => {
    localStorageMock.store = {};
  },
  store: {} as Record<string, string>
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: (key: string) => {
    return sessionStorageMock.store[key] || null;
  },
  setItem: (key: string, value: string) => {
    sessionStorageMock.store[key] = value;
  },
  removeItem: (key: string) => {
    delete sessionStorageMock.store[key];
  },
  clear: () => {
    sessionStorageMock.store = {};
  },
  store: {} as Record<string, string>
};

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

// Mock IndexedDB
const indexedDBMock = {
  open: () => ({
    result: {
      createObjectStore: () => {},
      transaction: () => ({
        objectStore: () => ({
          get: () => ({ onsuccess: null, onerror: null }),
          put: () => ({ onsuccess: null, onerror: null }),
          delete: () => ({ onsuccess: null, onerror: null })
        })
      })
    },
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null
  })
};

Object.defineProperty(window, 'indexedDB', {
  value: indexedDBMock
});

// Mock URL.createObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: () => 'mocked-url'
});

// Mock URL.revokeObjectURL
Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: () => {}
});

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: async (text: string) => {
      return Promise.resolve();
    },
    readText: async () => {
      return Promise.resolve('');
    }
  }
});

// Mock fetch globally
global.fetch = async (url: string | URL | Request, init?: RequestInit) => {
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

// Setup and cleanup
beforeAll(() => {
  // Global test setup
});

afterEach(() => {
  // Clean up after each test
  cleanup();
  localStorageMock.clear();
  sessionStorageMock.clear();
});

afterAll(() => {
  // Global test cleanup
});