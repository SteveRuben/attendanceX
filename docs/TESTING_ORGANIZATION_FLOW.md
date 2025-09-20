# Tests du Flux d'Appartenance aux Organisations

Ce document décrit la stratégie de test et les procédures pour valider le flux d'appartenance aux organisations dans AttendanceX.

## Vue d'ensemble

Le flux d'appartenance aux organisations comprend plusieurs scénarios complexes qui nécessitent une couverture de test complète :

- Création d'organisation pour nouveaux utilisateurs
- Gestion des utilisateurs avec organisations existantes
- Détection et gestion des appartenances multiples
- Gestion d'erreurs et fallbacks
- Finalisation automatique des inscriptions

## Structure des Tests

### Tests Backend

#### Tests d'Intégration (`backend/tests/integration/organization-membership-flow.integration.test.ts`)

Tests end-to-end de l'API backend :

```typescript
describe('Organization Membership Flow - Integration Tests', () => {
  // Tests de l'endpoint GET /users/{userId}/organizations
  // Tests de l'endpoint POST /organizations avec gestion des appartenances
  // Tests du flux complet d'onboarding
  // Tests de gestion d'erreurs
});
```

**Scénarios couverts :**
- ✅ Utilisateur sans organisation
- ✅ Utilisateur avec une organisation
- ✅ Utilisateur avec plusieurs organisations
- ✅ Gestion des erreurs d'authentification
- ✅ Gestion des utilisateurs inexistants
- ✅ Création d'organisation avec appartenance existante
- ✅ Récupération après organisation supprimée

#### Tests Unitaires (`backend/tests/unit/user-organizations.test.ts`)

Tests des services backend :

```typescript
describe('User Organizations Service', () => {
  // Tests du service getUserOrganizations
  // Tests de validation des permissions
  // Tests de gestion d'erreurs
});
```

### Tests Frontend

#### Tests Unitaires des Composants

**OrganizationSetup Error Handling** (`frontend/tests/unit/components/OrganizationSetup.error-handling.test.tsx`)

```typescript
describe('OrganizationSetup - Gestion d\'erreurs', () => {
  // Tests des erreurs API getUserOrganizations
  // Tests des erreurs createOrganization
  // Tests des états de chargement
  // Tests de récupération d'erreurs
});
```

**Dashboard Error Handling** (`frontend/tests/unit/pages/Dashboard.error-handling.test.tsx`)

```typescript
describe('Dashboard - Gestion d\'erreurs', () => {
  // Tests des erreurs de chargement des données
  // Tests des erreurs partielles
  // Tests des états de chargement
  // Tests pour utilisateurs sans organisation
});
```

#### Tests End-to-End (`frontend/tests/e2e/organization-membership-flow.e2e.test.ts`)

Tests du flux complet côté utilisateur :

```typescript
describe('Organization Membership Flow - E2E Tests', () => {
  // Flux pour nouvel utilisateur
  // Flux pour utilisateur avec organisation existante
  // Gestion d'erreurs E2E
  // Option "Explorer d'abord"
  // Persistance des données
});
```

## Exécution des Tests

### Script de Test Automatisé

Utilisez le script de test automatisé pour exécuter tous les tests :

```bash
node scripts/test-organization-flow.js
```

Ce script :
- ✅ Vérifie l'existence de tous les fichiers de test
- 🔧 Exécute les tests backend (intégration + unitaires)
- 🎨 Exécute les tests frontend (unitaires + E2E)
- 📊 Génère un rapport de couverture
- 🎯 Valide les scénarios spécifiques
- 📈 Fournit un résumé détaillé

### Tests Individuels

#### Backend

```bash
# Tests d'intégration
cd backend
npm test -- tests/integration/organization-membership-flow.integration.test.ts

# Tests unitaires
cd backend
npm test -- tests/unit/user-organizations.test.ts

# Couverture backend
cd backend
npm run test:coverage
```

#### Frontend

```bash
# Tests unitaires OrganizationSetup
cd frontend
npm test -- tests/unit/components/OrganizationSetup.error-handling.test.tsx

# Tests unitaires Dashboard
cd frontend
npm test -- tests/unit/pages/Dashboard.error-handling.test.tsx

# Tests E2E
cd frontend
npm test -- tests/e2e/organization-membership-flow.e2e.test.ts

# Couverture frontend
cd frontend
npm run test:coverage
```

### Configuration Vitest Spécialisée

Utilisez la configuration Vitest spécialisée pour les tests du flux d'organisation :

```bash
npx vitest --config vitest.config.organization-flow.ts
```

## Scénarios de Test

### 1. Nouvel Utilisateur Sans Organisation

**Objectif :** Valider la création d'organisation pour un utilisateur qui n'appartient à aucune organisation.

**Étapes :**
1. Utilisateur accède à `/organization/setup`
2. Vérification : `getUserOrganizations()` retourne `[]`
3. Affichage du formulaire de création
4. Soumission du formulaire
5. Création réussie de l'organisation
6. Redirection vers `/organization/{id}/dashboard`

**Assertions :**
- ✅ Formulaire affiché correctement
- ✅ Validation des champs obligatoires
- ✅ Appel API `createOrganization`
- ✅ Redirection correcte
- ✅ Nettoyage du localStorage

### 2. Utilisateur avec Organisation Existante

**Objectif :** Valider la redirection automatique pour un utilisateur avec une seule organisation.

**Étapes :**
1. Utilisateur accède à `/organization/setup`
2. Vérification : `getUserOrganizations()` retourne une organisation
3. Redirection automatique vers l'organisation existante

**Assertions :**
- ✅ Pas d'affichage du formulaire
- ✅ Message de redirection
- ✅ Redirection vers l'organisation existante

### 3. Utilisateur avec Plusieurs Organisations

**Objectif :** Valider l'affichage du sélecteur d'organisation.

**Étapes :**
1. Utilisateur accède à `/organization/setup`
2. Vérification : `getUserOrganizations()` retourne plusieurs organisations
3. Affichage du sélecteur d'organisation
4. Sélection d'une organisation
5. Redirection vers l'organisation sélectionnée

**Assertions :**
- ✅ Sélecteur affiché avec toutes les organisations
- ✅ Option de créer une nouvelle organisation
- ✅ Redirection correcte après sélection

### 4. Gestion d'Erreurs API

**Objectif :** Valider les fallbacks en cas d'erreur API.

**Scénarios d'erreur :**
- 🔴 API non implémentée (404)
- 🔴 Erreur réseau
- 🔴 Timeout
- 🔴 Erreur serveur (500)

**Assertions :**
- ✅ Pas de crash de l'application
- ✅ Messages d'erreur appropriés
- ✅ Options de récupération
- ✅ Fallback vers mode dégradé

### 5. Finalisation Automatique

**Objectif :** Valider la gestion du cas "utilisateur déjà membre".

**Étapes :**
1. Utilisateur tente de créer une organisation
2. Backend détecte une appartenance existante
3. Retour des informations de l'organisation existante
4. Finalisation automatique de l'inscription
5. Redirection vers l'organisation existante

**Assertions :**
- ✅ Détection de l'appartenance existante
- ✅ Message informatif à l'utilisateur
- ✅ Récupération des données d'organisation
- ✅ Redirection correcte

## Couverture de Code

### Objectifs de Couverture

| Composant | Branches | Fonctions | Lignes | Statements |
|-----------|----------|-----------|--------|------------|
| **Global** | 80% | 80% | 80% | 80% |
| OrganizationSetup | 85% | 90% | 85% | 85% |
| User Service | 90% | 95% | 90% | 90% |
| Dashboard | 80% | 85% | 80% | 80% |

### Zones Critiques

Les zones suivantes nécessitent une couverture maximale :

1. **Gestion d'erreurs** - 95%+
2. **Validation des données** - 100%
3. **Logique de redirection** - 90%+
4. **Appels API** - 85%+

## Helpers de Test

### Backend (`backend/tests/helpers/test-helpers.ts`)

```typescript
// Génération d'utilisateurs de test
const testUser = await generateTestUser();

// Génération d'organisations de test
const testOrg = await generateTestOrganization();

// Nettoyage des données
await cleanupTestData(userId, organizationId);

// Scénarios complexes
const scenario = await setupComplexTestScenario();
```

### Frontend

```typescript
// Mock des services
vi.mock('../services', () => ({
  userService: { getUserOrganizations: vi.fn() },
  organizationService: { createOrganization: vi.fn() }
}));

// Mock de l'authentification
vi.mock('../hooks/use-auth', () => ({
  useAuth: () => ({ user: mockUser })
}));
```

## Débogage des Tests

### Logs de Debug

Activez les logs détaillés pour le débogage :

```bash
DEBUG=test:* npm test
```

### Inspection des Mocks

Vérifiez les appels aux mocks :

```typescript
expect(userService.getUserOrganizations).toHaveBeenCalledWith('user-id');
expect(organizationService.createOrganization).toHaveBeenCalledTimes(1);
```

### Snapshots des États

Utilisez les snapshots pour capturer les états complexes :

```typescript
expect(screen.getByTestId('organization-form')).toMatchSnapshot();
```

## Intégration Continue

### Pipeline de Tests

```yaml
# .github/workflows/test-organization-flow.yml
name: Test Organization Flow
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run organization flow tests
        run: node scripts/test-organization-flow.js
```

### Métriques de Qualité

- ✅ Tous les tests passent
- 📊 Couverture > 80%
- ⚡ Temps d'exécution < 2 minutes
- 🔍 Aucune fuite mémoire
- 📝 Documentation à jour

## Maintenance des Tests

### Mise à Jour Régulière

1. **Hebdomadaire :** Vérification des tests flaky
2. **Mensuelle :** Mise à jour des données de test
3. **Trimestrielle :** Révision de la stratégie de test

### Bonnes Pratiques

- 🎯 Tests focalisés sur un seul aspect
- 🔄 Tests indépendants et reproductibles
- 📝 Noms de tests descriptifs
- 🧹 Nettoyage systématique des données
- 🚀 Optimisation des performances

## Ressources

- [Documentation Vitest](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Firebase Testing](https://firebase.google.com/docs/emulator-suite)
- [Spécifications du flux](../.kiro/specs/organization-membership-flow/)
- [Tests Backend](../backend/tests/)
- [Tests Frontend](../frontend/tests/)

---

**Dernière mise à jour :** $(date)
**Version :** 1.0.0
**Mainteneur :** Équipe AttendanceX