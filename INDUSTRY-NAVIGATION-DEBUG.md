# Debug: Navigation Basée sur l'Industrie

## Problème Identifié

Les menus ne s'affichent pas en fonction de l'industrie configurée lors de l'onboarding.

## Cause Probable

Le système de navigation basé sur l'industrie est correctement implémenté, mais il y a potentiellement un problème dans :

1. **Structure des données** : L'industrie pourrait ne pas être correctement sauvegardée ou récupérée
2. **Contexte du tenant** : Les données du tenant pourraient ne pas inclure l'industrie
3. **Synchronisation** : Il pourrait y avoir un décalage entre la sauvegarde et la récupération

## Outils de Debug Ajoutés

### 1. TenantDebugInfo Component
- **Localisation** : `frontend-v2/src/components/debug/TenantDebugInfo.tsx`
- **Fonction** : Affiche les informations du tenant et de l'industrie en temps réel
- **Visible** : Uniquement en mode développement (coin inférieur droit)

### 2. IndustrySelector Component  
- **Localisation** : `frontend-v2/src/components/debug/IndustrySelector.tsx`
- **Fonction** : Permet de définir manuellement l'industrie du tenant
- **Visible** : Uniquement en mode développement (coin supérieur droit)

### 3. Utilitaire de Correction
- **Localisation** : `frontend-v2/src/utils/fixTenantIndustry.ts`
- **Fonction** : Fonctions pour corriger la structure des données d'industrie

## Comment Débugger

### Étape 1 : Vérifier les Données
1. Démarrer l'application en mode développement
2. Naviguer vers n'importe quelle page avec la sidebar
3. Vérifier le composant de debug en bas à droite
4. Noter les informations affichées :
   - Tenant ID
   - Settings Object (structure complète)
   - Detected Industry
   - Nav Config

### Étape 2 : Tester la Correction
1. Utiliser le sélecteur d'industrie en haut à droite
2. Choisir une industrie (ex: "Education", "Healthcare", "Technology")
3. Cliquer sur "Update Industry"
4. La page se rechargera automatiquement
5. Vérifier que la navigation a changé selon l'industrie

### Étape 3 : Vérifier les Changements
Selon l'industrie sélectionnée, vous devriez voir :

**Education** :
- Core : Dashboard, Events, Attendance, Users
- Timesheets masqué
- Events et Campaigns prioritaires

**Healthcare** :
- Core : Dashboard, Attendance, Users, Reports  
- Check-in masqué
- Timesheets et Reports prioritaires

**Technology** :
- Core : Dashboard, Timesheets, Users, Analytics
- Analytics et Timesheets prioritaires

## Structure Attendue des Données

```typescript
// Dans currentTenant.settings
{
  "industry": "education", // ou autre industrie
  "timezone": "Europe/Paris",
  "locale": "fr-FR",
  // autres settings...
}
```

## Solutions Possibles

### Solution 1 : Correction Manuelle (Dev)
Utiliser le composant `IndustrySelector` pour définir l'industrie manuellement.

### Solution 2 : Correction Backend
Vérifier que l'endpoint `/tenants/{id}/settings` sauvegarde correctement l'industrie dans la structure attendue.

### Solution 3 : Migration des Données
Si nécessaire, créer un script de migration pour corriger les données existantes.

## Vérification du Fonctionnement

Une fois l'industrie correctement définie, vous devriez voir :

1. **Indicateur d'industrie** dans la sidebar (mode dev)
2. **Navigation filtrée** selon la configuration de l'industrie
3. **Ordre des menus** adapté (core → priority → secondary)
4. **Menus masqués** selon la configuration

## Nettoyage

Une fois le problème résolu, vous pouvez :

1. Supprimer les composants de debug :
   - `frontend-v2/src/components/debug/TenantDebugInfo.tsx`
   - `frontend-v2/src/components/debug/IndustrySelector.tsx`

2. Retirer les imports de debug de `Sidebar.tsx`

3. Garder l'utilitaire `fixTenantIndustry.ts` pour les migrations futures

## Test des Industries

Pour tester chaque industrie :

```bash
# Démarrer en mode développement
npm run dev:frontend

# Tester chaque industrie via le sélecteur
# Vérifier que la navigation change correctement
```

Les industries disponibles :
- Education, Healthcare, Corporate, Government
- Non-Profit, Technology, Finance, Retail  
- Manufacturing, Hospitality, Consulting, Events, Other