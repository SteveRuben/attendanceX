# 🚀 Guide de Test Rapide - AttendanceX API v3.0

Ce guide vous permet de tester rapidement l'API AttendanceX avec la collection Postman v3.0 complète.

## ⚡ Démarrage Ultra-Rapide (5 minutes)

### 1. Import et Configuration
```bash
# 1. Importer dans Postman
- AttendanceX-Complete-API-v3.postman_collection.json
- AttendanceX-Complete-Environment-v3.postman_environment.json

# 2. Sélectionner l'environnement
"AttendanceX Complete Environment v3.0"

# 3. Vérifier l'URL de base
baseUrl = "http://localhost:5001/api/v1"
```

### 2. Test Complet en 10 Requêtes
Exécutez ces requêtes dans l'ordre pour un test complet :

```
1. 🔐 Authentication > Register User
2. 🔐 Authentication > Login  
3. 🏢 Tenant Management > Register Tenant
4. 📧 User Invitations > Send Single Invitation
5. 📅 Events Management > Create Event
6. ✅ Attendance Management > Check In
7. 🔗 Integrations > Generate QR Code
8. 📊 Reports & Analytics > Generate Report
9. 💳 Billing & Subscriptions > Get Billing Dashboard
10. 🔔 Notifications > Get Notifications
```

**Résultat attendu** : Toutes les variables d'environnement sont automatiquement remplies et vous avez testé les fonctionnalités principales.

## 🎯 Tests par Fonctionnalité

### 🔐 Test d'Authentification Complète
```
Authentication > Register User          # Créer un compte
Authentication > Login                  # Se connecter
Authentication > Get Session           # Vérifier la session
Authentication > Setup 2FA             # Configurer 2FA (optionnel)
Authentication > Change Password       # Changer le mot de passe
Authentication > Logout               # Se déconnecter
```

### 🏢 Test Multi-Tenant
```
Tenant Management > Register Tenant           # Créer un tenant
Tenant Management > Get User Tenants         # Lister les tenants
Tenant Management > Switch Tenant Context    # Changer de contexte
Tenant Management > Validate Tenant Access   # Valider l'accès
```

### 📧 Test du Système d'Invitations
```
User Invitations > Send Single Invitation    # Invitation simple
User Invitations > Send Bulk Invitations     # Invitations en lot
User Invitations > Get Invitations          # Lister les invitations
User Invitations > Get Invitation Stats     # Statistiques
User Invitations > Resend Invitation        # Renvoyer
User Invitations > Cancel Invitation        # Annuler
```

### 📅 Test de Gestion d'Événements
```
Events Management > Create Event       # Créer un événement
Events Management > Get Events         # Lister les événements
Events Management > Get Event by ID    # Détails d'un événement
Events Management > Update Event       # Modifier un événement
Events Management > Delete Event       # Supprimer un événement
```

### ✅ Test de Présence
```
Attendance Management > Check In       # Pointer l'arrivée
Attendance Management > Get Attendances # Lister les présences
Attendance Management > Get My Attendances # Mes présences
```

### 🔗 Test d'Intégrations
```
Integrations > Get Available Integrations  # Intégrations disponibles
Integrations > Configure Integration       # Configurer une intégration
Integrations > Generate QR Code           # Générer un QR code
Integrations > Validate QR Code           # Valider un QR code
Integrations > Test Integration           # Tester une intégration
```

### 📊 Test de Rapports et Analytics
```
Reports & Analytics > Generate Report      # Générer un rapport
Reports & Analytics > Get Report Status    # Statut du rapport
Reports & Analytics > Download Report      # Télécharger le rapport
Reports & Analytics > Get ML Insights      # Insights IA
Reports & Analytics > Get Predictive Analytics # Analytics prédictifs
```

### 💳 Test de Facturation
```
Billing & Subscriptions > Get Billing Dashboard  # Dashboard facturation
Billing & Subscriptions > Get Usage Stats       # Statistiques d'usage
Billing & Subscriptions > Get Invoices          # Factures
Billing & Subscriptions > Update Payment Method # Méthode de paiement
Billing & Subscriptions > Upgrade Subscription  # Upgrade d'abonnement
```

### 🎨 Test de Personnalisation
```
Branding & Customization > Get Branding Settings    # Paramètres de branding
Branding & Customization > Update Branding          # Mettre à jour le branding
Branding & Customization > Upload Logo              # Upload du logo
Branding & Customization > Configure Custom Domain  # Domaine personnalisé
Branding & Customization > Update Feature Settings  # Paramètres des fonctionnalités
```

### 📧 Test de Campagnes Email
```
Email Campaigns > Create Email Campaign     # Créer une campagne
Email Campaigns > Get Campaign Templates    # Templates de campagne
Email Campaigns > Send Test Campaign        # Envoyer un test
Email Campaigns > Launch Campaign           # Lancer la campagne
Email Campaigns > Get Campaign Analytics    # Analytics de campagne
```

## 🧪 Scénarios de Test Avancés

### Scénario 1 : Onboarding Complet d'un Nouveau Tenant
```
1. Authentication > Register User
2. Tenant Management > Register Tenant
3. Branding & Customization > Update Branding
4. User Invitations > Send Bulk Invitations
5. Events Management > Create Event
6. Integrations > Generate QR Code
7. Email Campaigns > Create Email Campaign
8. Reports & Analytics > Generate Report
```

### Scénario 2 : Workflow de Présence Quotidien
```
1. Authentication > Login
2. Events Management > Get Events
3. Attendance Management > Check In
4. Integrations > Validate QR Code
5. Notifications > Get Notifications
6. Attendance Management > Get My Attendances
```

### Scénario 3 : Administration et Monitoring
```
1. Authentication > Login (admin)
2. User Management > Get Users
3. Billing & Subscriptions > Get Usage Stats
4. Reports & Analytics > Get ML Insights
5. Branding & Customization > Get Feature Customization
6. Email Campaigns > Get Campaign Analytics
```

### Scénario 4 : Test d'Isolation Multi-Tenant
```
1. Créer Tenant A et Tenant B
2. Créer des données dans chaque tenant
3. Vérifier l'isolation des données
4. Tester l'accès croisé (doit échouer)
5. Nettoyer les données de test
```

## 🔍 Validation des Tests

### Codes de Statut Attendus
```
✅ 200 OK          - Récupération réussie
✅ 201 Created     - Création réussie
✅ 204 No Content  - Suppression réussie
✅ 400 Bad Request - Données invalides (attendu)
✅ 401 Unauthorized - Non authentifié (attendu)
✅ 403 Forbidden   - Permissions insuffisantes (attendu)
✅ 404 Not Found   - Ressource inexistante (attendu)
✅ 429 Too Many Requests - Rate limiting (attendu)
```

### Variables Auto-Remplies à Vérifier
```javascript
// Après Authentication > Login
pm.environment.get('accessToken')    // Token JWT
pm.environment.get('refreshToken')   // Refresh token
pm.environment.get('userId')         // ID utilisateur

// Après Tenant Management > Register Tenant
pm.environment.get('tenantId')       // ID du tenant

// Après Events Management > Create Event
pm.environment.get('eventId')        // ID de l'événement

// Après User Invitations > Send Single Invitation
pm.environment.get('invitationId')   // ID de l'invitation

// Et ainsi de suite pour toutes les ressources créées...
```

### Tests Automatiques Intégrés
Chaque requête inclut des tests automatiques qui vérifient :
- ✅ Code de statut HTTP correct
- ✅ Structure de la réponse JSON
- ✅ Présence des champs requis
- ✅ Extraction et sauvegarde des IDs
- ✅ Validation des données métier

## 🚨 Résolution de Problèmes

### Problème : Token Expiré
```
Symptôme: Erreur 401 sur les requêtes authentifiées
Solution: Re-exécuter "Authentication > Login"
```

### Problème : Variables Manquantes
```
Symptôme: Erreur 400/404 avec des IDs vides
Solution: Exécuter les requêtes de création en premier
```

### Problème : Rate Limiting
```
Symptôme: Erreur 429 Too Many Requests
Solution: Attendre 1-2 minutes entre les tests intensifs
```

### Problème : Contexte Tenant Incorrect
```
Symptôme: Erreur 403 ou données vides
Solution: Vérifier la variable "tenantId" et re-exécuter "Switch Tenant Context"
```

## 📊 Métriques de Test

### Test Complet (120+ endpoints)
- **Durée estimée** : 15-20 minutes
- **Requêtes** : 120+ endpoints
- **Sections** : 16 modules
- **Variables générées** : 20+ IDs et tokens

### Test Rapide (10 endpoints essentiels)
- **Durée estimée** : 2-3 minutes
- **Requêtes** : 10 endpoints clés
- **Couverture** : Fonctionnalités principales
- **Variables générées** : 8-10 IDs essentiels

### Test par Module (par section)
- **Durée estimée** : 1-2 minutes par module
- **Requêtes** : 3-8 endpoints par module
- **Focus** : Fonctionnalité spécifique
- **Variables générées** : 1-3 IDs par module

## 🎯 Conseils d'Optimisation

### Pour les Tests de Développement
1. **Utilisez le test rapide** pour les vérifications quotidiennes
2. **Focalisez sur les modules** que vous développez
3. **Automatisez** avec Newman CLI pour l'intégration continue

### Pour les Tests de Validation
1. **Exécutez le test complet** avant les releases
2. **Utilisez les scénarios avancés** pour les cas complexes
3. **Documentez** les résultats et les anomalies

### Pour les Tests de Performance
1. **Respectez les rate limits** pour éviter les faux positifs
2. **Mesurez les temps de réponse** avec les scripts de test
3. **Testez sous charge** avec des outils dédiés

---

**🚀 Prêt à tester ?** Importez la collection v3.0 et commencez par le test rapide en 10 requêtes !

**📞 Besoin d'aide ?** Consultez le [README-v3.md](./README-v3.md) pour plus de détails.