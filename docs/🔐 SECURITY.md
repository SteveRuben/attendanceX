# 🔐 Guide Sécurité - AttendanceX

> 🛡️ **Guide complet** des mesures de sécurité, bonnes pratiques et conformité réglementaire

## 🎯 Vue d'ensemble sécuritaire

AttendanceX implémente une **architecture de sécurité en profondeur** (Defense in Depth) qui protège les données et les fonctionnalités à plusieurs niveaux. Notre approche de sécurité intègre des contrôles préventifs, détectifs et correctifs pour minimiser les risques et protéger les informations sensibles.

```
┌─────────────────────────────────────┐
│  🌐 Network Security (HTTPS/TLS)    │
├─────────────────────────────────────┤
│  🔐 Authentication (Firebase Auth)  │
├─────────────────────────────────────┤  
│  🛡️ Authorization (Role-based)      │
├─────────────────────────────────────┤
│  ✅ Validation (Input sanitization) │
├─────────────────────────────────────┤
│  🔒 Encryption (Data at rest)       │
└─────────────────────────────────────┘
```

## 🔑 Authentification

### 🔐 **Mécanismes d'authentification**

AttendanceX utilise Firebase Authentication pour gérer l'authentification des utilisateurs de manière sécurisée et fiable. Notre système prend en charge plusieurs méthodes d'authentification :

- Email et mot de passe avec validation d'email
- Authentification par numéro de téléphone (SMS)
- Authentification via fournisseurs d'identité tiers (Google, Microsoft)
- Authentification à deux facteurs (2FA) pour une sécurité renforcée

### 🔑 **Gestion des mots de passe**

- **Politique robuste** : Exigence minimum de 12 caractères avec complexité (majuscules, minuscules, chiffres, symboles)
- **Hachage sécurisé** : Utilisation des algorithmes bcrypt/PBKDF2 pour stocker les mots de passe
- **Renouvellement périodique** : Les mots de passe expirent après 90 jours (configurable)
- **Historique des mots de passe** : Empêche la réutilisation des 10 derniers mots de passe

### 🚫 **Protection contre les attaques**

- **Limitation des tentatives** : Verrouillage de compte après 5 tentatives échouées
- **Temps de verrouillage progressif** : 30 minutes par défaut, avec augmentation progressive
- **Alertes en temps réel** : Notification des tentatives de connexion suspectes
- **Détection des appareils inconnus** : Vérification supplémentaire pour les nouvelles connexions

## 🛡️ Autorisation et contrôle d'accès

### 👑 **Système de rôles et permissions**

AttendanceX utilise un système RBAC (Role-Based Access Control) hiérarchique qui définit précisément ce que chaque utilisateur peut faire :

```javascript
// Extrait de la configuration des rôles
export const roles = {
  SUPER_ADMIN: {
    level: 100,
    inherits: ['ADMIN'],
    permissions: [
      'manage_roles',
      'manage_system_settings',
      'delete_any_user',
      'reset_any_password',
      'view_audit_logs'
    ]
  },
  
  ADMIN: {
    level: 80,
    inherits: ['ORGANIZER'],
    permissions: [
      'manage_users',
      'view_all_users',
      'view_all_events',
      'view_all_attendances',
      'generate_all_reports'
    ]
  },
  
  ORGANIZER: {
    level: 60,
    inherits: ['MANAGER'],
    permissions: [
      'create_events',
      'edit_events',
      'delete_own_events',
      'view_event_attendances',
      'validate_attendances'
    ]
  },
  
  PARTICIPANT: {
    level: 20,
    inherits: [],
    permissions: [
      'mark_attendance', 
      'view_own_attendance', 
      'update_profile'
    ]
  }
}
```

#### 🔐 **Validation des permissions**
```typescript
export class PermissionService {
  // Vérifie si un utilisateur possède une permission spécifique
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const user = await this.userService.getById(userId);
    if (!user) return false;
    
    const userRole = user.role;
    return this.roleService.checkPermission(userRole, permission);
  }
  
  // Vérifie plusieurs permissions à la fois
  async hasAllPermissions(userId: string, permissions: string[]): Promise<boolean> {
    const user = await this.userService.getById(userId);
    if (!user) return false;
    
    const userRole = user.role;
    return permissions.every(permission => 
      this.roleService.checkPermission(userRole, permission)
    );
  }
  
  // Vérifie si l'utilisateur a au moins une des permissions
  async hasAnyPermission(userId: string, permissions: string[]): Promise<boolean> {
    const user = await this.userService.getById(userId);
    if (!user) return false;
    
    const userRole = user.role;
    return permissions.some(permission => 
      this.roleService.checkPermission(userRole, permission)
    );
  }
}
```

### 🔒 **Règles de sécurité Firestore**

Les règles de sécurité Firestore constituent une couche critique qui applique les contrôles d'accès directement au niveau de la base de données, indépendamment du code applicatif :

```javascript
// Extrait des règles Firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Fonctions d'aide
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    function hasRole(role) {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == role;
    }
    
    function hasAnyRole(roles) {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in roles;
    }
    
    function hasPermission(permission) {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.permissions[permission] == true;
    }
    
    // Règles pour les utilisateurs
    match /users/{userId} {
      allow read: if isAuthenticated() && (
        isOwner(userId) || 
        hasAnyRole(['admin', 'super_admin']) ||
        hasPermission('canViewUsers')
      );
      
      allow create: if isAuthenticated() && 
        hasAnyRole(['admin', 'super_admin']);
      
      allow update: if isAuthenticated() && (
        (isOwner(userId) && isValidProfileUpdate()) ||
        hasAnyRole(['admin', 'super_admin'])
      );
      
      allow delete: if isAuthenticated() && 
        hasRole('super_admin') &&
        userId != request.auth.uid; // Impossible de supprimer son propre compte
    }
    
    // Règles pour les événements
    match /events/{eventId} {
      allow read: if isAuthenticated() && (
        request.auth.uid in resource.data.participants ||
        resource.data.organizerId == request.auth.uid ||
        hasAnyRole(['admin', 'super_admin']) ||
        hasPermission('canViewAllEvents')
      );
      
      allow create: if isAuthenticated() && 
        hasPermission('canCreateEvents');
        
      allow update: if isAuthenticated() && (
        resource.data.organizerId == request.auth.uid ||
        hasAnyRole(['admin', 'super_admin'])
      );
      
      allow delete: if isAuthenticated() && (
        resource.data.organizerId == request.auth.uid ||
        hasRole('super_admin')
      );
    }
    
    // Règles pour les présences
    match /attendances/{attendanceId} {
      allow read: if isAuthenticated() && (
        resource.data.userId == request.auth.uid ||
        isEventOrganizer(resource.data.eventId) ||
        hasAnyRole(['admin', 'super_admin']) ||
        hasPermission('canViewReports')
      );
      
      allow create: if isAuthenticated() && 
        isValidAttendanceData() &&
        canMarkAttendance();
      
      allow update: if isAuthenticated() && 
        hasAnyRole(['organizer', 'admin', 'super_admin']) &&
        isValidAttendanceUpdate();
      
      allow delete: if isAuthenticated() && 
        hasAnyRole(['admin', 'super_admin']);
    }
  }
}
```

## 🔒 Cryptage et protection des données

### 🔐 **Cryptage en transit**

- **HTTPS obligatoire** pour toutes les communications
- **TLS 1.2+** requis, avec les chiffrements modernes uniquement
- **HSTS** (HTTP Strict Transport Security) activé
- **Certificate Pinning** pour les applications mobiles

### 🔒 **Cryptage au repos**

- **Données sensibles** chiffrées avec AES-256
- **Clés de chiffrement** gérées via KMS (Key Management Service)
- **Rotation périodique** des clés de chiffrement
- **Stockage sécurisé** des secrets avec Secret Manager

### 📱 **Sécurité des tokens**

- **Tokens JWT** avec signature HMAC-SHA256
- **Courte durée de vie** (1 heure par défaut)
- **Rotation des clés de signature** régulière
- **Révocation de tokens** en cas de déconnexion ou de compromission

### 🛡️ **Protection contre les fuites de données**

- **Masquage des données sensibles** dans les logs et l'interface
- **Politique d'accès minimal** pour les intégrations tierces
- **Détection d'anomalies** sur les volumes de données consultées
- **Prévention de perte de données** (DLP) pour les données critiques

## 🛑 Protection contre les attaques courantes

### 🔥 **Sécurité des API**

- **Protection CSRF** avec tokens anti-CSRF
- **Limites de débit** pour prévenir les abus d'API
- **Validation des paramètres** pour chaque requête
- **Entêtes de sécurité** (CSP, X-XSS-Protection, etc.)

### 🛡️ **Prévention des vulnérabilités OWASP Top 10**

1. **Injection** : Validation stricte des entrées, requêtes préparées
2. **Authentification compromise** : Authentification forte, session sécurisée
3. **Exposition de données sensibles** : Chiffrement, minimisation des données
4. **XXE** : Désactivation du parsing d'entités externes
5. **Contrôle d'accès défaillant** : RBAC, vérification à chaque niveau
6. **Mauvaise configuration** : Audits réguliers, principes du moindre privilège
7. **XSS** : CSP, échappement des sorties
8. **Désérialisation non sécurisée** : Validation stricte
9. **Composants vulnérables** : Analyse automatique des dépendances
10. **Journalisation insuffisante** : Audit trail complet

### 🧪 **Tests de sécurité**

- **Tests statiques (SAST)** pour détecter les vulnérabilités dans le code
- **Tests dynamiques (DAST)** pour évaluer les vulnérabilités en exécution
- **Tests de pénétration** réguliers par des experts en sécurité
- **Scan de vulnérabilités** des dépendances et du code

## 📝 Audit et journalisation

### 📊 **Journalisation complète**

- **Audit trail** de toutes les actions sensibles
- **Journalisation structurée** au format JSON pour analyse
- **Niveaux de détail** configurables selon l'environnement
- **Rotation des logs** pour optimiser le stockage

```typescript
// Exemple de journalisation d'audit
logger.audit('user_login', {
  userId: user.id,
  ipAddress: request.ip,
  userAgent: request.headers['user-agent'],
  loginMethod: 'password',
  success: true,
  timestamp: new Date()
});
```

### 🔍 **Surveillance et alertes**

- **Détection d'anomalies** sur les patterns d'accès
- **Alertes en temps réel** pour les incidents de sécurité
- **Tableau de bord sécurité** pour les administrateurs
- **Rapports périodiques** sur l'état de la sécurité

### 🚨 **Gestion des incidents**

- **Plan de réponse** documenté pour les incidents de sécurité
- **Équipe dédiée** pour la résolution des incidents
- **Communication transparente** en cas de violation
- **Procédure de post-mortem** pour éviter la récurrence

## 🔄 Conformité réglementaire

### 📋 **RGPD (Règlement Général sur la Protection des Données)**

- **Minimisation des données** : Collecte limitée aux données nécessaires
- **Droit à l'oubli** : Procédure de suppression des données sur demande
- **Portabilité des données** : Export au format standard
- **Consentement explicite** pour le traitement des données

### 🏢 **Conformité sectorielle**

- **SOC 2** : Contrôles sur la sécurité, la disponibilité et la confidentialité
- **ISO 27001** : Cadre de gestion de la sécurité de l'information
- **HIPAA** : Pour les données de santé (si applicable)
- **PCI DSS** : Pour le traitement des paiements (si applicable)

## 🔧 Configuration et déploiement sécurisés

### ⚙️ **Paramètres de sécurité**

```bash
# Extrait de .env.example
# Configuration de sécurité
SECURITY_HEADERS_ENABLED=true
FORCE_HTTPS=true
ENABLE_CORS=true
CORS_ORIGINS=https://your-domain.com,https://admin.your-domain.com

# Authentification à deux facteurs
ENABLE_2FA=true
2FA_ISSUER=AttendanceX
2FA_WINDOW=2                # Fenêtre de tolérance en périodes de 30s

# Politique de mots de passe
PASSWORD_MIN_LENGTH=12
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true  
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SYMBOLS=true
PASSWORD_MAX_AGE_DAYS=90    # Force changement après 90 jours

# Session et tokens
JWT_EXPIRY=24h              # 1h | 24h | 7d
REFRESH_TOKEN_EXPIRY=7d
SESSION_TIMEOUT_MINUTES=60
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_MINUTES=30
```

### 🚀 **CI/CD sécurisé**

- **Scans de sécurité** automatisés dans le pipeline CI/CD
- **Secrets sécurisés** pour les déploiements
- **Signature du code** pour garantir l'intégrité
- **Déploiements progressifs** avec possibilité de rollback

### 🔒 **Environnements isolés**

- **Séparation stricte** entre développement, test et production
- **Principe du moindre privilège** pour chaque environnement
- **Données de test anonymisées** pour le développement
- **Configurations spécifiques** à chaque environnement

## ✅ Checklist de sécurité

Utilisez cette checklist pour vérifier que toutes les mesures de sécurité sont en place avant le déploiement en production :

### 🔐 **Authentification et autorisation**
- [ ] Configuration des rôles et permissions vérifiée
- [ ] Politique de mots de passe appliquée
- [ ] 2FA activé pour les comptes sensibles
- [ ] Règles Firestore testées et validées
- [ ] Tokens JWT correctement configurés

### 🔒 **Protection des données**
- [ ] HTTPS configuré et testé
- [ ] Données sensibles identifiées et chiffrées
- [ ] Gestion des clés de chiffrement en place
- [ ] Minimisation des données appliquée
- [ ] Exports de données sécurisés

### 🛡️ **Protection des API**
- [ ] Validation des entrées implémentée
- [ ] Limites de débit configurées
- [ ] Entêtes de sécurité activés
- [ ] Protection CSRF en place
- [ ] Tests de pénétration effectués

### 📊 **Journalisation et monitoring**
- [ ] Audit trail complet configuré
- [ ] Rotation des logs en place
- [ ] Alertes configurées pour les incidents
- [ ] Tableau de bord de sécurité opérationnel
- [ ] Procédure d'incident documentée

### 🔄 **Conformité**
- [ ] Politique de confidentialité à jour
- [ ] Procédures RGPD documentées
- [ ] Mécanismes de consentement implémentés
- [ ] Délais de conservation des données définis
- [ ] Rapports de conformité générés

## 🔄 Mise à jour et maintenance

La sécurité est un processus continu. Suivez ces bonnes pratiques pour maintenir un niveau de sécurité optimal :

1. **Veille sécurité** : Suivre les bulletins de sécurité pour les composants utilisés
2. **Mises à jour régulières** : Appliquer rapidement les correctifs de sécurité
3. **Revues de code** : Focus sur les aspects sécurité lors des revues
4. **Formation continue** : Sensibiliser l'équipe aux bonnes pratiques
5. **Tests périodiques** : Réaliser des tests de pénétration réguliers

---

Pour toute question ou préoccupation concernant la sécurité d'AttendanceX, veuillez contacter notre équipe de sécurité à security@attendancex.com.

**Dernière mise à jour** : Juin 2025