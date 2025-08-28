// frontend/tests/setup.ts
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

// Configuration globale pour tous les tests frontend
beforeAll(async () => {
  console.log('🎨 Initialisation des tests frontend...');
  
  // Mock des APIs du navigateur
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

  // Mock de localStorage
  const localStorageMock = {
    getItem: (key: string) => null,
    setItem: (key: string, value: string) => {},
    removeItem: (key: string) => {},
    clear: () => {},
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
  });

  // Mock de sessionStorage
  Object.defineProperty(window, 'sessionStorage', {
    value: localStorageMock
  });
});

afterAll(async () => {
  console.log('🧹 Nettoyage des tests frontend...');
});

beforeEach(() => {
  // Nettoyer localStorage avant chaque test
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  // Nettoyer après chaque test
});