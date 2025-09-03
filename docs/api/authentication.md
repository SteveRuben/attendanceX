# 🔐 Authentication API

## Vue d'ensemble

L'API d'authentification d'Attendance-X fournit un système complet de gestion des utilisateurs avec JWT, 2FA, sécurité avancée, et intégration avec les organisations.

**Base URL:** `/api/auth`

## Fonctionnalités principales

- ✅ Authentification JWT avec tokens d'accès et de rafraîchissement
- 🔐 Authentification à deux facteurs (2FA) avec TOTP
- 🛡️ Rate limiting et protection contre les attaques
- 🏢 Gestion des organisations et invitations
- 📧 Vérification d'email et réinitialisation de mot de passe
- 📊 Métriques de sécurité et audit des sessions

## Endpoints

### POST /auth/login
Authentifie un utilisateur et retourne des tokens JWT.

**Fonctionnalités :**
- Validation des identifiants
- Génération de tokens JWT (access + refresh)
- Gestion de la 2FA si activée
- Rate limiting (5 tentatives/15min)
- Détection d'activité suspecte

**Requête :**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "rememberMe": false,
  "twoFactorCode": "123456"
}
```

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "user@example.com",
      "firstName": "Jean",
      "lastName": "Dupont",
      "role": "user",
      "organizationId": "org-123"
    },
    "expiresIn": 86400
  }
}
```

**Erreurs :**
- `401` - Identifiants invalides
- `423` - Compte verrouillé
- `429` - Trop de tentatives

### POST /auth/register
Crée un nouveau compte utilisateur.

**Requête :**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "firstName": "Marie",
  "lastName": "Martin",
  "organizationId": "org-123",
  "inviteToken": "invite-token-123"
}
```

### POST /auth/refresh-token
Rafraîchit un token d'accès expiré.

**Requête :**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### POST /auth/logout
Déconnecte l'utilisateur et invalide les tokens.

### POST /auth/forgot-password
Initie le processus de réinitialisation de mot de passe.

**Requête :**
```json
{
  "email": "user@example.com"
}
```

### POST /auth/reset-password
Réinitialise le mot de passe avec un token de réinitialisation.

**Requête :**
```json
{
  "token": "reset-token-123",
  "newPassword": "NewSecurePassword123!"
}
```

### POST /auth/change-password
Change le mot de passe de l'utilisateur connecté.

**Requête :**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

### GET /auth/verify-email/:token
Vérifie l'adresse email avec un token de vérification.

### POST /auth/resend-verification
Renvoie l'email de vérification.

## Authentification 2FA

### POST /auth/2fa/setup
Configure l'authentification à deux facteurs.

**Réponse :**
```json
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "secret": "JBSWY3DPEHPK3PXP",
    "backupCodes": ["12345678", "87654321", ...]
  }
}
```

### POST /auth/2fa/verify
Vérifie et active la 2FA.

**Requête :**
```json
{
  "token": "123456"
}
```

### POST /auth/2fa/disable
Désactive la 2FA.

**Requête :**
```json
{
  "password": "CurrentPassword123!",
  "token": "123456"
}
```

## Sécurité

### Rate Limiting
- **Login :** 5 tentatives par 15 minutes
- **Password Reset :** 3 tentatives par heure
- **2FA Setup :** 3 tentatives par heure

### Tokens JWT
- **Access Token :** 24 heures
- **Refresh Token :** 7 jours (30 jours avec "Remember Me")
- **Reset Token :** 1 heure
- **Verification Token :** 24 heures

### Headers requis
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

## Codes d'erreur

| Code | Description |
|------|-------------|
| `INVALID_CREDENTIALS` | Email ou mot de passe incorrect |
| `ACCOUNT_LOCKED` | Compte temporairement verrouillé |
| `EMAIL_NOT_VERIFIED` | Email non vérifié |
| `2FA_REQUIRED` | Code 2FA requis |
| `INVALID_2FA_CODE` | Code 2FA invalide |
| `TOKEN_EXPIRED` | Token expiré |
| `TOKEN_INVALID` | Token invalide |
| `PASSWORD_TOO_WEAK` | Mot de passe trop faible |
| `RATE_LIMIT_EXCEEDED` | Limite de taux dépassée |

## Exemples d'utilisation

### Connexion simple
```javascript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const { data } = await response.json();
localStorage.setItem('accessToken', data.accessToken);
```

### Connexion avec 2FA
```javascript
// Première tentative sans 2FA
let response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

if (response.status === 200) {
  const result = await response.json();
  if (result.data.requires2FA) {
    // Demander le code 2FA à l'utilisateur
    const twoFactorCode = prompt('Code 2FA:');
    
    // Nouvelle tentative avec le code 2FA
    response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'password123',
        twoFactorCode: twoFactorCode
      })
    });
  }
}
```

### Rafraîchissement automatique des tokens
```javascript
class AuthService {
  async makeAuthenticatedRequest(url, options = {}) {
    let token = localStorage.getItem('accessToken');
    
    let response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Si le token est expiré, essayer de le rafraîchir
    if (response.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      
      const refreshResponse = await fetch('/api/auth/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      
      if (refreshResponse.ok) {
        const { data } = await refreshResponse.json();
        localStorage.setItem('accessToken', data.accessToken);
        
        // Réessayer la requête originale
        response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${data.accessToken}`
          }
        });
      } else {
        // Rediriger vers la page de connexion
        window.location.href = '/login';
      }
    }
    
    return response;
  }
}
```