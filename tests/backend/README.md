# Tests Backend AttendanceX

Suite de tests complète pour le backend AttendanceX, couvrant tous les aspects du système d'authentification, de gestion des tenants, d'événements, et d'API.

## 🚀 Démarrage Rapide

```bash
# Installation des dépendances
cd tests/backend
npm install

# Exécuter tous les tests complets
npm run test:comprehensive

# Exécuter des tests spécifiques
npm run test:auth          # Tests d'authentification
npm run test:invitations   # Tests d'invitations utilisateurs
npm run test:tenants       # Tests de gestion des tenants
npm run test:events        # Tests d'événements et présence
npm run test:integration   # Tests d'intégration API
```

## 📋 Structure des Tests

### Tests Complets (`comprehensive/`)
- **`auth.comprehensive.test.ts`** - Tests complets du système d'authentification
- **`user-invitations.comprehensive.test.ts`** - Tests du système d'invitations
- **`tenant-management.comprehensive.test.ts`** - Tests de gestion des tenants
- **`events-attendance.comprehensive.test.ts`** - Tests d'événements et présence
- **`api-integration.comprehensive.test.ts`** - Tests d'intégration complète

### Tests par Catégorie
- **`unit/`** - Tests unitaires des composants individuels
- **`integration/`** - Tests d'intégration entre services
- **`e2e/`** - Tests end-to-end des workflows complets
- **`performance/`** - Tests de performance et charge

### Utilitaires (`helpers/`)
- **`test-setup.ts`** - Configuration et utilitaires pour les tests

## 🧪 Types de Tests

### 1. Tests d'Authentification
```bash
npm run test:auth
```

Couvre :
- Inscription et connexion utilisateur
- Gestion des tokens (access/refresh)
- Réinitialisation de mot de passe
- Vérification d'email
- Authentification à deux facteurs
- Gestion des sessions
- Sécurité des comptes

### 2. Tests d'Invitations Utilisateurs
```bash
npm run test:invitations
```

Couvre :
- Invitations individuelles et en lot
- Import CSV d'invitations
- Gestion des invitations (renvoyer, annuler)
- Routes publiques d'acceptation/refus
- Statistiques d'invitations
- Isolation par tenant

### 3. Tests de Gestion des Tenants
```bash
npm run test:tenants
```

Couvre :
- Création et configuration des tenants
- Onboarding et configuration
- Gestion des membres
- Analytics et usage
- Plans et fonctionnalités
- Suppression et archivage

### 4. Tests d'Événements et Présence
```bash
npm run test:events
```

Couvre :
- Création et gestion d'événements
- Check-in/check-out manuel et QR code
- Événements récurrents
- Statistiques de présence
- Notifications d'événements
- Analytics de présence

### 5. Tests d'Intégration API
```bash
npm run test:integration
```

Couvre :
- Workflows complets end-to-end
- Cohérence des données
- Gestion d'erreurs
- Performance et pagination
- Isolation des tenants
- Validation des règles métier

## 📊 Couverture de Code

Les tests visent une couverture minimale de :
- **85%** pour les lignes de code
- **85%** pour les fonctions
- **80%** pour les branches
- **85%** pour les instructions

```bash
# Générer un rapport de couverture
npm run test:coverage

# Voir le rapport HTML
open coverage/backend/lcov-report/index.html
```

## 🛠️ Configuration

### Variables d'Environnement
```bash
# Copier le fichier d'exemple
cp .env.test.example .env.test

# Configurer les variables nécessaires
NODE_ENV=test
FIREBASE_PROJECT_ID=test-project
API_URL=http://localhost:5001/test-project/europe-west1/api
```

### Configuration Jest
La configuration Jest est dans `jest.config.js` et inclut :
- Support TypeScript avec ts-jest
- Mapping des modules
- Configuration de couverture
- Timeouts et setup

## 🚦 Exécution en CI/CD

```bash
# Pour l'intégration continue
npm run test:ci

# Avec génération de rapports
npm run test:comprehensive
```

Les rapports sont générés dans :
- `test-results/backend/` - Rapports JSON et HTML
- `coverage/backend/` - Rapports de couverture

## 🔧 Développement

### Ajouter de Nouveaux Tests

1. **Tests Unitaires** - Ajouter dans `unit/`
```typescript
// unit/services/new-service.test.ts
describe('NewService', () => {
  it('should do something', () => {
    // Test implementation
  });
});
```

2. **Tests d'Intégration** - Ajouter dans `integration/`
```typescript
// integration/new-feature.integration.test.ts
describe('New Feature Integration', () => {
  beforeAll(async () => {
    app = await setupTestApp();
  });
  
  it('should integrate properly', async () => {
    // Integration test
  });
});
```

3. **Tests Complets** - Étendre les fichiers existants
```typescript
describe('New Feature - Comprehensive Tests', () => {
  // Comprehensive test suite
});
```

### Utilitaires de Test

```typescript
import { 
  setupTestApp, 
  cleanupTestApp, 
  createTestUser, 
  createTestTenant,
  getAuthToken 
} from '../helpers/test-setup';

// Créer des données de test
const tenant = await createTestTenant();
const user = await createTestUser({ tenantId: tenant.id });
const token = await getAuthToken(user);
```

### Debugging

```bash
# Exécuter avec debug
npm run test:debug

# Exécuter un test spécifique
npm test -- --testNamePattern="should create user"

# Mode watch pour développement
npm run test:watch
```

## 📈 Métriques et Rapports

### Rapport Complet
Le script `run-all-tests.ts` génère :
- Rapport de synthèse console
- Rapport JSON détaillé
- Rapport HTML interactif
- Métriques de performance

### Métriques Suivies
- Nombre de tests par suite
- Taux de réussite/échec
- Temps d'exécution
- Couverture de code
- Performance des requêtes

## 🔍 Bonnes Pratiques

### Structure des Tests
```typescript
describe('Feature Name', () => {
  beforeAll(async () => {
    // Setup global pour la suite
  });

  afterAll(async () => {
    // Cleanup global
  });

  describe('Specific Functionality', () => {
    beforeEach(() => {
      // Setup pour chaque test
    });

    it('should behave correctly', async () => {
      // Arrange
      const data = { /* test data */ };
      
      // Act
      const response = await request(app)
        .post('/endpoint')
        .send(data);
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
```

### Nommage des Tests
- Utiliser des descriptions claires et spécifiques
- Commencer par "should" pour les comportements attendus
- Inclure le contexte et le résultat attendu

### Données de Test
- Utiliser les utilitaires fournis pour créer des données
- Nettoyer les données après chaque test
- Éviter les dépendances entre tests

### Assertions
- Vérifier les codes de statut HTTP
- Valider la structure des réponses
- Tester les cas d'erreur et les edge cases
- Vérifier l'isolation des tenants

## 🚨 Dépannage

### Problèmes Courants

1. **Tests qui échouent de manière intermittente**
   - Vérifier les timeouts
   - S'assurer du nettoyage des données
   - Éviter les dépendances temporelles

2. **Erreurs de connexion à la base de données**
   - Vérifier la configuration Firebase
   - S'assurer que l'émulateur est démarré
   - Vérifier les variables d'environnement

3. **Problèmes de permissions**
   - Vérifier les rôles des utilisateurs de test
   - S'assurer que les tenants sont correctement configurés
   - Valider les tokens d'authentification

### Logs et Debug
```bash
# Activer les logs détaillés
DEBUG=* npm test

# Logs Firebase uniquement
DEBUG=firebase:* npm test

# Logs des tests uniquement
DEBUG=test:* npm test
```

## 📚 Ressources

- [Documentation Jest](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Firebase Testing](https://firebase.google.com/docs/emulator-suite)
- [TypeScript Testing](https://typescript-eslint.io/docs/)

## 🤝 Contribution

1. Ajouter des tests pour toute nouvelle fonctionnalité
2. Maintenir la couverture de code au-dessus des seuils
3. Suivre les conventions de nommage
4. Documenter les cas de test complexes
5. Exécuter la suite complète avant les commits

---

Pour plus d'informations, consultez la documentation du projet principal ou contactez l'équipe de développement.