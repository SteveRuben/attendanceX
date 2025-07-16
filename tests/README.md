# Tests Documentation

Ce dossier contient tous les tests pour l'application AttendanceX, organisés par type et par domaine.

## Structure des Tests

```
tests/
├── backend/           # Tests backend
│   ├── unit/         # Tests unitaires
│   ├── integration/  # Tests d'intégration
│   └── e2e/          # Tests end-to-end
├── frontend/         # Tests frontend
│   ├── unit/         # Tests unitaires
│   ├── integration/  # Tests d'intégration
│   └── e2e/          # Tests end-to-end
├── config/           # Configurations Jest et Playwright
├── helpers/          # Utilitaires et mocks
└── README.md         # Cette documentation
```

## Tests Frontend d'Authentification

### Tests Unitaires

#### Pages d'Authentification
- **Login.test.tsx** : Tests pour la page de connexion
- **Register.test.tsx** : Tests pour la page d'inscription
- **ForgotPassword.test.tsx** : Tests pour la page de mot de passe oublié
- **ResetPassword.test.tsx** : Tests pour la page de réinitialisation

#### Hooks
- **use-auth.test.tsx** : Tests pour le hook d'authentification

### Tests d'Intégration
- **auth-flow.test.tsx** : Tests du flux complet d'authentification

### Tests E2E
- **auth-flow.spec.ts** : Tests end-to-end avec Playwright

## Exécution des Tests

### Tests Unitaires Frontend
```bash
# Tous les tests unitaires frontend
npm run test:frontend:unit

# Tests spécifiques
npm run test:frontend:unit -- Login.test.tsx
npm run test:frontend:unit -- --watch
```

### Tests d'Intégration Frontend
```bash
# Tests d'intégration frontend
npm run test:frontend:integration

# Avec coverage
npm run test:frontend:integration -- --coverage
```

### Tests E2E
```bash
# Tests E2E avec Playwright
npm run test:e2e

# Tests E2E en mode headed
npm run test:e2e -- --headed

# Tests E2E sur un navigateur spécifique
npm run test:e2e -- --project=chromium
```

### Tous les Tests
```bash
# Exécuter tous les tests
npm run test

# Avec coverage
npm run test:coverage
```

## Configuration

### Jest (Tests Unitaires et d'Intégration)
- **jest.frontend.config.js** : Configuration pour les tests frontend
- **jest.config.js** : Configuration globale Jest

### Playwright (Tests E2E)
- **playwright.config.ts** : Configuration Playwright

## Helpers et Mocks

### Setup
- **test-environment.ts** : Configuration de l'environnement de test

### Mocks
- **auth-mocks.ts** : Mocks pour l'authentification

## Couverture de Tests

### Pages d'Authentification Testées

#### Login.tsx
- ✅ Rendu des éléments du formulaire
- ✅ Validation des champs
- ✅ Soumission du formulaire
- ✅ Gestion des erreurs
- ✅ Navigation
- ✅ Accessibilité
- ✅ Visibilité du mot de passe

#### Register.tsx
- ✅ Rendu du formulaire complet
- ✅ Validation des champs requis
- ✅ Validation de l'email
- ✅ Validation des mots de passe
- ✅ Indicateur de force du mot de passe
- ✅ Soumission et gestion d'erreurs
- ✅ Navigation

#### ForgotPassword.tsx
- ✅ Rendu du formulaire
- ✅ Validation de l'email
- ✅ État de succès
- ✅ Gestion des erreurs
- ✅ Navigation

#### ResetPassword.tsx
- ✅ Validation du token
- ✅ Validation des mots de passe
- ✅ Indicateur de force
- ✅ État de succès
- ✅ Gestion des erreurs

### Hook useAuth Testé
- ✅ État initial
- ✅ Connexion/Déconnexion
- ✅ Inscription
- ✅ Mot de passe oublié/réinitialisation
- ✅ Gestion des tokens
- ✅ États de chargement

### Flux d'Intégration Testés
- ✅ Flux de connexion complet
- ✅ Flux d'inscription complet
- ✅ Flux de mot de passe oublié
- ✅ Flux de réinitialisation
- ✅ Navigation entre pages
- ✅ Gestion d'état d'authentification

### Tests E2E Couverts
- ✅ Interface utilisateur complète
- ✅ Navigation entre pages
- ✅ Validation des formulaires
- ✅ Accessibilité
- ✅ Design responsive
- ✅ Interactions utilisateur

## Bonnes Pratiques

### Tests Unitaires
1. **Isolation** : Chaque test est indépendant
2. **Mocking** : Services et dépendances mockés
3. **Assertions claires** : Tests lisibles et maintenables
4. **Couverture complète** : Tous les cas d'usage testés

### Tests d'Intégration
1. **Flux réels** : Tests des interactions entre composants
2. **Providers** : Utilisation des vrais providers React
3. **État partagé** : Tests de la gestion d'état globale

### Tests E2E
1. **Scénarios utilisateur** : Tests des parcours complets
2. **Environnement réel** : Tests dans un navigateur réel
3. **Accessibilité** : Vérification des standards WCAG
4. **Responsive** : Tests sur différentes tailles d'écran

## Métriques de Couverture

### Objectifs de Couverture
- **Lignes** : > 80%
- **Fonctions** : > 80%
- **Branches** : > 75%
- **Statements** : > 80%

### Génération des Rapports
```bash
# Rapport de couverture HTML
npm run test:coverage

# Rapport de couverture JSON
npm run test:coverage -- --coverageReporters=json
```

## Débogage des Tests

### Tests qui Échouent
```bash
# Mode verbose
npm run test -- --verbose

# Mode debug
npm run test -- --detectOpenHandles

# Tests spécifiques
npm run test -- --testNamePattern="should login successfully"
```

### Tests E2E qui Échouent
```bash
# Mode debug Playwright
npm run test:e2e -- --debug

# Screenshots en cas d'échec
npm run test:e2e -- --screenshot=only-on-failure

# Vidéos des tests
npm run test:e2e -- --video=retain-on-failure
```

## CI/CD

### GitHub Actions
Les tests sont exécutés automatiquement sur :
- **Pull Requests** : Tests unitaires et d'intégration
- **Push sur main** : Tous les tests incluant E2E
- **Releases** : Suite complète avec rapports de couverture

### Rapports
- **Coverage** : Publié sur Codecov
- **Test Results** : Disponibles dans les artifacts GitHub
- **E2E Videos** : Stockées en cas d'échec

## Contribution

### Ajouter de Nouveaux Tests
1. Suivre la structure existante
2. Utiliser les helpers et mocks fournis
3. Maintenir la couverture de code
4. Documenter les cas de test complexes

### Standards de Code
- **TypeScript** : Types stricts
- **ESLint** : Règles de qualité
- **Prettier** : Formatage cohérent
- **Naming** : Noms descriptifs pour les tests