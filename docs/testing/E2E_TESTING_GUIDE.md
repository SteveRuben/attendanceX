# Guide de Tests E2E et Performance - AttendanceX

Ce document fournit un guide complet pour l'exécution et la maintenance des tests End-to-End (E2E) et de performance pour AttendanceX.

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Installation et Configuration](#installation-et-configuration)
3. [Exécution des Tests](#exécution-des-tests)
4. [Types de Tests](#types-de-tests)
5. [Tests de Performance](#tests-de-performance)
6. [Rapports et Métriques](#rapports-et-métriques)
7. [CI/CD Integration](#cicd-integration)
8. [Bonnes Pratiques](#bonnes-pratiques)
9. [Dépannage](#dépannage)

## 🎯 Vue d'ensemble

### Objectifs des Tests

- **Qualité:** Garantir que toutes les fonctionnalités publiques fonctionnent correctement
- **Performance:** Mesurer et optimiser les temps de chargement et de réponse
- **Accessibilité:** Vérifier la conformité aux standards d'accessibilité
- **Expérience Utilisateur:** Valider les parcours utilisateur complets
- **Régression:** Détecter les régressions avant la production

### Technologies Utilisées

- **Playwright:** Framework de test E2E
- **TypeScript:** Langage de programmation
- **Node.js:** Environnement d'exécution
- **HTML Reporter:** Génération de rapports

### Couverture des Tests

- ✅ Pages publiques d'événements
- ✅ Recherche et filtres
- ✅ Navigation et pagination
- ✅ Profils d'organisateurs
- ✅ Performance et Core Web Vitals
- ✅ Responsive design (mobile/desktop)
- ✅ Accessibilité (WCAG 2.1)
- ✅ SEO (meta tags, structured data)

## 🚀 Installation et Configuration

### Prérequis

```bash
# Node.js 18+ et npm 8+
node --version  # v18.0.0 ou supérieur
npm --version   # 8.0.0 ou supérieur
```

### Installation

```bash
# Naviguer vers le dossier frontend
cd frontend-v2

# Installer les dépendances
npm install

# Installer les navigateurs Playwright
npx playwright install

# Installer les dépendances système (Linux uniquement)
npx playwright install-deps
```

### Configuration

Le fichier `playwright.config.ts` contient la configuration:

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

## 🧪 Exécution des Tests

### Tests Locaux (Développement)

```bash
# Démarrer le serveur de développement
npm run dev

# Dans un autre terminal, exécuter les tests
npm run test:e2e

# Ou avec l'interface UI
npm run test:e2e:ui

# Ou en mode headed (voir le navigateur)
npm run test:e2e:headed

# Ou en mode debug
npm run test:e2e:debug
```

### Tests Spécifiques

```bash
# Tests de fumée uniquement
npm run test:smoke

# Tests de performance uniquement
npm run test:performance

# Tests de parcours utilisateur
npm run test:journey

# Tests des pages publiques
npm run test:public-events
```

### Tests contre Production

```bash
# Tous les tests contre production
npm run test:prod

# Tests spécifiques contre production
npm run test:prod:smoke
npm run test:prod:performance
npm run test:prod:journey

# Ou utiliser les scripts dédiés
# Linux/Mac:
./run-production-tests.sh [test-type]

# Windows:
run-production-tests.bat [test-type]

# test-type: all, smoke, performance, journey, public-events
```

### Tests par Navigateur

```bash
# Chromium uniquement
npx playwright test --project=chromium

# Firefox uniquement
npx playwright test --project=firefox

# WebKit (Safari) uniquement
npx playwright test --project=webkit

# Mobile Chrome
npx playwright test --project="Mobile Chrome"

# Mobile Safari
npx playwright test --project="Mobile Safari"
```

## 📊 Types de Tests

### 1. Tests de Fumée (Smoke Tests)

**Fichier:** `tests/e2e/smoke.spec.ts`

**Objectif:** Vérifier que l'application démarre et fonctionne de base

**Tests inclus:**
- Chargement de la page d'accueil
- Chargement de la page de découverte d'événements
- Navigation de base
- Fonctionnalité de recherche
- Affichage des filtres
- Responsive design
- Gestion des erreurs 404
- Meta tags SEO
- Accessibilité de base
- Performance de base

**Exécution:**
```bash
npm run test:smoke
```

**Durée estimée:** 2-3 minutes

### 2. Tests des Pages Publiques

**Fichier:** `tests/e2e/public-events.spec.ts`

**Objectif:** Tester toutes les fonctionnalités des pages publiques

**Tests inclus:**
- Page de découverte d'événements
- Recherche d'événements
- Filtres (catégorie, lieu, prix, tri)
- Pagination
- Page de détail d'événement
- Profil d'organisateur
- Événements similaires
- Partage d'événements
- SEO et accessibilité

**Exécution:**
```bash
npm run test:public-events
```

**Durée estimée:** 5-7 minutes

### 3. Tests de Performance

**Fichier:** `tests/e2e/performance.spec.ts`

**Objectif:** Mesurer et valider les performances de l'application

**Métriques mesurées:**
- **Page Load Time:** < 5000ms
- **API Response Time:** < 3000ms
- **First Contentful Paint (FCP):** < 2000ms
- **Time to Interactive (TTI):** < 5000ms
- **Largest Contentful Paint (LCP):** < 4000ms
- **Cumulative Layout Shift (CLS):** < 0.1

**Tests inclus:**
- Temps de chargement des pages
- Core Web Vitals
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

**Exécution:**
```bash
npm run test:performance
```

**Durée estimée:** 10-15 minutes

### 4. Tests de Parcours Utilisateur

**Fichier:** `tests/e2e/user-journey.spec.ts`

**Objectif:** Valider les parcours utilisateur complets

**Parcours testés:**
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
npm run test:journey
```

**Durée estimée:** 8-10 minutes

## ⚡ Tests de Performance

### Seuils de Performance

| Métrique | Seuil | Description |
|----------|-------|-------------|
| Page Load | < 5000ms | Temps total de chargement |
| API Response | < 3000ms | Temps de réponse des API |
| FCP | < 2000ms | Premier élément visible |
| TTI | < 5000ms | Temps avant interaction |
| LCP | < 4000ms | Plus grand élément visible |
| CLS | < 0.1 | Stabilité visuelle |

### Métriques Collectées

#### Core Web Vitals

- **First Contentful Paint (FCP):** Temps avant le premier élément visible
- **Largest Contentful Paint (LCP):** Temps avant le plus grand élément visible
- **Cumulative Layout Shift (CLS):** Stabilité visuelle de la page
- **Time to Interactive (TTI):** Temps avant que la page soit interactive
- **First Input Delay (FID):** Temps de réponse à la première interaction

#### Métriques Réseau

- **DNS Lookup:** Temps de résolution DNS
- **TCP Connection:** Temps d'établissement de connexion
- **Server Response:** Temps de réponse du serveur
- **DOM Processing:** Temps de traitement du DOM
- **Resource Loading:** Temps de chargement des ressources

#### Métriques Mémoire

- **Used JS Heap Size:** Mémoire JavaScript utilisée
- **Total JS Heap Size:** Mémoire JavaScript totale
- **Memory Increase:** Augmentation de mémoire après navigation

### Analyse des Résultats

Les résultats de performance sont affichés dans la console:

```
📊 Performance Metrics:
  DOM Content Loaded: 1234.56ms
  Load Complete: 2345.67ms
  DOM Interactive: 1500.00ms
  DNS Lookup: 50.00ms
  TCP Connection: 100.00ms
  Server Response: 800.00ms
  DOM Processing: 500.00ms

⚡ Core Web Vitals:
  FCP: 1200ms ✅
  LCP: 2500ms ✅
  CLS: 0.05 ✅

🌐 API Calls:
  Total: 5
  Average time: 1200ms
  Slowest: /api/events - 2000ms
```

## 📈 Rapports et Métriques

### Rapport HTML

Après chaque exécution, un rapport HTML est généré:

```bash
# Ouvrir le rapport
npm run test:e2e:report
```

Le rapport inclut:
- Résumé des tests (passés/échoués)
- Temps d'exécution par test
- Screenshots des échecs
- Vidéos des échecs
- Traces de débogage
- Logs de console

### Traces de Débogage

En cas d'échec, des traces sont capturées:

```bash
# Voir la trace d'un test échoué
npx playwright show-trace trace.zip
```

### Screenshots et Vidéos

- **Screenshots:** Capturés automatiquement en cas d'échec
- **Vidéos:** Enregistrées pour les tests échoués
- **Localisation:** `test-results/` et `playwright-report/`

### Métriques de Qualité

- **Test Coverage:** Couverture des tests
- **Pass Rate:** Taux de réussite
- **Flakiness:** Taux de tests instables
- **Execution Time:** Temps d'exécution total
- **Performance Score:** Score de performance global

## 🔄 CI/CD Integration

### GitHub Actions

Exemple de workflow `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

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
          cd frontend-v2
          npm ci
          
      - name: Install Playwright
        run: |
          cd frontend-v2
          npx playwright install --with-deps
          
      - name: Run E2E tests
        run: |
          cd frontend-v2
          npm run test:prod
          
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: frontend-v2/playwright-report/
          retention-days: 30
```

### Vercel Deployment

Tests automatiques après chaque déploiement:

```bash
# Dans le script de post-déploiement
PLAYWRIGHT_BASE_URL=$VERCEL_URL npm run test:smoke
```

## 🎯 Bonnes Pratiques

### 1. Sélecteurs

Privilégier dans cet ordre:

```typescript
// ✅ Meilleur - Accessible et sémantique
await page.getByRole('button', { name: 'Rechercher' }).click();

// ✅ Bon - Contenu visible
await page.getByText('Événements').click();

// ✅ Acceptable - Placeholder
await page.getByPlaceholder('Rechercher...').fill('test');

// ⚠️ À éviter - Test ID
await page.getByTestId('search-button').click();

// ❌ Mauvais - Sélecteur CSS fragile
await page.locator('.btn-search').click();
```

### 2. Attentes

Toujours utiliser des attentes explicites:

```typescript
// ✅ Bon - Attente explicite
await expect(page.getByText('Événements')).toBeVisible();

// ❌ Mauvais - Timeout arbitraire
await page.waitForTimeout(1000);
```

### 3. Isolation des Tests

Chaque test doit être indépendant:

```typescript
test.beforeEach(async ({ page }) => {
  // Réinitialiser l'état avant chaque test
  await page.goto('/events');
  await page.waitForLoadState('networkidle');
});
```

### 4. Gestion des Erreurs

Gérer les cas d'erreur gracieusement:

```typescript
const element = page.getByText('Optional Element');
if (await element.isVisible()) {
  await element.click();
} else {
  console.log('Element not found, skipping');
}
```

### 5. Performance

Mesurer et logger les métriques:

```typescript
const startTime = Date.now();
await page.goto('/events');
const loadTime = Date.now() - startTime;
console.log(`⏱️ Load time: ${loadTime}ms`);
expect(loadTime).toBeLessThan(5000);
```

## 🐛 Dépannage

### Problèmes Courants

#### 1. Tests Timeout

**Symptôme:** Tests qui expirent après 30 secondes

**Solutions:**
```bash
# Augmenter le timeout
npx playwright test --timeout=60000

# Ou dans le test
test.setTimeout(60000);
```

#### 2. Sélecteurs Non Trouvés

**Symptôme:** `Error: locator.click: Target closed`

**Solutions:**
- Vérifier que l'élément est visible
- Attendre le chargement complet
- Utiliser des sélecteurs plus robustes

```typescript
// Attendre que l'élément soit visible
await page.getByRole('button', { name: 'Rechercher' }).waitFor();
await page.getByRole('button', { name: 'Rechercher' }).click();
```

#### 3. Tests Flaky (Instables)

**Symptôme:** Tests qui passent parfois et échouent parfois

**Solutions:**
- Ajouter des attentes explicites
- Augmenter les timeouts
- Vérifier les conditions de course

```typescript
// Attendre le chargement réseau
await page.waitForLoadState('networkidle');

// Attendre une condition spécifique
await page.waitForFunction(() => document.querySelectorAll('.event-card').length > 0);
```

#### 4. Erreurs de Connexion

**Symptôme:** `net::ERR_CONNECTION_REFUSED`

**Solutions:**
- Vérifier que le serveur de développement est démarré
- Vérifier l'URL de base dans la configuration
- Vérifier les variables d'environnement

```bash
# Vérifier que le serveur tourne
curl http://localhost:3000

# Démarrer le serveur
npm run dev
```

### Mode Debug

```bash
# Exécuter en mode debug
npm run test:e2e:debug

# Debug un test spécifique
npx playwright test tests/e2e/smoke.spec.ts:10 --debug

# Mode headed (voir le navigateur)
npm run test:e2e:headed

# Ralentir l'exécution
npx playwright test --headed --slow-mo=1000
```

### Logs et Traces

```bash
# Activer les logs détaillés
DEBUG=pw:api npx playwright test

# Voir les traces
npx playwright show-trace trace.zip

# Voir les screenshots
open test-results/*/test-failed-1.png
```

## 📚 Ressources

### Documentation

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Guide](https://playwright.dev/docs/ci)

### Outils

- [Playwright Inspector](https://playwright.dev/docs/inspector)
- [Trace Viewer](https://playwright.dev/docs/trace-viewer)
- [Codegen](https://playwright.dev/docs/codegen)
- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright)

### Communauté

- [GitHub Discussions](https://github.com/microsoft/playwright/discussions)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/playwright)
- [Discord](https://aka.ms/playwright/discord)

## 🤝 Contribution

Pour ajouter de nouveaux tests:

1. Créer un nouveau fichier `.spec.ts` dans `tests/e2e/`
2. Suivre les conventions de nommage
3. Ajouter une description claire
4. Inclure des logs pour le débogage
5. Tester localement avant de commit
6. Mettre à jour la documentation

## 📞 Support

Pour toute question ou problème:
- Consulter la documentation Playwright
- Vérifier les issues GitHub
- Contacter l'équipe de développement

---

**Dernière mise à jour:** 26 janvier 2026
**Version:** 1.0.0
**Auteur:** Équipe AttendanceX
