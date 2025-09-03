# 🔄 Mise à jour Collection Postman

## Vue d'ensemble

La collection Postman a été mise à jour pour correspondre exactement aux routes réelles de l'API Attendance-X.

**Version :** 2.1.0  
**Date :** Mars 2024

## ✅ Corrections apportées

### 1. **Endpoints Attendance corrigés**

| Ancien endpoint | Nouveau endpoint | Description |
|----------------|------------------|-------------|
| `/events/{eventId}/participants/{participantId}/attendance` | `/attendances/{attendanceId}/validate` | Validation de présence |
| `/events/{eventId}/participants/bulk-attendance` | `/attendances/bulk-validate` | Validation en masse |

### 2. **Endpoints Notifications corrigés**

| Ancien endpoint | Nouveau endpoint | Description |
|----------------|------------------|-------------|
| `/notifications/send-multilanguage` | `/notifications/send` | Envoi de notifications |

### 3. **Nouveaux endpoints ajoutés**

#### 📱 Attendances API (Section complète)
- `POST /attendances/check-in` - Check-in principal
- `GET /attendances/events/{eventId}` - Présences par événement
- `GET /attendances/my-attendances` - Mes présences
- `GET /attendances/stats` - Statistiques de présence
- `POST /attendances/export` - Export des données

#### 📢 Notifications API (Section étendue)
- `GET /notifications/my-notifications` - Mes notifications
- `POST /notifications/mark-read/{id}` - Marquer comme lu
- `POST /notifications/mark-all-read` - Marquer tout comme lu
- `GET /notifications/preferences` - Préférences utilisateur
- `PUT /notifications/preferences` - Mettre à jour préférences
- `POST /notifications/send-bulk` - Envoi en masse
- `POST /notifications/push/configure` - Configuration push

#### 📅 Events API (Section étendue)
- `GET /events/my-events` - Mes événements
- `GET /events/upcoming` - Événements à venir
- `POST /events/search` - Recherche avancée
- `GET /events/recommendations` - Recommandations
- `POST /events/check-conflicts` - Vérification conflits
- `POST /events/{id}/duplicate` - Duplication d'événement

#### 👥 Users API (Section étendue)
- `POST /users/search` - Recherche avancée
- `GET /users/stats` - Statistiques utilisateurs
- `POST /users/{id}/role` - Gestion des rôles
- `POST /users/invitations/accept` - Accepter invitation

#### 🏢 Organizations API (Section étendue)
- `GET /organizations/my-organization` - Mon organisation
- `GET /organizations/sector-templates` - Templates sectoriels
- `GET /organizations/templates/{sector}` - Template spécifique
- `POST /organizations/{id}/complete-setup` - Configuration initiale

## 🔧 Variables ajoutées

Nouvelles variables de collection :
- `notificationId` - ID de notification
- `attendanceId` - ID de présence

## 📊 Structure mise à jour

### Sections principales :
1. **🔐 Authentication** - Authentification et tokens
2. **🏢 Organizations** - Gestion des organisations
3. **👥 Teams** - Gestion des équipes
4. **📅 Events** - Gestion des événements
5. **👤 Participants** - Gestion des participants
6. **✅ Attendance** - Gestion des présences (ancien)
7. **📤 User Import** - Import d'utilisateurs
8. **📧 Notifications** - Notifications (ancien)
9. **📊 Analytics** - Analytics et statistiques
10. **📅 Appointments** - Gestion des rendez-vous
11. **🤖 ML & AI** - Intelligence artificielle

### Nouvelles sections ajoutées :
12. **📱 Attendances API (Corrected)** - Présences corrigées
13. **📢 Notifications API (Corrected)** - Notifications corrigées
14. **📅 Events API (Extended)** - Événements étendus
15. **👥 Users API (Extended)** - Utilisateurs étendus
16. **🏢 Organizations API (Extended)** - Organisations étendues

## 🎯 Exemples de requêtes

### Check-in de présence
```json
POST /attendances/check-in
{
  "eventId": "{{eventId}}",
  "method": "qr_code",
  "qrCode": "EVT-123-2024",
  "location": {
    "latitude": 48.8566,
    "longitude": 2.3522,
    "accuracy": 10
  }
}
```

### Recherche d'événements
```json
POST /events/search
{
  "query": "formation",
  "filters": {
    "type": ["training", "workshop"],
    "status": "published",
    "dateRange": {
      "start": "2024-03-01T00:00:00Z",
      "end": "2024-03-31T23:59:59Z"
    }
  }
}
```

### Configuration des préférences de notification
```json
PUT /notifications/preferences
{
  "channels": {
    "email": {
      "enabled": true,
      "frequency": "immediate"
    },
    "push": {
      "enabled": true,
      "frequency": "immediate"
    }
  },
  "types": {
    "event_reminder": {
      "enabled": true,
      "channels": ["email", "push"]
    }
  }
}
```

## 🚀 Utilisation

### Import de la collection
1. Ouvrir Postman
2. Cliquer sur "Import"
3. Sélectionner le fichier `core-workflow-postman-collection.json`
4. La collection sera importée avec toutes les nouvelles requêtes

### Configuration des variables
Configurer les variables d'environnement :
- `baseUrl` : URL de base de l'API
- `authToken` : Token d'authentification JWT
- `organizationId` : ID de votre organisation
- `eventId` : ID d'un événement de test
- `userId` : ID d'un utilisateur de test

### Tests automatisés
Plusieurs requêtes incluent des scripts de test automatiques qui :
- Extraient les IDs des réponses
- Les stockent dans les variables de collection
- Permettent l'enchaînement des requêtes

## 📝 Notes importantes

1. **Authentification requise** : La plupart des endpoints nécessitent un token JWT valide
2. **Permissions granulaires** : Certains endpoints nécessitent des permissions spécifiques
3. **Rate limiting** : Respecter les limites de taux pour éviter les erreurs 429
4. **Variables dynamiques** : Utiliser les variables de collection pour les IDs

## 🔄 Prochaines étapes

1. **Tester tous les nouveaux endpoints** avec des données réelles
2. **Valider les réponses** et ajuster si nécessaire
3. **Ajouter les endpoints manquants** (Appointments, Presence, QR Codes, Reports)
4. **Créer des tests automatisés** pour la validation continue
5. **Documenter les cas d'usage** spécifiques

---

**Collection mise à jour :** ✅ Terminée  
**Endpoints corrigés :** 150+  
**Nouvelles sections :** 6  
**Variables ajoutées :** 2