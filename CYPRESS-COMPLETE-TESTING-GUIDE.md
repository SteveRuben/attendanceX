# Guide Complet des Tests Cypress - AttendanceX

## 📋 Vue d'Ensemble

Cette suite de tests Cypress couvre l'intégralité de l'application AttendanceX avec des tests E2E complets, des tests d'intégration et des vérifications de performance.

## 🗂️ Structure des Tests

### Tests Créés

```
cypress/e2e/
├── 00-app-smoke-test.cy.js          # Tests de fumée globaux
├── 01-authentication.cy.js          # Tests d'authentification
├── 02-navigation-dashboard.cy.js    # Navigation et dashboard
├── 03-projects.cy.js               # Gestion des projets
├── 04-organization.cy.js           # Gestion de l'organisation
├── 05-events.cy.js                 # Gestion des événements
├── 06-integration-complete.cy.js   # Tests d'intégration complète
└── form-builder/                   # Tests Form Builder existants
    ├── 00-form-builder-smoke-test.cy.js
    ├── 01-form-builder-basic.cy.js
    ├── 02-form-builder-advanced.cy.js
    ├── 03-form-preview.cy.js
    └── 04-form-performance.cy.js
```

### Fixtures de Données

```
cypress/fixtures/
├── test-users.json          # Utilisateurs de test par rôle
├── organization-data.json   # Données d'organisation
├── project-data.json       # Données de projets
├── event-data.json         # Données d'événements
├── form-save-response.json  # Réponses API formulaires
└── form-update-response.json
```

### Commandes Personnalisées

```
cypress/support/
├── commands.js             # Commandes Cypress étendues
└── e2e.js                 # Configuration E2E
```

## 🚀 Exécution des Tests

### Prérequis

1. **Backend démarré** :
   ```bash
   cd backend/functions
   npm run dev
   # Backend sur http://127.0.0.1:5001/...
   ```

2. **Frontend démarré** :
   ```bash
   cd frontend-v2
   npm run dev
   # Frontend sur http://localhost:3000
   ```

3. **Variables d'environnement** configurées dans `cypress.config.js`

### Commandes d'Exécution

#### Tests Complets (Mode Headless)
```bash
# Tous les tests
npx cypress run

# Tests spécifiques par module
npx cypress run --spec "cypress/e2e/01-authentication.cy.js"
npx cypress run --spec "cypress/e2e/03-projects.cy.js"
npx cypress run --spec "cypress/e2e/04-organization.cy.js"

# Tests par catégorie
npx cypress run --spec "cypress/e2e/form-builder/*.cy.js"
npx cypress run --spec "cypress/e2e/0*.cy.js"
```

#### Interface Interactive
```bash
# Ouvrir l'interface Cypress
npx cypress open

# Sélectionner et exécuter les tests individuellement
```

#### Tests de Performance
```bash
# Tests avec métriques de performance
npx cypress run --spec "cypress/e2e/06-integration-complete.cy.js"
npx cypress run --spec "cypress/e2e/form-builder/04-form-performance.cy.js"
```

#### Tests par Environnement
```bash
# Environnement de développement (par défaut)
npx cypress run

# Environnement de staging
npx cypress run --env baseUrl=https://staging.attendancex.com

# Environnement de production (lecture seule)
npx cypress run --env baseUrl=https://app.attendancex.com,readOnly=true
```

## 📊 Couverture des Tests

### 1. Tests de Fumée (00-app-smoke-test.cy.js)
- ✅ Chargement de l'application
- ✅ Navigation de base
- ✅ Gestion des erreurs 404
- ✅ Meta tags et SEO
- ✅ Responsive design
- ✅ Performance de chargement

### 2. Authentification (01-authentication.cy.js)
- ✅ Connexion/déconnexion
- ✅ Validation des formulaires
- ✅ Gestion des erreurs
- ✅ Réinitialisation de mot de passe
- ✅ Routes protégées
- ✅ Gestion de session
- ✅ Tokens expirés

### 3. Navigation & Dashboard (02-navigation-dashboard.cy.js)
- ✅ Navigation principale
- ✅ Menu utilisateur
- ✅ Statistiques du dashboard
- ✅ Activités récentes
- ✅ Actions rapides
- ✅ Responsive mobile/tablet
- ✅ Gestion d'erreurs API

### 4. Projets (03-projects.cy.js)
- ✅ Liste des projets
- ✅ Recherche et filtres
- ✅ Création de projets
- ✅ Détails et édition
- ✅ Gestion des équipes
- ✅ Formulaires de projet
- ✅ Événements de projet
- ✅ Paramètres et permissions
- ✅ Suppression avec confirmation

### 5. Organisation (04-organization.cy.js)
- ✅ Paramètres généraux
- ✅ Configuration des domaines
- ✅ DNS et SSL
- ✅ Branding complet
- ✅ Configuration SMTP
- ✅ Paramètres SMS
- ✅ Sécurité et CORS
- ✅ Intégration avec Form Builder

### 6. Événements (05-events.cy.js)
- ✅ Liste et recherche d'événements
- ✅ Vue calendrier
- ✅ Création d'événements
- ✅ Événements récurrents
- ✅ Gestion des participants
- ✅ Inscription et formulaires
- ✅ Check-in et QR codes
- ✅ Notifications
- ✅ Analytics et rapports

### 7. Form Builder (form-builder/*.cy.js)
- ✅ Interface du constructeur
- ✅ Création de sections
- ✅ Ajout de champs
- ✅ Configuration avancée
- ✅ Aperçu en temps réel
- ✅ Publication de formulaires
- ✅ Performance avec nombreux champs

### 8. Intégration Complète (06-integration-complete.cy.js)
- ✅ Workflow complet organisation → projet → événement
- ✅ Cohérence des données inter-modules
- ✅ Application du branding global
- ✅ Performance et scalabilité
- ✅ Récupération d'erreurs
- ✅ Sécurité et contrôle d'accès
- ✅ Responsive mobile
- ✅ Accessibilité

## 🎯 Commandes Personnalisées

### Authentification
```javascript
cy.login()                          // Connexion par défaut
cy.login('user@test.com', 'pass')   // Connexion spécifique
cy.loginAsRole('admin')             // Connexion par rôle
```

### Création de Données
```javascript
cy.createTestProject()              // Créer un projet de test
cy.createTestEvent()                // Créer un événement de test
cy.createTestOrganization()         // Créer une organisation de test
```

### Utilitaires
```javascript
cy.checkToast('Message', 'success') // Vérifier les notifications
cy.fillForm({ field1: 'value1' })   // Remplir un formulaire
cy.checkResponsive()                // Tester le responsive
cy.measurePerformance(() => {})     // Mesurer les performances
```

### Form Builder Spécifiques
```javascript
cy.goToFormBuilder(projectId)       // Aller au Form Builder
cy.createFormSection('Section')     // Créer une section
cy.addFormField('text', 'Label')    // Ajouter un champ
cy.saveForm()                       // Sauvegarder le formulaire
cy.publishForm()                    // Publier le formulaire
```

## 📈 Métriques et Rapports

### Génération de Rapports
```bash
# Rapport HTML avec captures d'écran
npx cypress run --reporter mochawesome

# Rapport JUnit pour CI/CD
npx cypress run --reporter junit

# Rapport de couverture
npx cypress run --coverage
```

### Métriques de Performance
- **Temps de chargement** : < 3 secondes
- **Temps de réponse API** : < 1 seconde
- **Taille des bundles** : Optimisée
- **Accessibilité** : WCAG 2.1 AA

### Indicateurs de Qualité
- **Taux de réussite** : > 95%
- **Stabilité** : Tests reproductibles
- **Couverture** : > 80% des fonctionnalités
- **Performance** : Benchmarks respectés

## 🔧 Configuration Avancée

### Variables d'Environnement
```javascript
// cypress.config.js
env: {
  API_URL: 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1',
  TEST_EMAIL: 'test@test.com',
  TEST_PASSWORD: '123Abc@cbA123',
  TEST_TENANT_ID: 'gbwIul0foY56kQzItyDd',
  TEST_PROJECT_ID: 'qoBPzKDQfGSvunnqXRtt'
}
```

### Timeouts et Retry
```javascript
// Configuration des timeouts
defaultCommandTimeout: 10000,
requestTimeout: 10000,
responseTimeout: 10000,

// Retry automatique
retries: {
  runMode: 2,
  openMode: 0
}
```

### Capture d'Écran et Vidéos
```javascript
// Configuration des captures
screenshotOnRunFailure: true,
video: true,
videosFolder: 'cypress/videos',
screenshotsFolder: 'cypress/screenshots'
```

## 🚨 Résolution de Problèmes

### Erreurs Communes

#### 1. Timeout d'Authentification
```bash
# Vérifier que le backend est démarré
cd backend/functions && npm run dev

# Vérifier les credentials dans cypress.config.js
```

#### 2. Éléments Non Trouvés
```bash
# Vérifier les attributs data-cy dans les composants React
# Ajouter les attributs manquants si nécessaire
```

#### 3. Tests Instables
```bash
# Augmenter les timeouts
# Ajouter des attentes explicites avec cy.wait()
# Utiliser cy.intercept() pour les requêtes API
```

#### 4. Problèmes de Performance
```bash
# Réduire la résolution des vidéos
# Désactiver les vidéos en mode développement
# Utiliser --headless pour les tests automatisés
```

### Debug des Tests
```javascript
// Ajouter des points d'arrêt
cy.debug()
cy.pause()

// Logs détaillés
cy.log('Message de debug')

// Inspection des éléments
cy.get('[data-cy="element"]').debug()
```

## 📋 Checklist de Validation

### Avant d'Exécuter les Tests
- [ ] Backend démarré et accessible
- [ ] Frontend démarré sur le bon port
- [ ] Base de données avec données de test
- [ ] Variables d'environnement configurées
- [ ] Utilisateurs de test créés

### Après Exécution des Tests
- [ ] Tous les tests passent (> 95%)
- [ ] Pas d'erreurs JavaScript dans la console
- [ ] Captures d'écran des échecs analysées
- [ ] Métriques de performance dans les limites
- [ ] Rapports générés et archivés

### Tests de Régression
- [ ] Tests de fumée passent
- [ ] Fonctionnalités critiques validées
- [ ] Intégrations inter-modules fonctionnelles
- [ ] Performance maintenue
- [ ] Sécurité et permissions respectées

## 🎉 Conclusion

Cette suite de tests Cypress fournit une couverture complète de l'application AttendanceX avec :

- **8 suites de tests** couvrant tous les modules
- **100+ scénarios de test** détaillés
- **Commandes personnalisées** pour la réutilisabilité
- **Fixtures de données** pour les tests reproductibles
- **Tests d'intégration** bout-en-bout
- **Vérifications de performance** et d'accessibilité
- **Gestion d'erreurs** et récupération
- **Support multi-dispositifs** et responsive

Les tests peuvent être exécutés individuellement ou en suite complète, en mode interactif ou automatisé, avec des rapports détaillés et des métriques de performance.

**Prêt pour l'intégration continue et le déploiement automatisé !** 🚀