# Tests Backend - AttendanceX

Ce dossier contient tous les tests pour le backend AttendanceX.

## Structure

```
backend/tests/
├── integration/          # Tests d'intégration API
├── unit/                # Tests unitaires des services
├── helpers/             # Utilitaires et helpers de test
└── README.md           # Ce fichier
```

## Types de Tests

### Tests d'Intégration (`integration/`)
Tests end-to-end qui testent l'API complète avec une base de données réelle ou simulée.

- **organization-membership-flow.integration.test.ts** - Tests du flux d'appartenance aux organisations

### Tests Unitaires (`unit/`)
Tests isolés des services et fonctions individuelles.

- **user-organizations.test.ts** - Tests du service getUserOrganizations

### Helpers (`helpers/`)
Utilitaires partagés pour faciliter l'écriture des tests.

- **test-helpers.ts** - Fonctions de génération de données de test et nettoyage

## Exécution des Tests

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

## Configuration

Les tests utilisent :
- **Vitest** comme framework de test
- **Supertest** pour les tests d'API
- **Firebase Emulator** pour les tests de base de données
- **Mocks** pour isoler les dépendances

## Bonnes Pratiques

1. **Isolation** - Chaque test doit être indépendant
2. **Nettoyage** - Toujours nettoyer les données après chaque test
3. **Nommage** - Utiliser des noms descriptifs pour les tests
4. **Assertions** - Tester les comportements, pas l'implémentation
5. **Mocks** - Mocker les dépendances externes

## Ajout de Nouveaux Tests

1. Créer le fichier de test dans le bon dossier (`integration/` ou `unit/`)
2. Utiliser les helpers existants pour la génération de données
3. Suivre la convention de nommage : `*.test.ts`
4. Ajouter la documentation appropriée

## Helpers Disponibles

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

## Débogage

Pour déboguer les tests :

```bash
# Logs détaillés
DEBUG=test:* npm test

# Mode watch
npm test -- --watch

# Test spécifique avec logs
npm test -- --reporter=verbose tests/integration/organization-membership-flow.integration.test.ts
```