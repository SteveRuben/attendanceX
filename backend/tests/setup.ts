// backend/tests/setup.ts
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Configuration globale pour tous les tests backend
beforeAll(async () => {
  // Initialiser les émulateurs Firebase si nécessaire
  console.log('🔧 Initialisation des tests backend...');
});

afterAll(async () => {
  // Nettoyer les ressources globales
  console.log('🧹 Nettoyage des tests backend...');
});

beforeEach(() => {
  // Réinitialiser les mocks avant chaque test
  // vi.clearAllMocks(); // Décommenté si nécessaire
});

afterEach(() => {
  // Nettoyer après chaque test
});

// Configuration des timeouts
const originalTimeout = setTimeout;
global.setTimeout = (fn: any, delay: number) => {
  return originalTimeout(fn, Math.min(delay, 5000)); // Max 5s timeout
};