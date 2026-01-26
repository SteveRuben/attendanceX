# Tests E2E et Performance - AttendanceX

Ce dossier contient tous les tests End-to-End (E2E) et de performance pour l'application AttendanceX, utilisant Playwright.

## 📁 Structure des Tests

```
tests/
├── e2e/
│   ├── smoke.spec.ts           # Tests de fumée basiques
│   ├── public-events.spec.ts   # Tests des pages publiques d'événements
│   ├── performance.spec.ts     # Tests de performance détaillés
│   ├── user-journey.spec.ts    # Tests de parcours utilisateur complets
│   └── fixtures/
│       └── mockData.ts         # Données de test mockées
└── README.md                   # Ce fichier
```

## 🚀 Exécution des Tests

### Prérequis

```bash
# Installer les dépendances
npm install

# Installer les navigateurs Playwright
npx playwright install
```

### Commandes de Test

```bash
# Exécuter tous les tests
npm run test:e2e

# Exécuter les tests en mode UI (interactif)
npx playwright test --ui

# Exécuter un fichier de test spécifique
npx playwright test tests/e2e/smoke.spec.ts

# Exécuter les tests sur un navigateur spécifique
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Exécuter les tests en mode debug
npx playwright test --debug

# Exécuter les tests avec rapport HTML
npx playwright test --reporter=html

# Exécuter les tests contre la production
PLAYWRIGHT_BASE_URL=https://attendance-x.vercel.app npx playwright test
```

### Tests de Performance

```bash
# Exécuter uniquement les tests de performance
npx playwright test tests/e2e/performance.spec.ts

# Exécuter avec rapport détaillé
npx playwright test tests/e2e/performance.spec.ts --reporter=html
```

### Tests de Parcours Utilisateur

```bash
# Exécuter les tests de parcours utilisateur
npx playwright test tests/e2e/user-journey.spec.ts

# Exécuter en mode headed (voir le navigateur)
npx playwright test tests/e2e/user-journey.spec.ts --headed
```

## 📊 Types de Tests

### 1. Tests de Fumée (Smoke Tests)

**Fichier:** `smoke.spec.ts`

Tests basiques pour vérifier que l'application démarre et fonctionne:
- Chargement de la page d'accueil
- Chargement de la page de découverte d'événements
- Navigation de base
- Fonctionnalité de recherche
- Affichage des filtres
- Responsive design
- Gestion des erreurs 404
- Meta tags SEO
- Accessibilité de base

**Exécution:**
```bash
npx playwright test tests/e2e/smoke.spec.ts
```

### 2. Tests des Pages Publiques

**Fichier:** `public-events.spec.ts`

Tests complets des fonctionnalités publiques:
- Page de découverte d'événements
- Recherche d'événements
- Filtres (catégorie, lieu, prix)
- Pagination
- Page de détail d'événement
- Profil d'organisateur
- SEO et accessibilité

**Exécution:**
```bash
npx playwright test tests/e2e/public-events.spec.ts
```

### 3. Tests de Performance

**Fichier:** `performance.spec.ts`

Tests détaillés de performance:
- Temps de chargement des pages
- Core Web Vitals (FCP, LCP, CLS)
- Temps de réponse des API
- Performance de recherche
- Performance des filtres
- Performance de pagination
- Chargement des images
- Efficacité du cache
- Performance mobile
- Conditions réseau lentes
- Utilisation mémoire
- Taille des bundles
- Métriques Lighthouse

**Seuils de Performance:**
- Page Load: < 5000ms
- API Response: < 3000ms
- First Contentful Paint: < 2000ms
- Time to Interactive: < 5000ms
- Largest Contentful Paint: < 4000ms
- Cumulative Layout Shift: < 0.1

**Exécution:**
```bash
npx playwright test tests/e2e/performance.spec.ts
```

### 4. Tests de Parcours Utilisateur

**Fichier:** `user-journey.spec.ts`

Tests de scénarios utilisateur complets:
- Découverte → Consultation → Inscription
- Navigation par catégorie
- Navigation par lieu
- Filtrage par prix
- Navigation de pagination
- Consultation d'événements similaires
- Exploration du profil organisateur
- Expérience mobile responsive
- Navigation au clavier
- Gestion des erreurs
- Accessibilité

**Exécution:**
```bash
npx playwright test tests/e2e/user-journey.spec.ts
```

## 🎯 Stratégie de Test

### Tests Locaux (Développement)

```bash
# Démarrer le serveur de développement
npm run dev

# Dans un autre terminal, exécuter les tests
npx playwright test
```

### Tests contre Production

```bash
# Exécuter contre l'URL de production
PLAYWRIGHT_BASE_URL=https://attendance-x.vercel.app npx playwright test
```

### Tests CI/CD

Les tests sont configurés pour s'exécuter automatiquement dans le pipeline CI/CD:
- Exécution sur chaque Pull Request
- Exécution sur chaque merge vers main
- Génération de rapports HTML
- Capture de screenshots et vidéos en cas d'échec

## 📈 Rapports et Résultats

### Rapport HTML

Après l'exécution des tests, un rapport HTML est généré:

```bash
# Ouvrir le rapport
npx playwright show-report
```

Le rapport inclut:
- Résumé des tests (passés/échoués)
- Temps d'exécution
- Screenshots des échecs
- Vidéos des échecs
- Traces de débogage

### Traces de Débogage

En cas d'échec, des traces sont capturées automatiquement:

```bash
# Voir la trace d'un test échoué
npx playwright show-trace trace.zip
```

### Screenshots et Vidéos

- **Screenshots:** Capturés automatiquement en cas d'échec
- **Vidéos:** Enregistrées pour les tests échoués
- **Localisation:** `test-results/` et `playwright-report/`

## 🔧 Configuration

### Configuration Playwright

**Fichier:** `playwright.config.ts`

```typescript
{
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium' },
    { name: 'firefox' },
    { name: 'webkit' },
    { name: 'Mobile Chrome' },
    { name: 'Mobile Safari' },
  ],
}
```

### Variables d'Environnement

```bash
# URL de base pour les tests
PLAYWRIGHT_BASE_URL=http://localhost:3000

# Mode CI
CI=true

# Timeout personnalisé
PLAYWRIGHT_TIMEOUT=30000
```

## 🐛 Débogage

### Mode Debug

```bash
# Exécuter en mode debug
npx playwright test --debug

# Debug un test spécifique
npx playwright test tests/e2e/smoke.spec.ts:10 --debug
```

### Mode Headed

```bash
# Voir le navigateur pendant l'exécution
npx playwright test --headed

# Ralentir l'exécution
npx playwright test --headed --slow-mo=1000
```

### Codegen (Générateur de Tests)

```bash
# Générer des tests en enregistrant les actions
npx playwright codegen http://localhost:3000/events
```

## 📝 Bonnes Pratiques

### 1. Sélecteurs

Privilégier dans cet ordre:
1. `getByRole()` - Meilleur pour l'accessibilité
2. `getByText()` - Pour le contenu visible
3. `getByPlaceholder()` - Pour les inputs
4. `getByTestId()` - En dernier recours

```typescript
// ✅ Bon
await page.getByRole('button', { name: 'Rechercher' }).click();

// ❌ À éviter
await page.locator('.btn-search').click();
```

### 2. Attentes

Toujours utiliser des attentes explicites:

```typescript
// ✅ Bon
await expect(page.getByText('Événements')).toBeVisible();

// ❌ À éviter
await page.waitForTimeout(1000);
```

### 3. Isolation des Tests

Chaque test doit être indépendant:

```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('/events');
});
```

### 4. Données de Test

Utiliser les fixtures pour les données mockées:

```typescript
import { mockEvents } from './fixtures/mockData';
```

### 5. Performance

Mesurer et logger les métriques importantes:

```typescript
const startTime = Date.now();
await page.goto('/events');
const loadTime = Date.now() - startTime;
console.log(`⏱️ Load time: ${loadTime}ms`);
```

## 🎨 Fixtures et Données de Test

### Mock Data

**Fichier:** `fixtures/mockData.ts`

Contient des données de test réutilisables:
- `mockEvents` - Événements de test
- `mockOrganizer` - Organisateur de test
- `mockCategories` - Catégories de test
- `mockLocations` - Lieux de test

### Utilisation

```typescript
import { mockEvents, mockOrganizer } from './fixtures/mockData';

test('should display event', async ({ page }) => {
  // Utiliser les données mockées
  const event = mockEvents[0];
  // ...
});
```

## 📊 Métriques et KPIs

### Métriques de Performance

- **Page Load Time:** Temps total de chargement
- **API Response Time:** Temps de réponse des API
- **First Contentful Paint:** Premier élément visible
- **Time to Interactive:** Temps avant interaction
- **Largest Contentful Paint:** Plus grand élément visible
- **Cumulative Layout Shift:** Stabilité visuelle

### Métriques de Qualité

- **Test Coverage:** Couverture des tests
- **Pass Rate:** Taux de réussite
- **Flakiness:** Taux de tests instables
- **Execution Time:** Temps d'exécution total

## 🔄 Maintenance

### Mise à Jour des Tests

1. Mettre à jour les sélecteurs si l'UI change
2. Ajuster les seuils de performance si nécessaire
3. Ajouter de nouveaux tests pour les nouvelles fonctionnalités
4. Supprimer les tests obsolètes

### Revue Régulière

- Vérifier les tests flaky (instables)
- Optimiser les tests lents
- Mettre à jour les données de test
- Améliorer la couverture

## 📚 Ressources

- [Documentation Playwright](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [Debugging Guide](https://playwright.dev/docs/debug)

## 🤝 Contribution

Pour ajouter de nouveaux tests:

1. Créer un nouveau fichier `.spec.ts` dans `tests/e2e/`
2. Suivre les conventions de nommage
3. Ajouter une description claire
4. Inclure des logs pour le débogage
5. Tester localement avant de commit
6. Mettre à jour ce README si nécessaire

## 📞 Support

Pour toute question ou problème:
- Consulter la documentation Playwright
- Vérifier les issues GitHub
- Contacter l'équipe de développement
