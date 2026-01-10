# Cypress Quick Start - Form Builder

## 🚀 Test Rapide des Attributs data-cy

### 1. Test Visuel des Sélecteurs
Ouvrez le fichier de test dans votre navigateur :
```bash
# Ouvrir le fichier de test
open test-cypress-setup.html
# ou
start test-cypress-setup.html
```

Ce fichier simule l'interface du Form Builder avec tous les attributs `data-cy` nécessaires.

### 2. Installation Cypress (Optionnel)
```bash
# Installer Cypress
npm install --save-dev cypress

# Ou utiliser le package.json fourni
cp package-cypress.json package.json
npm install
```

### 3. Test de Fumée Simple
```bash
# Lancer le test de fumée (sans authentification)
npx cypress run --spec "cypress/e2e/form-builder/00-form-builder-smoke-test.cy.js"

# Ou ouvrir l'interface Cypress
npx cypress open
```

## 📋 Attributs data-cy Implémentés

### ✅ Composants Principaux
- `data-cy="form-title-input"` - Input du titre du formulaire
- `data-cy="add-section-button"` - Bouton ajouter une section
- `data-cy="save-form-button"` - Bouton sauvegarder
- `data-cy="publish-form-button"` - Bouton publier

### ✅ Onglets de Navigation
- `data-cy="builder-tab"` - Onglet éditeur
- `data-cy="design-tab"` - Onglet design
- `data-cy="preview-tab"` - Onglet aperçu
- `data-cy="publication-tab"` - Onglet publication
- `data-cy="templates-tab"` - Onglet modèles

### ✅ Sections et Champs
- `data-cy="section-list"` - Liste des sections
- `data-cy="section-title-input"` - Input titre de section
- `data-cy="field-list"` - Liste des champs
- `data-cy="field-item"` - Élément de champ individuel
- `data-cy="field-label-input"` - Input label de champ
- `data-cy="add-field-button"` - Bouton ajouter un champ

### ✅ Aperçu du Formulaire
- `data-cy="form-preview"` - Container de l'aperçu
- `data-cy="form-preview-header"` - Header du formulaire
- `data-cy="form-preview-title"` - Titre du formulaire
- `data-cy="form-preview-footer"` - Footer du formulaire
- `data-cy="submit-button"` - Bouton de soumission

### ✅ Messages et États
- `data-cy="save-success-indicator"` - Indicateur de sauvegarde réussie
- `data-cy="error-message"` - Message d'erreur
- `data-cy="field-error"` - Erreur de validation de champ
- `data-cy="loading-spinner"` - Indicateur de chargement
- `data-cy="unsaved-indicator"` - Indicateur de modifications non sauvegardées

## 🧪 Tests Disponibles

### Test de Fumée (00-form-builder-smoke-test.cy.js)
- ✅ Chargement de la page
- ✅ Éléments DOM de base
- ✅ Gestion des erreurs 404
- ✅ Meta tags appropriés

### Tests de Base (01-form-builder-basic.cy.js)
- Interface du Form Builder
- Modification du titre
- Création de sections
- Ajout de champs
- Sauvegarde

### Tests Avancés (02-form-builder-advanced.cy.js)
- Configuration des propriétés de champs
- Réorganisation par drag & drop
- Configuration du design
- Publication du formulaire
- Validation des champs requis

### Tests d'Aperçu (03-form-preview.cy.js)
- Affichage correct de l'aperçu
- Test de soumission
- Validation dans l'aperçu
- Ouverture en nouvel onglet
- Affichage du design personnalisé

### Tests de Performance (04-form-performance.cy.js)
- Chargement avec nombreux champs
- Sauvegarde rapide
- Gestion des erreurs réseau

## 🎯 Prochaines Étapes

### 1. Vérifier les Attributs Existants
Vérifiez que ces attributs sont présents dans vos composants React :

```jsx
// RegistrationFormBuilder.tsx
<input data-cy="form-title-input" />
<button data-cy="save-form-button" />
<button data-cy="publish-form-button" />

// Onglets
<TabsTrigger data-cy="builder-tab" />
<TabsTrigger data-cy="preview-tab" />

// FormPreview.tsx
<div data-cy="form-preview" />
<button data-cy="submit-button" />
```

### 2. Ajouter les Attributs Manquants
Si certains attributs manquent, ajoutez-les :

```jsx
// Exemple d'ajout d'attribut
<Button 
  onClick={handleSave}
  data-cy="save-form-button"  // ← Ajouter cet attribut
>
  Sauvegarder
</Button>
```

### 3. Lancer les Tests
```bash
# Test rapide
npx cypress run --spec "cypress/e2e/form-builder/00-form-builder-smoke-test.cy.js"

# Tous les tests (nécessite authentification)
npx cypress run --spec "cypress/e2e/form-builder/**/*.cy.js"

# Interface interactive
npx cypress open
```

### 4. Débugger les Tests
Si un test échoue :
1. Vérifiez que l'attribut `data-cy` existe
2. Vérifiez que l'élément est visible
3. Vérifiez les conditions d'authentification
4. Utilisez `cy.pause()` pour débugger

## 📊 Résultats Attendus

### ✅ Tests qui Devraient Passer
- Test de fumée (chargement de base)
- Vérification des attributs data-cy
- Navigation entre les pages

### ⚠️ Tests qui Nécessitent l'Authentification
- Sauvegarde de formulaires
- Publication de formulaires
- Interaction avec l'API

### 🔧 Configuration Requise
- **Frontend** : `http://localhost:3000` (démarré)
- **Backend** : `http://127.0.0.1:5001/...` (démarré)
- **Authentification** : `test@test.com` / `123Abc@cbA123`

## 🎉 Conclusion

Les attributs `data-cy` sont maintenant en place pour permettre des tests E2E complets du Form Builder. Les tests peuvent être exécutés de manière isolée ou dans le cadre d'une suite complète d'intégration continue.

**Le Form Builder est maintenant prêt pour les tests automatisés !** 🚀