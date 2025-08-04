# 🚀 Guide de Tests Backend - JWT Architecture

Ce guide vous permet de lancer rapidement les tests backend pour le système de gestion avec architecture JWT moderne.

## ⚡ Démarrage Ultra-Rapide

### **1. Installation et Configuration**

```bash
# Cloner le projet et installer les dépendances
git clone <repo-url>
cd attendance-management-system
npm run install:all

# Configuration automatique des tests (Linux/Mac)
./scripts/test-backend-jwt.sh setup

# Configuration automatique des tests (Windows)
.\scripts\test-backend-jwt.ps1 setup
```

### **2. Lancer les Tests JWT**

#### **Linux/Mac**
```bash
# Tests JWT seulement (authentification et sécurité)
./scripts/test-backend-jwt.sh jwt

# Tests d'authentification complets
./scripts/test-backend-jwt.sh auth

# Tests de sécurité JWT
./scripts/test-backend-jwt.sh security

# Tous les tests avec couverture JWT
./scripts/test-backend-jwt.sh coverage

# Mode développement avec watch JWT
./scripts/test-backend-jwt.sh watch
```

#### **Windows**
```powershell
# Tests JWT seulement
.\scripts\test-backend-jwt.ps1 jwt

# Tests d'authentification complets
.\scripts\test-backend-jwt.ps1 auth

# Tests de sécurité JWT
.\scripts\test-backend-jwt.ps1 security

# Tous les tests avec couverture JWT
.\scripts\test-backend-jwt.ps1 coverage

# Mode développement avec watch JWT
.\scripts\test-backend-jwt.ps1 watch
```

## 📋 Commandes NPM Directes JWT

Si vous préférez utiliser npm directement :

```bash
# Tests JWT spécifiques
npm run test:jwt

# Tests d'authentification JWT
npm run test:auth:jwt

# Tests de sécurité JWT
npm run test:security:jwt

# Tests de performance JWT
npm run test:performance:jwt

# Tests unitaires backend avec JWT
npm run test:backend:unit:jwt

# Tests d'intégration backend avec JWT
npm run test:backend:integration:jwt

# Tous les tests backend avec JWT
npm run test:backend:jwt

# Tests avec couverture JWT
npm run test:backend:coverage:jwt

# Mode watch pour développement JWT
npm run test:backend:watch:jwt
```

## 🎯 Tests Spécifiques JWT

### **Par Composant JWT**

```bash
# Tests du service d'authentification JWT
npm run test:backend -- --testPathPattern=auth.service.test.ts

# Tests du middleware JWT
npm run test:backend -- --testPathPattern=auth.middleware.test.ts

# Tests des contrôleurs avec JWT
npm run test:backend -- --testPathPattern=controllers.*jwt

# Tests des routes avec sécurité JWT
npm run test:backend -- --testPathPattern=routes.*jwt
```

### **Par Fonctionnalité JWT**

```bash
# Tests de génération de tokens JWT
npm run test:backend -- --testNamePattern="generate.*token"

# Tests de validation JWT
npm run test:backend -- --testNamePattern="validate.*jwt"

# Tests de permissions basées sur JWT
npm run test:backend -- --testNamePattern="permission.*jwt"

# Tests de refresh tokens
npm run test:backend -- --testNamePattern="refresh.*token"
```

### **Par Niveau de Sécurité**

```bash
# Tests de sécurité critiques JWT
npm run test:security:jwt -- --testNamePattern="critical"

# Tests de vulnérabilités JWT
npm run test:security:jwt -- --testNamePattern="vulnerability"

# Tests de pénétration JWT
npm run test:security:jwt -- --testNamePattern="penetration"

# Tests de conformité JWT
npm run test:security:jwt -- --testNamePattern="compliance"
```

## 🔧 Configuration Requise JWT

### **Dépendances JWT Minimales**

Assurez-vous d'avoir ces packages dans `backend/functions/package.json` :

```json
{
  "dependencies": {
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "@google-cloud/secret-manager": "^4.2.0"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/bcryptjs": "^2.4.0",
    "@types/supertest": "^2.0.12",
    "jest": "^29.5.0",
    "supertest": "^6.3.3",
    "ts-jest": "^29.1.0"
  }
}
```

### **Variables d'Environnement JWT**

Le fichier `.env.test` est automatiquement configuré avec :

```env
# JWT Configuration de test
JWT_SECRET=test-super-secret-jwt-key-for-testing-only-256-bits-minimum
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
JWT_ALGORITHM=HS256

# Configuration Firebase de test
FIREBASE_PROJECT_ID=test-project
FIREBASE_API_KEY=test-api-key

# Configuration email de test
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=test@ethereal.email
SMTP_PASS=test-password

# Configuration Redis de test (pour cache JWT)
REDIS_URL=redis://localhost:6379/1
```

## 📊 Rapports de Tests JWT

### **Couverture de Code JWT**

```bash
# Générer le rapport de couverture JWT
npm run test:backend:coverage:jwt

# Le rapport HTML sera dans : tests/reports/jwt-coverage/lcov-report/index.html
```

### **Rapports de Sécurité JWT**

```bash
# Générer des rapports de sécurité JWT
npm run test:security:jwt -- --reporters=jest-junit

# Rapport de vulnérabilités JWT
npm run test:security:jwt -- --testNamePattern="vulnerability" --verbose
```

### **Métriques de Performance JWT**

```bash
# Tests de performance JWT avec métriques
npm run test:performance:jwt -- --verbose

# Benchmark des opérations JWT
npm run test:performance:jwt -- --testNamePattern="benchmark"
```

## 🐛 Résolution Rapide des Problèmes JWT

### **Erreur "JWT Secret not found"**
```bash
# Vérifier la configuration des secrets
echo $JWT_SECRET
# Ou régénérer le secret de test
./scripts/generate-jwt-test-secret.sh
```

### **Erreur "Token validation failed"**
```bash
# Vérifier la configuration JWT
npm run test:jwt -- --testNamePattern="token.*validation" --verbose
```

### **Tests JWT qui traînent**
```bash
# Augmenter le timeout pour les tests JWT
npm run test:jwt -- --testTimeout=60000
```

### **Problèmes de cache Redis (JWT)**
```bash
# Nettoyer le cache Redis de test
redis-cli -n 1 FLUSHDB
# Ou redémarrer Redis
sudo systemctl restart redis
```

### **Nettoyage complet JWT**
```bash
# Linux/Mac
./scripts/test-backend-jwt.sh clean

# Windows
.\scripts\test-backend-jwt.ps1 clean

# Ou manuellement
rm -rf node_modules backend/functions/node_modules
rm -rf tests/reports/jwt-*
npm install
cd backend/functions && npm install
```

## 📈 Métriques de Performance JWT

### **Tests Rapides JWT (< 15s)**
- Tests unitaires JWT seulement
- Génération et validation de tokens
- Mocks complets des services externes

### **Tests Complets JWT (1-2 min)**
- Tests unitaires + intégration JWT
- Tests de sécurité JWT
- Tests avec émulateurs Firebase
- Couverture de code JWT

### **Tests de Charge JWT (3-5 min)**
- Tests de performance sous charge
- Tests de concurrence JWT
- Tests de scalabilité

### **Objectifs de Performance JWT**
- **Génération Token** : < 10ms
- **Validation Token** : < 5ms (avec cache)
- **Refresh Token** : < 15ms
- **Révocation Token** : < 20ms
- **Cache Hit Rate** : > 99%

## 🚨 Aide Rapide JWT

### **Commandes d'Aide JWT**
```bash
# Linux/Mac
./scripts/test-backend-jwt.sh help

# Windows
.\scripts\test-backend-jwt.ps1 help

# NPM
npm run test:jwt -- --help
```

### **Debugging JWT**
```bash
# Tests JWT avec debug complet
DEBUG=jwt:* npm run test:jwt

# Tests avec logs détaillés
npm run test:jwt -- --verbose --detectOpenHandles

# Tests JWT spécifiques avec debug
npm run test:jwt -- --testNamePattern="login" --verbose
```

### **Validation de Configuration JWT**
```bash
# Vérifier la configuration JWT
npm run validate:jwt:config

# Tester la connectivité aux services
npm run test:jwt:connectivity

# Vérifier les secrets JWT
npm run test:jwt:secrets
```

## 🔒 Tests de Sécurité JWT Spécialisés

### **Tests de Vulnérabilités JWT**
```bash
# Tests d'attaques par confusion d'algorithme
npm run test:security:jwt -- --testNamePattern="algorithm.*confusion"

# Tests d'attaques par force brute
npm run test:security:jwt -- --testNamePattern="brute.*force"

# Tests de replay attacks
npm run test:security:jwt -- --testNamePattern="replay.*attack"

# Tests de token tampering
npm run test:security:jwt -- --testNamePattern="token.*tampering"
```

### **Tests de Conformité JWT**
```bash
# Tests de conformité RFC 7519
npm run test:security:jwt -- --testNamePattern="rfc.*7519"

# Tests de conformité OWASP
npm run test:security:jwt -- --testNamePattern="owasp"

# Tests de conformité GDPR
npm run test:security:jwt -- --testNamePattern="gdpr"
```

## 🎉 Workflow de Développement JWT Recommandé

### **Développement quotidien**
1. **Développement** : `npm run test:jwt:watch`
2. **Avant commit** : `npm run test:jwt`
3. **Avant push** : `npm run test:backend:coverage:jwt`
4. **CI/CD** : `npm run test:backend:jwt` (automatique)

### **Tests de sécurité hebdomadaires**
1. **Lundi** : `npm run test:security:jwt`
2. **Mercredi** : `npm run test:performance:jwt`
3. **Vendredi** : `npm run test:backend:jwt:full`

### **Tests de régression mensuels**
1. **Semaine 1** : Tests de charge JWT
2. **Semaine 2** : Tests de pénétration JWT
3. **Semaine 3** : Tests de conformité JWT
4. **Semaine 4** : Optimisation et documentation

## 📚 Documentation JWT Avancée

### **Guides Spécialisés**
- `tests/jwt/README.md` - Documentation complète JWT
- `tests/security/JWT-SECURITY.md` - Guide de sécurité JWT
- `tests/performance/JWT-PERFORMANCE.md` - Guide de performance JWT
- `docs/JWT-ARCHITECTURE.md` - Architecture JWT détaillée

### **Exemples de Tests JWT**
```typescript
// Exemple de test JWT complet
describe('JWT Authentication Flow', () => {
  it('should complete full authentication cycle', async () => {
    // 1. Register user
    const registerResponse = await request(app)
      .post('/auth/register')
      .send(testUser);
    
    // 2. Verify JWT tokens in response
    expect(registerResponse.body.accessToken).toBeDefined();
    expect(registerResponse.body.refreshToken).toBeDefined();
    
    // 3. Validate token structure
    const decodedToken = jwt.decode(registerResponse.body.accessToken);
    expect(decodedToken.sub).toBe(testUser.id);
    expect(decodedToken.role).toBe('user');
    
    // 4. Use token for authenticated request
    const profileResponse = await request(app)
      .get('/users/me')
      .set('Authorization', `Bearer ${registerResponse.body.accessToken}`);
    
    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.email).toBe(testUser.email);
  });
});
```

## 🏆 Critères de Réussite JWT

### **Sécurité JWT**
- ✅ 100% des tests de sécurité JWT passent
- ✅ Aucune vulnérabilité critique détectée
- ✅ Conformité aux standards JWT (RFC 7519)
- ✅ Résistance aux attaques connues

### **Performance JWT**
- ✅ Génération de token < 10ms
- ✅ Validation de token < 5ms (avec cache)
- ✅ 10,000+ validations/seconde
- ✅ Cache hit rate > 99%

### **Fiabilité JWT**
- ✅ 99.9% de réussite des tests
- ✅ Gestion gracieuse des erreurs
- ✅ Récupération automatique après panne
- ✅ Monitoring en temps réel

### **Couverture JWT**
- ✅ Services JWT : > 98%
- ✅ Middleware JWT : > 95%
- ✅ Routes JWT : > 90%
- ✅ Tests de sécurité : 100%

---

**🚀 Vous êtes prêt ! Lancez vos premiers tests JWT avec une des commandes ci-dessus.**

**🔒 N'oubliez pas de lancer les tests de sécurité JWT régulièrement pour maintenir un niveau de sécurité optimal.**