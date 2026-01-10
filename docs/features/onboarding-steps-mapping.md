# Mapping des Étapes d'Onboarding - AttendanceX

## 📋 Vue d'ensemble

Le processus d'onboarding est maintenant harmonisé avec **6 étapes** clairement définies.

## 🎯 Les 6 Étapes

| Ordre | ID | Titre | Description | URL Frontend | Backend Route | Requis |
|-------|-----|-------|-------------|--------------|---------------|--------|
| 1 | `welcome` | Bienvenue | Introduction | `/onboarding/welcome` | - | ✅ |
| 2 | `organization_profile` | Profil organisation | Infos de base | `/onboarding/organization` | `PATCH /:tenantId/settings` | ✅ |
| 3 | `settings` | Paramètres | Timezone, locale, currency | `/onboarding/settings` | `PATCH /:tenantId/settings` | ✅ |
| 4 | `attendance_policy` | Politique de présence | Horaires, règles | `/onboarding/policy` | `PATCH /:tenantId/settings/attendance` | ❌ |
| 5 | `user_invitations` | Inviter utilisateurs | Invitations | `/onboarding/invite` | `POST /:tenantId/invitations/bulk` | ❌ |
| 6 | `completion` | Finalisation | Terminé ! | `/onboarding/complete` | `POST /:tenantId/onboarding/complete` | ✅ |

## 🔄 Flux d'Onboarding

```
1. Création du tenant
   ↓
2. Initialisation du wizard (6 étapes créées)
   ↓
3. Welcome (auto-complété ou manuel)
   ↓
4. Organization Profile (nom, industrie, taille)
   ↓
5. Settings (timezone, locale, currency, formats)
   ↓
6. Attendance Policy (optionnel - horaires de travail)
   ↓
7. User Invitations (optionnel - inviter des collaborateurs)
   ↓
8. Completion (finalisation)
   ↓
9. Redirection vers le dashboard
```

## 📡 API Endpoints

### 1. Obtenir le statut d'onboarding

```http
GET /api/v1/tenants/:tenantId/onboarding-status
Authorization: Bearer {token}
```

**Réponse** :
```json
{
  "success": true,
  "data": {
    "completed": false,
    "currentStep": 3,
    "totalSteps": 6,
    "completedSteps": ["welcome", "organization_profile"],
    "steps": [
      {
        "id": "welcome",
        "title": "Bienvenue",
        "description": "Introduction à votre nouvelle organisation",
        "completed": true,
        "required": true,
        "order": 1,
        "url": "/onboarding/welcome"
      },
      // ... autres étapes
    ],
    "nextStep": {
      "id": "settings",
      "title": "Paramètres",
      "description": "Configurez le fuseau horaire, la langue et la devise",
      "url": "/onboarding/settings",
      "order": 3,
      "required": true
    },
    "nextStepUrl": "/onboarding/settings"
  }
}
```

### 2. Mettre à jour les paramètres (étapes 2 et 3)

```http
PATCH /api/v1/tenants/:tenantId/settings
Authorization: Bearer {token}
Content-Type: application/json

{
  "settings": {
    "timezone": "Europe/Paris",
    "locale": "fr-FR",
    "currency": "EUR",
    "dateFormat": "DD/MM/YYYY",
    "timeFormat": "HH:mm"
  }
}
```

**Effet** : Marque automatiquement l'étape `organization_profile` ou `settings` comme complétée.

### 3. Mettre à jour la politique de présence (étape 4)

```http
PATCH /api/v1/tenants/:tenantId/settings/attendance
Authorization: Bearer {token}
Content-Type: application/json

{
  "policy": {
    "workDays": 5,
    "startHour": "09:00",
    "endHour": "18:00",
    "graceMinutes": 15
  }
}
```

**Effet** : Marque automatiquement l'étape `attendance_policy` comme complétée.

### 4. Inviter des utilisateurs en masse (étape 5)

```http
POST /api/v1/tenants/:tenantId/invitations/bulk
Authorization: Bearer {token}
Content-Type: application/json

{
  "emails": [
    "user1@example.com",
    "user2@example.com",
    "user3@example.com"
  ]
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Invitations processed",
  "data": {
    "total": 3,
    "successful": ["user1@example.com", "user2@example.com"],
    "failed": [
      {
        "email": "user3@example.com",
        "reason": "User already exists"
      }
    ],
    "summary": {
      "successCount": 2,
      "failureCount": 1
    }
  }
}
```

**Effet** : Marque automatiquement l'étape `user_invitations` comme complétée si au moins une invitation réussit.

### 5. Finaliser l'onboarding (étape 6)

```http
POST /api/v1/tenants/:tenantId/onboarding/complete
Authorization: Bearer {token}
```

**Effet** :
- Marque l'étape `completion` comme complétée
- Marque le tenant comme `ACTIVE`
- Envoie un email de bienvenue
- Calcule `isComplete = true` si toutes les étapes requises sont complétées

## 🎨 Implémentation Frontend

### Composant OnboardingWizard

```typescript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
  order: number;
  url: string;
}

export function OnboardingWizard({ tenantId }: { tenantId: string }) {
  const [status, setStatus] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOnboardingStatus();
  }, [tenantId]);

  const fetchOnboardingStatus = async () => {
    const response = await fetch(`/api/v1/tenants/${tenantId}/onboarding-status`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
      }
    });
    const data = await response.json();
    setStatus(data.data);

    // Rediriger vers la prochaine étape si pas complété
    if (!data.data.completed && data.data.nextStepUrl) {
      navigate(data.data.nextStepUrl);
    }
  };

  const completeStep = async (stepId: string) => {
    // Appeler l'API appropriée selon l'étape
    await fetchOnboardingStatus(); // Rafraîchir le statut
  };

  if (!status) return <div>Loading...</div>;

  return (
    <div className="onboarding-wizard">
      <h1>Configuration de votre organisation</h1>
      <div className="progress">
        {status.currentStep} / {status.totalSteps} étapes complétées
      </div>
      
      <div className="steps">
        {status.steps.map((step: OnboardingStep) => (
          <div 
            key={step.id} 
            className={`step ${step.completed ? 'completed' : ''}`}
          >
            <h3>{step.title}</h3>
            <p>{step.description}</p>
            {step.completed && <span>✓</span>}
          </div>
        ))}
      </div>

      {status.nextStep && (
        <button onClick={() => navigate(status.nextStepUrl)}>
          Continuer : {status.nextStep.title}
        </button>
      )}

      {status.completed && (
        <button onClick={() => navigate('/dashboard')}>
          Accéder au tableau de bord
        </button>
      )}
    </div>
  );
}
```

## 🔍 Logique de Complétion

### Étapes Requises

Pour que `isComplete = true`, les étapes **requises** doivent être complétées :
- ✅ `welcome`
- ✅ `organization_profile`
- ✅ `settings`
- ✅ `completion`

Les étapes **optionnelles** peuvent être sautées :
- ❌ `attendance_policy`
- ❌ `user_invitations`

### Calcul Automatique

```typescript
// Dans completeStep()
const requiredSteps = status.steps.filter(step => step.required);
const completedRequiredSteps = requiredSteps.filter(step => step.completed);
status.isComplete = completedRequiredSteps.length === requiredSteps.length;
```

## 📊 Analytics Trackées

Pour chaque étape, des analytics sont enregistrées dans `tenant_analytics` :

| Étape | Champs Analytics |
|-------|------------------|
| `welcome` | `onboardingStarted`, `onboardingStep` |
| `organization_profile` | Suggestions basées sur l'industrie |
| `settings` | `settingsConfigured`, `settingsConfiguredAt` |
| `attendance_policy` | `attendancePolicyConfigured`, `attendancePolicyConfiguredAt` |
| `user_invitations` | `usersInvited`, `usersInvitedAt` |
| `completion` | `onboardingCompleted`, `onboardingDuration` |

## ✅ Checklist d'Implémentation Frontend

- [ ] Créer `/onboarding/welcome` - Page de bienvenue
- [ ] Créer `/onboarding/organization` - Formulaire profil organisation
- [ ] Créer `/onboarding/settings` - Formulaire paramètres
- [ ] Créer `/onboarding/policy` - Formulaire politique de présence
- [ ] Créer `/onboarding/invite` - Formulaire invitations
- [ ] Créer `/onboarding/complete` - Page de finalisation
- [ ] Implémenter la navigation entre les étapes
- [ ] Afficher la progression (X/6 étapes)
- [ ] Permettre de sauter les étapes optionnelles
- [ ] Rediriger vers le dashboard après complétion

## 🚀 Prochaines Étapes

1. Implémenter les pages frontend pour chaque étape
2. Tester le flux complet d'onboarding
3. Ajouter des validations côté frontend
4. Implémenter la sauvegarde automatique (brouillon)
5. Ajouter des tooltips et aide contextuelle

---

**Version** : 1.0  
**Dernière mise à jour** : 8 décembre 2024  
**Maintenu par** : Équipe Dev