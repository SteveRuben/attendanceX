# Guide Complet des Tests Backend

Ce guide explique comment utiliser la suite de tests complète du backend AttendanceX.

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Installation](#installation)
3. [Exécution des Tests](#exécution-des-tests)
4. [Types de Tests](#types-de-tests)
5. [Structure des Tests](#structure-des-tests)
6. [Rapports et Couverture](#rapports-et-couverture)
7. [Développement](#développement)
8. [CI/CD](#cicd)
9. [Dépannage](#dépannage)

## Vue d'ensemble

La suite de tests backend couvre :
- ✅ **Authentification** - Inscription, connexion, tokens, 2FA
- ✅ **Invitations** - Gestion complète des invitations utilisateurs
- ✅ **Tenants** - Multi-tenant, onboarding, analytics
- ✅ **Événements** - Création, gestion, présence, QR codes
- ✅ **API** - Intégration complète, workflows end-to-end

### Statistiques
- **5 suites de tests complets** couvrant tous les aspects du backend
- **200+ tests** individuels
- **85%+ de couverture de code** visée
- **Tests d'intégration** avec Firebase Emulator
- **Tests de performance** et de charge

## Installation

### Prérequis
```bash
# Node.js 18+ et npm
node --version  # v18.0.0 ou supérieur
npm --version   # 9.0.0 ou supérieur

# Firebase CLI (optionnel, pour l'émulateur)
npm install -g firebase-tools
```

### Installation des Dépendances
```bash
# Depuis la racine du projet
npm install

# Installer les dépendances de test
cd tests/backend
npm install
```

### Configuration
```bash
# Copier le fichier de configuration
cp tests/backend/.env.test.example tests/backend/.env.test

# Éditer les variables si nécessaire
nano tests/backend/.env.test
```

## Exécution des Tests

### Windows (PowerShell)
```powershell
# Tous les tests complets
.\run-backend-tests.ps1

# Tests spécifiques
.\run-backend-tests.ps1 -TestType auth
.\run-backend-tests.ps1 -TestType invitations
.\run-backend-tests.ps1 -TestType tenants
.\run-backend-tests.ps1 -TestType events
.\run-backend-tests.ps1 -TestType integration

# Avec couverture
.\run-backend-tests.ps1 -Coverage

# Mode développement
.\run-backend-tests.ps1 -Watch

# Nettoyer avant les tests
.\run-backend-tests.ps1 -Clean

# Mode debug
.\run-backend-tests.ps1 -Debug
```

### Linux/Mac (Bash)
```bash
# Rendre le script exécutable
chmod +x run-backend-tests.sh

# Tous les tests complets
./run-backend-tests.sh

# Tests spécifiques
./run-backend-tests.sh --auth
./run-backend-tests.sh --invitations
./run-backend-tests.sh --tenants
./run-backend-tests.sh --events
./run-backend-tests.sh --integration

# Avec couverture
./run-backend-tests.sh --coverage

# Mode développement
./run-backend-tests.sh --watch

# Nettoyer avant les tests
./run-backend-tests.sh --clean

# Mode debug
./run-backend-tests.sh --debug
```

### Directement avec npm
```bash
cd tests/backend

# Tous les tests
npm test

# Tests complets avec rapport
npm run test:comprehensive

# Tests spécifiques
npm run test:auth
npm run test:invitations
npm run test:tenants
npm run test:events
npm run test:integration

# Avec couverture
npm run test:coverage

# Mode watch
npm run test:watch

# Mode CI
npm run test:ci
```

## Types de Tests

### 1. Tests d'Authentification (`auth.comprehensive.test.ts`)

**Couverture :**
- Inscription utilisateur (validation, sécurité)
- Connexion (credentials, rate limiting)
- Gestion des tokens (access, refresh, expiration)
- Réinitialisation de mot de passe
- Vérification d'email
- Authentification à deux facteurs (2FA)
- Gestion des sessions
- Statuts de compte (actif, suspendu, verrouillé)

**Commande :**
```bash
npm run test:auth
```

### 2. Tests d'Invitations (`user-invitations.comprehensive.test.ts`)

**Couverture :**
- Invitations individuelles
- Invitations en lot (bulk)
- Import CSV
- Gestion des invitations (renvoyer, annuler)
- Routes publiques (accepter, décliner)
- Statistiques d'invitations
- Permissions et isolation par tenant

**Commande :**
```bash
npm run test:invitations
```

### 3. Tests de Gestion des Tenants (`tenant-management.comprehensive.test.ts`)

**Couverture :**
- Création et configuration
- Onboarding multi-étapes
- Gestion des membres
- Analytics et usage
- Plans et fonctionnalités
- Limites et quotas
- Suppression et archivage

**Commande :**
```bash
npm run test:tenants
```

### 4. Tests d'Événements et Présence (`events-attendance.comprehensive.test.ts`)

**Couverture :**
- Création et gestion d'événements
- Événements récurrents
- Check-in/check-out manuel
- Check-in par QR code
- Statistiques de présence
- Notifications d'événements
- Analytics de présence
- Isolation par tenant

**Commande :**
```bash
npm run test:events
```

### 5. Tests d'Intégration API (`api-integration.comprehensive.test.ts`)

**Couverture :**
- Workflows complets end-to-end
- Cohérence des données
- Gestion d'erreurs
- Performance et pagination
- Validation des règles métier
- Isolation des tenants
- Rate limiting

**Commande :**
```bash
npm run test:integration
```

## Structure des Tests

```
tests/backend/
├── comprehensive/              # Tests complets
│   ├── auth.comprehensive.test.ts
│   ├── user-invitations.comprehensive.test.ts
│   ├── tenant-management.comprehensive.test.ts
│   ├── events-attendance.comprehensive.test.ts
│   ├── api-integration.comprehensive.test.ts
│   └── run-all-tests.ts       # Script d'exécution
├── integration/                # Tests d'intégration
├── unit/                       # Tests unitaires
├── e2e/                        # Tests end-to-end
├── helpers/                    # Utilitaires
│   └── test-setup.ts          # Configuration des tests
├── setup/                      # Configuration Jest
│   └── jest.setup.ts
├── jest.config.js             # Configuration Jest
├── package.json               # Dépendances
└── README.md                  # Documentation
```

## Rapports et Couverture

### Rapports Générés

Après l'exécution des tests, les rapports sont disponibles dans :

```
test-results/backend/
├── comprehensive-test-report.html    # Rapport HTML interactif
├── comprehensive-test-report.json    # Rapport JSON détaillé
├── junit.xml                         # Rapport JUnit (CI/CD)
└── lcov-report/                      # Rapport de couverture
    └── index.html                    # Couverture HTML
```

### Visualiser les Rapports

**Windows :**
```powershell
# Rapport HTML
Start-Process test-results/backend/comprehensive-test-report.html

# Couverture
Start-Process test-results/backend/lcov-report/index.html
```

**Linux/Mac :**
```bash
# Rapport HTML
open test-results/backend/comprehensive-test-report.html

# Couverture
open test-results/backend/lcov-report/index.html
```

### Métriques de Couverture

Objectifs de couverture :
- **Lignes** : 85%+
- **Fonctions** : 85%+
- **Branches** : 80%+
- **Instructions** : 85%+

Zones critiques (90%+) :
- Services d'authentification
- Gestion des permissions
- Validation des données
- Logique métier

## Développement

### Ajouter de Nouveaux Tests

1. **Créer le fichier de test**
```typescript
// tests/backend/comprehensive/new-feature.comprehensive.test.ts
import { setupTestApp, cleanupTestApp } from '../helpers/test-setup';

describe('New Feature - Comprehensive Tests', () => {
  let app: Express;

  beforeAll(async () => {
    app = await setupTestApp();
  });

  afterAll(async () => {
    await cleanupTestApp();
  });

  describe('Feature Functionality', () => {
    it('should work correctly', async () => {
      // Test implementation
    });
  });
});
```

2. **Utiliser les utilitaires**
```typescript
import { 
  createTestUser, 
  createTestTenant, 
  getAuthToken 
} from '../helpers/test-setup';

const tenant = await createTestTenant();
const user = await createTestUser({ tenantId: tenant.id });
const token = await getAuthToken(user);
```

3. **Tester l'API**
```typescript
import request from 'supertest';

const response = await request(app)
  .post('/v1/endpoint')
  .set('Authorization', `Bearer ${token}`)
  .set('X-Tenant-ID', tenant.id)
  .send(data)
  .expect(200);

expect(response.body.success).toBe(true);
```

### Mode Watch pour Développement

```bash
# Démarre Jest en mode watch
npm run test:watch

# Ou avec le script
.\run-backend-tests.ps1 -Watch
```

En mode watch :
- Les tests se relancent automatiquement
- Filtrage interactif des tests
- Couverture en temps réel

### Debugging

```bash
# Mode debug avec logs détaillés
npm run test:debug

# Ou avec le script
.\run-backend-tests.ps1 -Debug

# Avec Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand
```

## CI/CD

### GitHub Actions

```yaml
# .github/workflows/backend-tests.yml
name: Backend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          npm install
          cd tests/backend && npm install
          
      - name: Run tests
        run: ./run-backend-tests.sh --ci
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/backend/lcov.info
          
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: test-results/backend/
```

### GitLab CI

```yaml
# .gitlab-ci.yml
backend-tests:
  stage: test
  image: node:18
  script:
    - npm install
    - cd tests/backend && npm install
    - cd ../..
    - ./run-backend-tests.sh --ci
  artifacts:
    reports:
      junit: test-results/backend/junit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/backend/cobertura-coverage.xml
    paths:
      - test-results/backend/
      - coverage/backend/
```

### Mode CI

```bash
# Exécution optimisée pour CI/CD
npm run test:ci

# Ou avec le script
.\run-backend-tests.ps1 -CI
```

Caractéristiques du mode CI :
- Pas de mode watch
- Génération de tous les rapports
- Sortie optimisée pour les logs CI
- Timeouts adaptés
- Parallélisation maximale

## Dépannage

### Problèmes Courants

#### 1. Tests qui échouent de manière intermittente

**Symptôme :** Tests qui passent parfois et échouent parfois

**Solutions :**
```bash
# Augmenter les timeouts
export TEST_TIMEOUT=60000

# Désactiver la parallélisation
npm test -- --runInBand

# Nettoyer et relancer
.\run-backend-tests.ps1 -Clean
```

#### 2. Erreurs de connexion Firebase

**Symptôme :** `ECONNREFUSED localhost:8080`

**Solutions :**
```bash
# Vérifier que l'émulateur est démarré
curl http://localhost:8080

# Démarrer manuellement l'émulateur
cd backend
firebase emulators:start --only firestore,auth

# Vérifier les variables d'environnement
echo $FIRESTORE_EMULATOR_HOST
```

#### 3. Problèmes de mémoire

**Symptôme :** `JavaScript heap out of memory`

**Solutions :**
```bash
# Augmenter la mémoire Node.js
export NODE_OPTIONS="--max-old-space-size=4096"

# Réduire la parallélisation
npm test -- --maxWorkers=2
```

#### 4. Tests lents

**Symptôme :** Tests qui prennent trop de temps

**Solutions :**
```bash
# Identifier les tests lents
npm test -- --verbose

# Exécuter seulement les tests rapides
npm test -- --testPathPattern=unit

# Optimiser la parallélisation
npm test -- --maxWorkers=50%
```

### Logs et Debug

```bash
# Activer tous les logs
export DEBUG=*
npm test

# Logs Firebase uniquement
export DEBUG=firebase:*
npm test

# Logs des tests uniquement
export DEBUG=test:*
npm test

# Logs détaillés Jest
npm test -- --verbose --detectOpenHandles
```

### Nettoyage

```bash
# Nettoyer tous les fichiers temporaires
.\run-backend-tests.ps1 -Clean

# Nettoyer manuellement
rm -rf test-results/backend/*
rm -rf coverage/backend/*
rm -rf tests/backend/node_modules/.cache
```

## Bonnes Pratiques

### 1. Écriture des Tests

- ✅ Utiliser des descriptions claires et spécifiques
- ✅ Tester les cas normaux ET les cas d'erreur
- ✅ Isoler les tests (pas de dépendances entre tests)
- ✅ Nettoyer les données après chaque test
- ✅ Utiliser les utilitaires fournis

### 2. Organisation

- ✅ Grouper les tests par fonctionnalité
- ✅ Utiliser `describe` pour structurer
- ✅ Séparer setup/teardown avec `beforeAll`/`afterAll`
- ✅ Nommer les tests avec "should"

### 3. Performance

- ✅ Éviter les timeouts trop longs
- ✅ Utiliser la parallélisation
- ✅ Réutiliser les données de test quand possible
- ✅ Nettoyer seulement ce qui est nécessaire

### 4. Maintenance

- ✅ Maintenir la couverture au-dessus des seuils
- ✅ Mettre à jour les tests avec le code
- ✅ Documenter les cas de test complexes
- ✅ Réviser régulièrement les tests obsolètes

## Ressources

- [Documentation Jest](https://jestjs.io/)
- [Supertest](https://github.com/visionmedia/supertest)
- [Firebase Emulator](https://firebase.google.com/docs/emulator-suite)
- [TypeScript Testing](https://typescript-eslint.io/)

## Support

Pour toute question ou problème :
1. Consulter ce guide
2. Vérifier les issues GitHub
3. Contacter l'équipe de développement

---

**Dernière mise à jour :** Décembre 2024  
**Version :** 1.0.0  
**Mainteneur :** Équipe AttendanceX