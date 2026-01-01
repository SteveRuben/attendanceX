# Guide des Tests Cypress - Form Builder AttendanceX

## 🎯 Vue d'Ensemble

Cette suite de tests Cypress couvre tous les aspects du Form Builder :
- Tests de base (création, modification, sauvegarde)
- Tests avancés (configuration, réorganisation, design)
- Tests d'aperçu (validation, soumission, affichage)
- Tests de performance (charge, erreurs réseau)

## 🚀 Installation et Configuration

### 1. Installation
```bash
# Installer Cypress
npm install --save-dev cypress @cypress/webpack-preprocessor

# Ou utiliser le package.json fourni
cp package-cypress.json package.json
npm install
```

### 2. Configuration
Les fichiers de configuration sont déjà créés :
- `cypress.config.js` - Configuration principale
- `cypress/support/e2e.js` - Support E2E
- `cypress/support/commands.js` - Commandes personnalisées

### 3. Variables d'Environnement
Modifiez `cypress.config.js` si nécessaire :
```javascript
env: {
  API_URL: 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1',
  TEST_EMAIL: 'test@test.com',
  TEST_PASSWORD: '123Abc@cbA123',
  TEST_PROJECT_ID: 'qoBPzKDQfGSvunnqXRtt'
}
```

## 🧪 Exécution des Tests

### Tests Interactifs (Interface Cypress)
```bash
# Ouvrir l'interface Cypress
npm run cypress:open

# Sélectionner "E2E Testing"
# Choisir un navigateur
# Cliquer sur les tests à exécuter
```

### Tests en Ligne de Commande
```bash
# Tous les tests Form Builder
npm run test:e2e

# Tests spécifiques
npm run test:e2e:basic      # Tests de base
npm run test:e2e:advanced   # Tests avancés
npm run test:e2e:preview    # Tests d'aperçu
npm run test:e2e:performance # Tests de performance

# Tests headless (sans interface)
npm run test:e2e:headless

# Tests sur différents navigateurs
npm run cypress:run:chrome
npm run cypress:run:firefox
npm run cypress:run:edge
```

## 📋 Structure des Tests

### 1. Tests de Base (`01-form-builder-basic.cy.js`)
- ✅ Chargement de l'interface
- ✅ Modification du titre
- ✅ Création de sections
- ✅ Ajout de champs
- ✅ Sauvegarde

### 2. Tests Avancés (`02-form-builder-advanced.cy.js`)
- ✅ Configuration des propriétés de champs
- ✅ Réorganisation par drag & drop
- ✅ Configuration du design
- ✅ Publication du formulaire
- ✅ Validation des champs requis

### 3. Tests d'Aperçu (`03-form-preview.cy.js`)
- ✅ Affichage correct de l'aperçu
- ✅ Test de soumission
- ✅ Validation dans l'aperçu
- ✅ Ouverture en nouvel onglet
- ✅ Affichage du design personnalisé

### 4. Tests de Performance (`04-form-performance.cy.js`)
- ✅ Chargement avec nombreux champs
- ✅ Sauvegarde rapide
- ✅ Gestion des erreurs réseau

## 🎨 Commandes Personnalisées

### Authentification
```javascript
cy.login() // Connexion avec les identifiants par défaut
cy.login('custom@email.com', 'password') // Connexion personnalisée
```

### Navigation
```javascript
cy.goToFormBuilder() // Aller au Form Builder
cy.goToFormBuilder('custom-project-id') // Projet spécifique
```

### Création de Formulaires
```javascript
cy.createFormSection('Nom de la section')
cy.addFormField('text', 'Label du champ')
cy.saveForm()
cy.publishForm()
cy.previewForm()
```

### Vérifications
```javascript
cy.checkFormBuilderUI() // Vérifier l'interface
cy.waitForLoad() // Attendre le chargement
```

## 🏷️ Attributs data-cy Requis

Pour que les tests fonctionnent, ajoutez ces attributs dans vos composants :

### Form Builder Principal
```jsx
<input data-cy="form-title-input" />
<button data-cy="add-section-button" />
<button data-cy="save-form-button" />
<button data-cy="publish-form-button" />
```

### Onglets
```jsx
<button data-cy="builder-tab" />
<button data-cy="design-tab" />
<button data-cy="preview-tab" />
<button data-cy="publication-tab" />
```

### Sections et Champs
```jsx
<div data-cy="section-list" />
<input data-cy="section-title-input" />
<div data-cy="field-list" />
<div data-cy="field-item" />
<input data-cy="field-label-input" />
<button data-cy="add-field-button" />
```

### Aperçu
```jsx
<div data-cy="form-preview" />
<h1 data-cy="form-preview-title" />
<div data-cy="form-preview-header" />
<div data-cy="form-preview-footer" />
<button data-cy="submit-button" />
```

### Messages et États
```jsx
<div data-cy="save-success-indicator" />
<div data-cy="error-message" />
<div data-cy="loading-spinner" />
<div data-cy="validation-error" />
```

## 🔧 Debugging des Tests

### Logs et Screenshots
```bash
# Les screenshots sont automatiquement pris en cas d'échec
# Vidéos enregistrées pour tous les tests
# Logs détaillés dans la console Cypress
```

### Mode Debug
```javascript
// Ajouter des pauses dans les tests
cy.pause()

// Logs personnalisés
cy.log('Message de debug')

// Inspection d'éléments
cy.get('[data-cy=element]').debug()
```

### Fixtures et Mocks
```javascript
// Utiliser des données de test
cy.fixture('form-save-response.json').then((data) => {
  // Utiliser les données
})

// Intercepter les appels API
cy.intercept('POST', '**/registration-form', { fixture: 'form-save-response.json' })
```

## 📊 Rapports de Tests

### Génération de Rapports
```bash
# Rapport HTML (avec mochawesome)
npm install --save-dev mochawesome mochawesome-merge mochawesome-report-generator

# Configuration dans cypress.config.js
reporter: 'mochawesome',
reporterOptions: {
  reportDir: 'cypress/reports',
  overwrite: false,
  html: false,
  json: true
}
```

### Métriques de Performance
Les tests de performance mesurent :
- Temps de chargement de l'interface
- Temps de sauvegarde
- Temps de rendu de l'aperçu
- Gestion des erreurs

## 🚀 Intégration CI/CD

### GitHub Actions
```yaml
name: Cypress Tests
on: [push, pull_request]
jobs:
  cypress-run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: cypress-io/github-action@v2
        with:
          start: npm run dev
          wait-on: 'http://localhost:3000'
          spec: cypress/e2e/form-builder/**/*.cy.js
```

## 🎯 Prochaines Étapes

1. **Ajouter les attributs data-cy** dans les composants React
2. **Installer Cypress** avec `npm install --save-dev cypress`
3. **Exécuter les tests** avec `npm run cypress:open`
4. **Ajuster les sélecteurs** selon votre implémentation
5. **Étendre les tests** avec de nouveaux scénarios

Les tests sont prêts à être utilisés dès que les attributs `data-cy` sont ajoutés aux composants ! 🎉