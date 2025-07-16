# Guide de Lancement des Tests Backend

Ce guide explique comment configurer et lancer les tests backend pour AttendanceX.

## 📋 Prérequis

### 1. **Installation des Dépendances**

```bash
# À la racine du projet
npm install

# Installer les dépendances backend spécifiques
cd backend/functions
npm install

# Retourner à la racine
cd ../..
```

### 2. **Dépendances de Test Requises**

Assurez-vous que ces packages sont installés dans `backend/functions/package.json` :

```json
{
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/supertest": "^2.0.12",
    "jest": "^29.5.0",
    "supertest": "^6.3.3",
    "ts-jest": "^29.1.0"
  }
}
```

## 🔧 Configuration

### 1. **Variables d'Environnement**

Le fichier `.env.test` est déjà configuré dans `backend/functions/.env.test` avec :

- Configuration Firebase de test
- Secrets JWT pour les tests
- Configuration email de test
- Paramètres de base de données de test

### 2. **Émulateurs Firebase (Optionnel)**

Pour les tests d'intégration avec Firebase :

```bash
# Installer Firebase CLI si pas déjà fait
npm install -g firebase-tools

# Démarrer les émulateurs (dans un terminal séparé)
firebase emulators:start --only firestore,auth
```

## 🚀 Lancement des Tests

### **Tests Unitaires Backend**

```bash
# Tous les tests unitaires backend
npm run test:backend:unit

# Tests spécifiques
npm run test:backend:unit -- --testPathPattern=controllers
npm run test:backend:unit -- --testPathPattern=services
npm run test:backend:unit -- --testPathPattern=middleware

# Tests avec watch mode
npm run test:backend:watch
```

### **Tests d'Intégration Backend**

```bash
# Tous les tests d'intégration backend
npm run test:backend:integration

# Tests d'intégration spécifiques
npm run test:backend:integration -- --testPathPattern=auth.routes
```

### **Tous les Tests Backend**

```bash
# Tous les tests backend (unitaires + intégration)
npm run test:backend

# Avec couverture de code
npm run test:backend:coverage
```

### **Tests Spécifiques par Fichier**

```bash
# Test d'un contrôleur spécifique
npm run test:backend -- --testPathPattern=auth.controller.test.ts

# Test d'un service spécifique
npm run test:backend -- --testPathPattern=auth.service.test.ts

# Test d'un middleware spécifique
npm run test:backend -- --testPathPattern=auth.test.ts
```

## 🧪 Types de Tests Disponibles

### **1. Tests Unitaires**

#### **Contrôleurs** (`tests/backend/unit/controllers/`)
- `auth.controller.test.ts` - Tests du contrôleur d'authentification
- `user.controller.test.ts` - Tests du contrôleur utilisateur

#### **Services** (`tests/backend/unit/services/`)
- `auth.service.test.ts` - Tests du service d'authentification
- `user.service.test.ts` - Tests du service utilisateur

#### **Middlewares** (`tests/backend/unit/middleware/`)
- `auth.test.ts` - Tests du middleware d'authentification
- `roles.test.ts` - Tests du middleware de rôles

### **2. Tests d'Intégration**

#### **Routes** (`tests/backend/integration/`)
- `auth.routes.test.ts` - Tests des routes d'authentification complètes

## 📊 Couverture de Code

### **Générer un Rapport de Couverture**

```bash
# Rapport de couverture complet
npm run test:backend:coverage

# Rapport HTML (ouvert automatiquement)
npm run test:backend:coverage -- --coverageReporters=html

# Rapport JSON
npm run test:backend:coverage -- --coverageReporters=json
```

### **Objectifs de Couverture**

- **Lignes** : > 75%
- **Fonctions** : > 75%
- **Branches** : > 75%
- **Statements** : > 75%

## 🐛 Débogage des Tests

### **Mode Verbose**

```bash
# Affichage détaillé des tests
npm run test:backend -- --verbose

# Affichage des erreurs détaillées
npm run test:backend -- --detectOpenHandles
```

### **Tests Spécifiques**

```bash
# Exécuter un test spécifique par nom
npm run test:backend -- --testNamePattern="should login user successfully"

# Exécuter les tests d'un describe spécifique
npm run test:backend -- --testNamePattern="AuthController"
```

### **Mode Debug**

```bash
# Debug avec Node.js
node --inspect-brk node_modules/.bin/jest --config=tests/config/jest.backend.config.js --runInBand

# Puis ouvrir Chrome DevTools à chrome://inspect
```

## 🔍 Structure des Tests

### **Organisation des Fichiers**

```
tests/backend/
├── unit/                    # Tests unitaires
│   ├── controllers/         # Tests des contrôleurs
│   │   ├── auth.controller.test.ts
│   │   └── user.controller.test.ts
│   ├── services/           # Tests des services
│   │   ├── auth.service.test.ts
│   │   └── user.service.test.ts
│   └── middleware/         # Tests des middlewares
│       ├── auth.test.ts
│       └── roles.test.ts
├── integration/            # Tests d'intégration
│   └── auth.routes.test.ts
└── README.md              # Ce guide
```

### **Conventions de Nommage**

- **Fichiers de test** : `*.test.ts`
- **Mocks** : `*.mock.ts`
- **Helpers** : `*.helper.ts`

## 📝 Écriture de Nouveaux Tests

### **Template de Test Unitaire**

```typescript
// tests/backend/unit/services/example.service.test.ts
import { ExampleService } from '@/services/example.service';

describe('ExampleService', () => {
  let service: ExampleService;

  beforeEach(() => {
    service = new ExampleService();
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('should do something successfully', async () => {
      // Arrange
      const input = 'test-input';
      const expected = 'expected-output';

      // Act
      const result = await service.methodName(input);

      // Assert
      expect(result).toBe(expected);
    });

    it('should handle error case', async () => {
      // Arrange
      const invalidInput = null;

      // Act & Assert
      await expect(service.methodName(invalidInput))
        .rejects.toThrow('Expected error message');
    });
  });
});
```

### **Template de Test d'Intégration**

```typescript
// tests/backend/integration/example.routes.test.ts
import request from 'supertest';
import express from 'express';
import { exampleRoutes } from '@/routes/example.routes';

describe('Example Routes Integration', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/example', exampleRoutes);
    jest.clearAllMocks();
  });

  describe('GET /example', () => {
    it('should return success response', async () => {
      const response = await request(app)
        .get('/example')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
```

## 🚨 Résolution des Problèmes Courants

### **1. Erreur "Cannot find module"**

```bash
# Vérifier que les dépendances sont installées
cd backend/functions && npm install

# Vérifier la configuration des paths dans tsconfig.json
```

### **2. Erreur "Firebase Admin not initialized"**

```bash
# Vérifier que les mocks Firebase sont bien configurés
# Le fichier backend-test-environment.ts doit être chargé
```

### **3. Tests qui traînent (timeout)**

```bash
# Augmenter le timeout
npm run test:backend -- --testTimeout=60000

# Ou vérifier les promesses non résolues
npm run test:backend -- --detectOpenHandles
```

### **4. Erreur de permissions**

```bash
# Sur Windows, exécuter en tant qu'administrateur
# Sur Linux/Mac, vérifier les permissions des fichiers
chmod +x node_modules/.bin/jest
```

## 📈 Métriques et Rapports

### **Génération de Rapports**

```bash
# Rapport JUnit (pour CI/CD)
npm run test:backend -- --reporters=jest-junit

# Rapport de couverture en plusieurs formats
npm run test:backend:coverage -- --coverageReporters=text,lcov,html,json
```

### **Intégration CI/CD**

Les tests backend sont automatiquement exécutés dans :

- **Pull Requests** : Tests unitaires
- **Push sur main** : Tests complets
- **Releases** : Tests + couverture

## 🔗 Liens Utiles

- [Documentation Jest](https://jestjs.io/docs/getting-started)
- [Documentation Supertest](https://github.com/visionmedia/supertest)
- [Firebase Testing](https://firebase.google.com/docs/emulator-suite)
- [TypeScript Testing](https://kulshekhar.github.io/ts-jest/)

## 💡 Conseils et Bonnes Pratiques

1. **Isolation** : Chaque test doit être indépendant
2. **Mocking** : Mocker les dépendances externes
3. **Nommage** : Utiliser des noms descriptifs
4. **AAA Pattern** : Arrange, Act, Assert
5. **Couverture** : Viser 80%+ de couverture
6. **Performance** : Éviter les tests lents
7. **Maintenance** : Garder les tests simples et lisibles