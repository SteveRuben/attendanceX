# Guide de Démarrage Rapide - Tests Backend

## 🚀 **Installation et Configuration**

### **Prérequis**
```bash
# Node.js 20+
node --version

# Firebase CLI
npm install -g firebase-tools

# Dépendances de test
cd backend/functions
npm install
```

### **Variables d'environnement**
```bash
# Créer .env.test dans backend/functions/
cp .env.example .env.test

# Variables de test
NODE_ENV=test
FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
JWT_SECRET=test-jwt-secret
JWT_REFRESH_SECRET=test-refresh-secret
```

## 🧪 **Exécution des Tests**

### **Tests rapides**
```bash
# Tous les tests
npm run test

# Tests unitaires uniquement
npm run test:unit

# Tests d'intégration uniquement
npm run test:integration

# Tests avec couverture
npm run test:coverage

# Mode watch (développement)
npm run test:watch
```

### **Tests spécifiques**
```bash
# Service spécifique
npm test -- --testPathPattern=auth.service.test.ts

# Contrôleur spécifique
npm test -- --testPathPattern=user.controller.test.ts

# Pattern de test
npm test -- --testNamePattern="should create user"

# Fichier spécifique
npm test tests/backend/unit/services/auth.service.test.ts
```

## 📊 **Rapport de Couverture**

### **Génération**
```bash
# Rapport HTML
npm run test:coverage
open coverage/backend/index.html

# Rapport console
npm test -- --coverage --coverageReporters=text

# Rapport CI/CD
npm test -- --coverage --coverageReporters=lcov
```

### **Seuils de couverture**
- **Services** : 95% minimum
- **Contrôleurs** : 90% minimum
- **Modèles** : 90% minimum
- **Global** : 85% minimum

## 🔧 **Structure des Tests**

### **Organisation**
```
tests/backend/
├── unit/                    # Tests unitaires
│   ├── services/           # Tests des services
│   ├── models/             # Tests des modèles
│   ├── controllers/        # Tests des contrôleurs
│   └── middleware/         # Tests des middleware
├── integration/            # Tests d'intégration
│   ├── routes/             # Tests des routes API
│   └── database/           # Tests base de données
├── setup/                  # Configuration des tests
│   └── jest.setup.ts       # Setup global Jest
└── helpers/                # Utilitaires de test
```

### **Conventions de nommage**
- **Fichiers** : `*.test.ts` ou `*.spec.ts`
- **Suites** : Nom du service/contrôleur testé
- **Tests** : `should [action] [condition]`

## 📝 **Écriture de Tests**

### **Template de base**
```typescript
// tests/backend/unit/services/example.service.test.ts
import { ExampleService } from '../services/example.service';

describe('ExampleService', () => {
  let service: ExampleService;

  beforeEach(() => {
    service = new ExampleService();
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('should perform action successfully', async () => {
      // Arrange
      const input = { /* test data */ };
      const expected = { /* expected result */ };

      // Act
      const result = await service.methodName(input);

      // Assert
      expect(result).toEqual(expected);
    });

    it('should handle error case', async () => {
      // Arrange
      const invalidInput = { /* invalid data */ };

      // Act & Assert
      await expect(service.methodName(invalidInput))
        .rejects.toThrow('Expected error message');
    });
  });
});
```

### **Mocks et Stubs**
```typescript
// Mock d'un service
jest.mock('../services/user.service');
const mockUserService = UserService as jest.MockedClass<typeof UserService>;

// Mock d'une méthode
mockUserService.prototype.getUserById = jest.fn().mockResolvedValue(mockUser);

// Mock avec différents retours
mockUserService.prototype.createUser = jest.fn()
  .mockResolvedValueOnce(successResult)
  .mockRejectedValueOnce(new Error('Failure'));
```

### **Utilitaires de test**
```typescript
// Utilisation des utilitaires globaux
const mockUser = global.testUtils.createMockUser({
  role: UserRole.ADMIN,
  email: 'admin@example.com'
});

const mockRequest = global.testUtils.createMockRequest({
  body: { name: 'Test' },
  user: { uid: 'user-id' }
});

const mockResponse = global.testUtils.createMockResponse();
```

## 🐛 **Débogage des Tests**

### **Tests qui échouent**
```bash
# Mode verbose
npm test -- --verbose

# Logs détaillés
VERBOSE_TESTS=true npm test

# Débogage avec Node
node --inspect-brk node_modules/.bin/jest --runInBand

# Un seul test
npm test -- --testNamePattern="specific test name"
```

### **Problèmes courants**

#### **Mocks non configurés**
```typescript
// ❌ Problème
mockService.method.mockResolvedValue(result);

// ✅ Solution
mockService.prototype.method = jest.fn().mockResolvedValue(result);
```

#### **Async/Await oublié**
```typescript
// ❌ Problème
it('should work', () => {
  service.asyncMethod(); // Pas d'await
  expect(result).toBe(expected);
});

// ✅ Solution
it('should work', async () => {
  await service.asyncMethod();
  expect(result).toBe(expected);
});
```

#### **Mocks non nettoyés**
```typescript
// ✅ Solution
beforeEach(() => {
  jest.clearAllMocks(); // Nettoie les appels
});

afterEach(() => {
  jest.restoreAllMocks(); // Restaure les implémentations
});
```

## 🔍 **Tests d'Intégration**

### **Configuration API**
```typescript
import request from 'supertest';
import express from 'express';

const app = express();
app.use('/api', routes);

// Test d'une route
const response = await request(app)
  .post('/api/users')
  .send(userData)
  .expect(201);

expect(response.body.success).toBe(true);
```

### **Authentification dans les tests**
```typescript
// Mock du middleware d'auth
app.use((req, res, next) => {
  req.user = { uid: 'test-user-id', role: 'admin' };
  next();
});

// Ou utilisation de tokens réels
const token = 'valid-jwt-token';
const response = await request(app)
  .get('/api/protected')
  .set('Authorization', `Bearer ${token}`)
  .expect(200);
```

## 📈 **Optimisation des Tests**

### **Parallélisation**
```bash
# Tests en parallèle (par défaut)
npm test

# Tests séquentiels (débogage)
npm test -- --runInBand

# Nombre de workers
npm test -- --maxWorkers=4
```

### **Cache et performance**
```bash
# Nettoyer le cache
npm test -- --clearCache

# Pas de cache
npm test -- --no-cache

# Mode watch optimisé
npm test -- --watch --watchAll=false
```

## 🚨 **CI/CD Integration**

### **GitHub Actions**
```yaml
# .github/workflows/test.yml
- name: Run Backend Tests
  run: |
    cd backend/functions
    npm ci
    npm run test:ci
    
- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/backend/lcov.info
```

### **Scripts CI**
```json
{
  "scripts": {
    "test:ci": "jest --ci --coverage --watchAll=false --passWithNoTests",
    "test:ci:unit": "jest --ci --testPathPattern=unit",
    "test:ci:integration": "jest --ci --testPathPattern=integration"
  }
}
```

## 📚 **Ressources Utiles**

### **Documentation**
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Guide](https://github.com/visionmedia/supertest)
- [Firebase Testing](https://firebase.google.com/docs/functions/unit-testing)

### **Commandes utiles**
```bash
# Mise à jour des snapshots
npm test -- --updateSnapshot

# Tests modifiés uniquement
npm test -- --onlyChanged

# Tests liés aux fichiers modifiés
npm test -- --findRelatedTests src/file.ts

# Profiling des tests lents
npm test -- --detectSlowTests
```

### **Configuration VS Code**
```json
// .vscode/settings.json
{
  "jest.jestCommandLine": "npm test --",
  "jest.autoRun": "watch",
  "jest.showCoverageOnLoad": true
}
```

## ✅ **Checklist Avant Commit**

- [ ] Tous les tests passent
- [ ] Couverture > 85%
- [ ] Pas de `console.log` oubliés
- [ ] Mocks appropriés
- [ ] Tests d'erreur inclus
- [ ] Documentation mise à jour

```bash
# Script de vérification
npm run test:coverage && npm run lint && npm run build
```

Ce guide vous permet de démarrer rapidement avec les tests backend et de maintenir une qualité élevée du code.