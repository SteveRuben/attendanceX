# Notification Preferences Service

Ce service gère les préférences de notifications des utilisateurs dans AttendanceX.

## Fonctionnalités

### 🔧 Gestion des préférences
- **Création automatique** des préférences par défaut pour les nouveaux utilisateurs
- **Validation robuste** de la structure des données
- **Migration automatique** des anciennes préférences
- **Versioning** des documents pour le suivi des modifications

### 📊 Types de notifications supportés
- **Event Reminders** : Rappels d'événements à venir
- **Attendance Alerts** : Alertes de présence et check-in
- **System Updates** : Mises à jour système importantes
- **Weekly Reports** : Rapports hebdomadaires d'activité
- **Invitations** : Invitations d'équipe et collaborations

### 📱 Canaux de notification
- **Email** : Notifications par email (activé par défaut)
- **Push** : Notifications push navigateur/mobile (activé par défaut)
- **SMS** : Notifications par SMS (désactivé par défaut)

## Structure des données

```typescript
interface NotificationPreferences {
  email: {
    enabled: boolean;
    eventReminders: boolean;
    attendanceAlerts: boolean;
    systemUpdates: boolean;
    weeklyReports: boolean;
    invitations: boolean;
  };
  push: {
    enabled: boolean;
    eventReminders: boolean;
    attendanceAlerts: boolean;
    systemUpdates: boolean;
    weeklyReports: boolean;
    invitations: boolean;
  };
  sms: {
    enabled: boolean;
    eventReminders: boolean;
    attendanceAlerts: boolean;
    systemUpdates: boolean;
    weeklyReports: boolean;
    invitations: boolean;
  };
}
```

## Utilisation

### Obtenir les préférences d'un utilisateur
```typescript
const preferences = await notificationPreferencesService.getUserPreferences(userId, tenantId);
```

### Mettre à jour les préférences
```typescript
const updatedPreferences = await notificationPreferencesService.updateUserPreferences(
  userId, 
  newPreferences, 
  tenantId
);
```

### Obtenir les statistiques
```typescript
const stats = await notificationPreferencesService.getPreferencesStats(tenantId);
```

## API Endpoints

### GET `/api/notifications/preferences`
Récupère les préférences de notification de l'utilisateur authentifié.

**Réponse :**
```json
{
  "success": true,
  "data": {
    "email": { "enabled": true, "eventReminders": true, ... },
    "push": { "enabled": true, "eventReminders": true, ... },
    "sms": { "enabled": false, "eventReminders": false, ... }
  }
}
```

### PUT `/api/notifications/preferences`
Met à jour les préférences de notification.

**Corps de la requête :**
```json
{
  "email": { "enabled": true, "eventReminders": true, ... },
  "push": { "enabled": true, "eventReminders": false, ... },
  "sms": { "enabled": false, ... }
}
```

### POST `/api/notifications/preferences/reset`
Remet les préférences aux valeurs par défaut.

### GET `/api/notifications/preferences/stats`
Obtient les statistiques des préférences (admin uniquement).

**Réponse :**
```json
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "emailEnabled": 145,
    "pushEnabled": 120,
    "smsEnabled": 25,
    "channelStats": {
      "email": { "eventReminders": 140, "attendanceAlerts": 135, ... },
      "push": { "eventReminders": 115, "attendanceAlerts": 110, ... },
      "sms": { "eventReminders": 20, "attendanceAlerts": 15, ... }
    }
  }
}
```

## Sécurité

- **Authentification requise** pour toutes les opérations
- **Validation stricte** des données d'entrée
- **Audit logging** de toutes les modifications
- **Isolation par tenant** pour les statistiques
- **Versioning** des documents pour la traçabilité

## Migration

Le service inclut une fonction de migration automatique qui :
- Détecte les anciennes structures de préférences
- Les convertit vers le nouveau format
- Préserve les paramètres existants de l'utilisateur
- S'exécute automatiquement lors de la première lecture

## Performances

- **Mise en cache** des préférences fréquemment accédées
- **Validation côté service** pour éviter les erreurs de base de données
- **Opérations atomiques** pour la cohérence des données
- **Indexation optimisée** sur userId et tenantId

## Monitoring

Le service fournit des métriques détaillées :
- Nombre d'utilisateurs par canal activé
- Répartition des types de notifications
- Statistiques d'adoption par tenant
- Historique des modifications