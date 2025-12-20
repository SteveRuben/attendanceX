# Optimisation du flux d'onboarding

## Problème résolu

L'ancien flux d'onboarding demandait certaines informations en double :
- **Timezone** : Demandé dans "Settings" ET "Attendance Policy"
- **Nom de l'organisation** : Potentiellement demandé lors de la création ET dans "Organization Profile"
- **Industrie et taille** : Potentiellement demandés lors de la création ET dans "Organization Profile"

## Solution implémentée

### 1. Suppression des doublons

**Timezone** :
- ❌ Avant : Demandé dans Settings ET Attendance Policy
- ✅ Après : Demandé uniquement dans Settings, réutilisé automatiquement pour Attendance Policy

**Données d'organisation** :
- ✅ Pré-remplissage automatique des champs si les données existent déjà

### 2. Flux optimisé

```
1. Welcome
2. Organization Profile (pré-rempli si données existantes)
3. Settings (timezone, locale, currency, formats)
4. Attendance Policy (utilise le timezone des Settings)
5. User Invitations (optionnel)
6. Completion
```

### 3. Améliorations UX

- **Indicateur visuel** : Affichage du timezone utilisé dans l'étape Attendance Policy
- **Pré-remplissage intelligent** : Récupération des données existantes du tenant
- **Messages informatifs** : Indication quand des données sont pré-remplies

## Code modifié

### Frontend (`frontend-v2/src/pages/onboarding/setup.tsx`)

1. **Suppression du timezone de l'objet policy** :
```typescript
// Avant
const [policy, setPolicy] = useState<{
  timezone: string;
  workDays: string;
  // ...
}>({ 
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  // ...
})

// Après
const [policy, setPolicy] = useState<{
  workDays: string;
  // ...
}>({ 
  workDays: 'Mon-Fri',
  // ...
})
```

2. **Utilisation du timezone des settings** :
```typescript
const savePolicy = async () => {
  const policyWithTimezone = {
    ...policy,
    timezone: settings.timezone || detectedTz
  }
  await apiClient.put(`/tenants/${tenantId}/settings/attendance`, policyWithTimezone, ...)
}
```

3. **Pré-remplissage des données** :
```typescript
const fetchTenantData = async (id: string) => {
  const tenantResponse = await apiClient.get(`/tenants/${id}`, { withAuth: true })
  if (tenantResponse) {
    // Pré-remplir les données d'organisation
    if (tenantResponse.name) {
      setOrganizationData(prev => ({ ...prev, name: tenantResponse.name }))
    }
    // ...
  }
}
```

## Bénéfices

1. **Expérience utilisateur améliorée** : Moins de saisie répétitive
2. **Cohérence des données** : Un seul timezone utilisé partout
3. **Gain de temps** : Pré-remplissage automatique des données existantes
4. **Moins d'erreurs** : Réduction des incohérences entre les étapes

## Tests recommandés

1. **Nouveau tenant** : Vérifier que le flux fonctionne sans données pré-existantes
2. **Tenant existant** : Vérifier le pré-remplissage des données
3. **Timezone** : Vérifier que le timezone des Settings est bien utilisé dans Attendance Policy
4. **Navigation** : Tester la navigation entre les étapes
5. **Validation** : Vérifier que les validations fonctionnent correctement