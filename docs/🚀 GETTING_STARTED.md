# 🚀 Guide de Démarrage Rapide - AttendanceX

> ⏱️ **Temps estimé** : 15-30 minutes pour une installation complète  
> 🎯 **Objectif** : Faire fonctionner AttendanceX en local et déployer en production

## 📋 Prérequis système

### 💻 **Environnement de développement**
```bash
# Vérifier les versions requises
node --version    # ≥ 18.0.0
npm --version     # ≥ 9.0.0
git --version     # ≥ 2.30.0
```

### ☁️ **Comptes requis**
- [Firebase Account](https://firebase.google.com/) (gratuit)
- [GitHub Account](https://github.com/) (pour le code)
- [Twilio Account](https://www.twilio.com/) (optionnel, pour SMS)

## 🛠️ Installation pas à pas

### Étape 1 : Récupération du code
```bash
# Cloner le repository
git clone https://github.com/votre-username/attendance-management-system.git
cd attendance-management-system

# Vérifier la structure
ls -la
# Vous devriez voir : backend/, frontend/, shared/, docs/
```

### Étape 2 : Configuration Firebase

#### 2.1 Créer un projet Firebase
1. Aller sur [Firebase Console](https://console.firebase.google.com/)
2. Cliquer sur **"Créer un projet"**
3. Nom du projet : `attendance-system-prod` (ou votre choix)
4. Activer Google Analytics (recommandé)

#### 2.2 Configurer les services Firebase
```bash
# Installer Firebase CLI
npm install -g firebase-tools

# Se connecter à Firebase
firebase login

# Initialiser le projet
firebase init

# Sélectionner les services :
# ✅ Firestore
# ✅ Functions  
# ✅ Hosting
# ✅ Storage
# ✅ Authentication
```

#### 2.3 Configuration Authentication
1. Dans Firebase Console → **Authentication** → **Sign-in method**
2. Activer **Email/Password**
3. Optionnel : Activer **Google**, **GitHub** pour OAuth

#### 2.4 Configuration Firestore
```bash
# Déployer les règles de sécurité
firebase deploy --only firestore:rules

# Déployer les index
firebase deploy --only firestore:indexes
```

### Étape 3 : Variables d'environnement

#### 3.1 Backend (.env)
```bash
# Copier le template
cp .env.example .env

# Éditer avec vos clés Firebase
nano .env
```

```bash
# Firebase Configuration
GOOGLE_CLOUD_PROJECT=your-project-id
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef

# Environment
NODE_ENV=development
API_URL=http://localhost:5001
FRONTEND_URL=http://localhost:3000

# Security
JWT_SECRET=your-super-secret-jwt-key-here
ENCRYPTION_KEY=your-encryption-key-32-chars

# SMS Configuration (optionnel)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Email Configuration (optionnel)
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@your-domain.com
```

#### 3.2 Récupérer les clés Firebase
1. Firebase Console → **Paramètres du projet** → **Général**
2. Section **Vos applications** → **Config**
3. Copier les valeurs dans `.env`

### Étape 4 : Installation des dépendances

```bash
# Installer toutes les dépendances
npm install

# Ou installer séparément
cd backend/functions && npm install
cd ../../frontend && npm install
cd ../shared && npm install
```

### Étape 5 : Première exécution

#### 5.1 Démarrer les émulateurs Firebase
```bash
# Terminal 1 - Émulateurs Firebase
firebase emulators:start

# Vérifier que tous les services démarrent :
# ✅ Auth Emulator: http://localhost:9099
# ✅ Functions Emulator: http://localhost:5001
# ✅ Firestore Emulator: http://localhost:8080
# ✅ Storage Emulator: http://localhost:9199
```

#### 5.2 Démarrer le backend
```bash
# Terminal 2 - Backend
cd backend/functions
npm run serve

# Vérifier l'API :
# ✅ API disponible sur http://localhost:5001/your-project/us-central1/api
```

#### 5.3 Démarrer le frontend
```bash
# Terminal 3 - Frontend  
cd frontend
npm run dev

# Vérifier l'interface :
# ✅ App disponible sur http://localhost:3000
```

## 🧪 Tests de validation

### Test 1 : API Backend
```bash
# Tester l'endpoint de santé
curl http://localhost:5001/your-project/us-central1/api/health

# Réponse attendue :
# {
#   "success": true,
#   "message": "API is running", 
#   "timestamp": "2024-01-15T10:30:00.000Z"
# }
```

### Test 2 : Authentification
1. Ouvrir http://localhost:3000
2. Aller sur la page **Register**
3. Créer un compte test
4. Vérifier la réception de l'email de confirmation

### Test 3 : Base de données
1. Créer un utilisateur
2. Créer un événement
3. Marquer une présence
4. Vérifier dans Firebase Console → Firestore

## 🎯 Données de test

### Script d'initialisation
```bash
# Créer des données de démonstration
npm run seed

# Cela créera :
# - 1 Super Admin (admin@test.com / password123)
# - 3 Organisateurs
# - 10 Participants  
# - 5 Événements exemple
# - Données de présence
```

### Comptes de test créés
| Email | Mot de passe | Rôle | Description |
|-------|--------------|------|-------------|
| admin@test.com | password123 | Super Admin | Accès complet |
| organizer@test.com | password123 | Organizer | Création événements |
| user@test.com | password123 | Participant | Marquage présences |

## 🔧 Configuration avancée

### Configuration SMS (optionnel)
```bash
# 1. Créer un compte Twilio
# 2. Récupérer Account SID et Auth Token
# 3. Acheter un numéro de téléphone
# 4. Mettre à jour .env avec les credentials

# Test SMS
curl -X POST http://localhost:5001/api/admin/sms-providers/test \
  -H "Content-Type: application/json" \
  -d '{"phone": "+33612345678", "message": "Test AttendanceX"}'
```

### Configuration Email (optionnel)
```bash
# 1. Créer un compte SendGrid
# 2. Générer une API Key
# 3. Configurer l'expéditeur vérifié
# 4. Mettre à jour .env

# Test Email
curl -X POST http://localhost:5001/api/notifications/test-email \
  -H "Content-Type: application/json" \
  -d '{"to": "test@example.com", "subject": "Test AttendanceX"}'
```

## 🚀 Déploiement en production

### Préparation
```bash
# Build des assets
npm run build

# Tests avant déploiement
npm run test
npm run lint
```

### Déploiement Firebase
```bash
# Déploiement complet
firebase deploy

# Ou par service
firebase deploy --only functions    # Backend
firebase deploy --only hosting     # Frontend
firebase deploy --only firestore   # Rules + indexes
```

### Vérification post-déploiement
```bash
# Tester l'API en production
curl https://your-project.web.app/api/health

# Tester l'interface
open https://your-project.web.app
```

## 🐛 Résolution de problèmes

### Problèmes courants

#### ❌ "Firebase project not found"
```bash
# Solution : Vérifier le project ID
firebase projects:list
firebase use your-project-id
```

#### ❌ "Permission denied" sur Firestore
```bash
# Solution : Déployer les règles
firebase deploy --only firestore:rules
```

#### ❌ "Module not found"
```bash
# Solution : Réinstaller les dépendances
rm -rf node_modules package-lock.json
npm install
```

#### ❌ "Port already in use"
```bash
# Solution : Changer les ports
# Émulateurs : firebase.json
# Frontend : vite.config.ts (port: 3001)
# Backend : package.json scripts
```

### Logs et debugging

#### Logs Firebase Functions
```bash
# Voir les logs en temps réel
firebase functions:log

# Logs spécifiques
firebase functions:log --only api
```

#### Debug frontend
```bash
# Mode debug avec source maps
npm run dev -- --debug

# Ouvrir les DevTools et vérifier :
# - Console pour erreurs JavaScript
# - Network pour requêtes API
# - Application pour localStorage/cookies
```

## 📊 Monitoring et métriques

### Dashboard Firebase
1. Firebase Console → **Analytics**
2. Vérifier les métriques :
   - Utilisateurs actifs
   - Événements créés  
   - Présences marquées
   - Erreurs API

### Métriques personnalisées
```typescript
// Dans votre code, tracker des événements
analytics.logEvent('attendance_marked', {
  method: 'qr_code',
  event_id: eventId,
  user_role: userRole
});
```

## ✅ Checklist de validation

### 🎯 **Installation réussie si :**
- [ ] Backend répond sur http://localhost:5001
- [ ] Frontend accessible sur http://localhost:3000  
- [ ] Authentification fonctionne (register/login)
- [ ] Base de données Firestore opérationnelle
- [ ] Création d'événement possible
- [ ] Marquage de présence fonctionnel
- [ ] Notifications email envoyées
- [ ] SMS envoyés (si configuré)

### 🚀 **Prêt pour la production si :**
- [ ] Tests passent tous ✅
- [ ] Variables d'environnement production configurées
- [ ] Déploiement Firebase réussi
- [ ] HTTPS activé avec certificat valide
- [ ] Domaine personnalisé configuré (optionnel)
- [ ] Monitoring opérationnel
- [ ] Sauvegardes configurées

## 🎉 Prochaines étapes

Une fois l'installation terminée :

1. **👥 Créer vos premiers utilisateurs** avec leurs rôles
2. **📅 Organiser votre premier événement** de test
3. **✅ Tester le marquage de présences** avec différentes méthodes
4. **📊 Explorer les rapports et analytics**
5. **🔧 Personnaliser les templates** de notifications
6. **📱 Configurer les providers SMS** pour votre région

## 💬 Support

### 🆘 **Besoin d'aide ?**
- 📚 [Documentation complète](../docs/)
- 🐛 [Issues GitHub](https://github.com/votre-username/attendance-management-system/issues)
- 💬 [Discord communauté](https://discord.gg/attendance-system)
- 📧 [Support email](mailto:support@attendancex.com)

### 🤝 **Contribuer**
- 🍴 Fork le projet
- 🌟 Créer une feature branch
- 📝 Ajouter des tests
- 🚀 Soumettre une Pull Request

---

**🎊 Félicitations ! AttendanceX est maintenant opérationnel !**

➡️ **Prochaine lecture recommandée** : [Architecture Technique](ARCHITECTURE.md)