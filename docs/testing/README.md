# Testing Documentation

Guide complet des stratégies et procédures de test.

## Vue d'ensemble

Le système utilise une approche de test pyramidale avec des tests unitaires, d'intégration et end-to-end.

## Tests Backend - AttendanceX

Ce dossier contient tous les tests pour le backend AttendanceX.

### Structure Backend

```
backend/tests/
├── integration/          # Tests d'intégration API
├── unit/                # Tests unitaires des services
├── helpers/             # Utilitaires et helpers de test
└── README.md           # Documentation des tests backend
```

### Types de Tests Backend

#### Tests d'Intégration (`integration/`)
Tests end-to-end qui testent l'API complète avec une base de données réelle ou simulée.

- **organization-membership-flow.integration.test.ts** - Tests du flux d'appartenance aux organisations

#### Tests Unitaires (`unit/`)
Tests isolés des services et fonctions individuelles.

- **user-organizations.test.ts** - Tests du service getUserOrganizations

#### Helpers (`helpers/`)
Utilitaires partagés pour faciliter l'écriture des tests.

- **test-helpers.ts** - Fonctions de génération de données de test et nettoyage

### Exécution des Tests Backend

```bash
# Tous les tests backend
cd backend
npm test

# Tests d'intégration seulement
npm test -- tests/integration/

# Tests unitaires seulement
npm test -- tests/unit/

# Test spécifique
npm test -- tests/integration/organization-membership-flow.integration.test.ts

# Avec couverture
npm run test:coverage
```

### Configuration Backend

Les tests utilisent :
- **Vitest** comme framework de test
- **Supertest** pour les tests d'API
- **Firebase Emulator** pour les tests de base de données
- **Mocks** pour isoler les dépendances

### Bonnes Pratiques Backend

1. **Isolation** - Chaque test doit être indépendant
2. **Nettoyage** - Toujours nettoyer les données après chaque test
3. **Nommage** - Utiliser des noms descriptifs pour les tests
4. **Assertions** - Tester les comportements, pas l'implémentation
5. **Mocks** - Mocker les dépendances externes

### Helpers Disponibles

```typescript
import { 
  generateTestUser, 
  generateTestOrganization, 
  cleanupTestData 
} from './helpers/test-helpers';

// Créer un utilisateur de test
const user = await generateTestUser();

// Créer une organisation de test
const org = await generateTestOrganization();

// Nettoyer après le test
await cleanupTestData(user.uid, org.id);
```

### Débogage Backend

Pour déboguer les tests :

```bash
# Logs détaillés
DEBUG=test:* npm test

# Mode watch
npm test -- --watch

# Test spécifique avec logs
npm test -- --reporter=verbose tests/integration/organization-membership-flow.integration.test.ts
```

## Types de tests

### Tests Unitaires
- **Framework** : Jest/Vitest
- **Coverage** : > 80%
- **Scope** : Fonctions et services individuels

### Tests d'Intégration
- **Framework** : Jest + Firebase Emulators
- **Scope** : Interaction entre services
- **Database** : Firestore Emulator

### Tests End-to-End
- **Framework** : Playwright/Cypress
- **Scope** : Workflows utilisateur complets
- **Environment** : Staging

## Structure des tests

```
tests/
├── unit/           # Tests unitaires
├── integration/    # Tests d'intégration
├── e2e/           # Tests end-to-end
├── helpers/       # Utilitaires de test
└── fixtures/      # Données de test
```

## Commandes

```bash
# Tous les tests
npm test

# Tests unitaires uniquement
npm run test:unit

# Tests d'intégration
npm run test:integration

# Tests E2E
npm run test:e2e

# Coverage
npm run test:coverage
```

## Configuration

### Jest Configuration
```javascript
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts'
  ]
};
```

### Firebase Emulators
```json
{
  "emulators": {
    "firestore": {
      "port": 8080
    },
    "functions": {
      "port": 5001
    }
  }
}
```

## Bonnes pratiques

- Tests isolés et indépendants
- Données de test déterministes
- Nettoyage après chaque test
- Mocking des services externes
- Tests de régression pour les bugs