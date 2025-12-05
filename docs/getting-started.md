# Guide de démarrage

Ce guide vous aidera à installer et configurer AttendanceX sur votre machine locale.

## Prérequis

- **Node.js 20** (version exacte requise par le projet)
- npm 9 ou supérieur
- Git
- Compte Firebase (gratuit)

Vérifier les versions installées :
```bash
node --version    # doit être 20.x.x
npm --version     # >= 9.0.0
git --version     # >= 2.30.0
```

**Important** : Le projet nécessite Node.js version 20. Si vous avez une autre version, installez Node 20 avec [nvm](https://github.com/nvm-sh/nvm) :
```bash
nvm install 20
nvm use 20
```

## Installation

### 1. Cloner le repository

```bash
git clone https://github.com/votre-username/attendance-management-system.git
cd attendance-management-system
```

### 2. Installer les dépendances

```bash
# Installer toutes les dépendances
npm install

# Ou installer séparément
cd backend/functions && npm install
cd ../../frontend && npm install
```

### 3. Configuration Firebase

#### Créer un projet Firebase

1. Aller sur [Firebase Console](https://console.firebase.google.com/)
2. Cliquer sur "Créer un projet"
3. Suivre les étapes de création

#### Installer Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

#### Initialiser Firebase

```bash
firebase init

# Sélectionner les services :
# ✓ Firestore
# ✓ Functions
# ✓ Hosting
# ✓ Storage
# ✓ Authentication
```

#### Activer les services

Dans Firebase Console :
1. **Authentication** → Sign-in method → Activer Email/Password
2. **Firestore Database** → Créer une base de données (mode test)
3. **Storage** → Démarrer

### 4. Variables d'environnement

Créer un fichier `.env` dans le dossier `backend/functions` :

```bash
# Project Configuration
PROJECT_ID=your-project-id
APP_ENV=development
API_VERSION=1.0.0
FRONTEND_URL=http://localhost:3000
FRONTEND_URL_PROD=https://your-app.web.app
ADDITIONAL_ORIGINS=https://custom-domain.com

# Firebase Configuration
FUNCTIONS_EMULATOR=true
FIRESTORE_EMULATOR_HOST=localhost:8080

# Email Configuration
DEFAULT_EMAIL_PROVIDER=smtp
SMTP_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=AttendanceX

# SendGrid Configuration (production)
SENDGRID_ENABLED=false
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=AttendanceX

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-min-32-chars
JWT_EXPIRES_IN=5h
REFRESH_TOKEN_EXPIRY=7d
BCRYPT_ROUNDS=12

# Security Configuration
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SYMBOLS=true
PASSWORD_MAX_AGE_DAYS=180
ENABLE_2FA=true
ACCOUNT_LOCKOUT_MINUTES=30
MAX_LOGIN_ATTEMPTS=5
SESSION_TIMEOUT_MINUTES=30

# Pagination
DEFAULT_PAGE_SIZE=15
MAX_PAGE_SIZE=100

# API Configuration
API_TIMEOUT_SECONDS=30

# Stripe Configuration (pour la facturation)
STRIPE_SECRET_KEY=sk_test_your_stripe_key
```

**Notes importantes :**

1. **Firebase** : Les clés Firebase sont automatiquement gérées par Firebase Admin SDK en production. En développement, les émulateurs sont utilisés.

2. **SMTP Gmail** : Pour utiliser Gmail, vous devez générer un "App Password" :
   - Aller dans votre compte Google → Sécurité
   - Activer la validation en 2 étapes
   - Générer un mot de passe d'application
   - Utiliser ce mot de passe dans `SMTP_PASSWORD`

3. **JWT Secrets** : Générer des clés sécurisées avec :
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Stripe** : Créer un compte sur [Stripe](https://stripe.com) et récupérer la clé de test dans le dashboard

### 5. Démarrer l'application

#### Option 1 : Démarrage rapide (recommandé)

Depuis le dossier `backend/functions` :
```bash
cd backend/functions
npm run dev
```

Cette commande :
- Compile le TypeScript
- Démarre les émulateurs Firebase (Functions, Firestore, Storage)
- Active le hot-reload

#### Option 2 : Démarrage avec build manuel

```bash
cd backend/functions
npm run build
npm run serve
```

#### Les émulateurs démarrent sur :
- **Functions** : http://localhost:5001
- **Firestore** : http://localhost:8080
- **Storage** : http://localhost:9199
- **Auth** : http://localhost:9099
- **Emulator UI** : http://localhost:4000

#### Démarrer le frontend (dans un autre terminal)

```bash
cd frontend
npm run dev
```

L'application frontend est accessible sur http://localhost:3000

#### Mode développement avec watch

Pour recompiler automatiquement à chaque modification :
```bash
cd backend/functions
npm run build:watch
```

## Vérification de l'installation

### Tester l'API

```bash
# Tester l'endpoint de santé
curl http://localhost:5001/your-project-id/us-central1/api/health
```

Réponse attendue :
```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "2024-12-05T10:30:00.000Z"
}
```

### Accéder à la documentation API (Swagger)

La documentation interactive de l'API est disponible sur :
```
http://localhost:5001/your-project-id/us-central1/api/docs
```

Pour générer/mettre à jour la documentation :
```bash
cd backend/functions
npm run docs:generate
```

Pour démarrer avec la documentation :
```bash
npm run docs:serve
```

### Créer un compte test

1. Ouvrir http://localhost:3000
2. Aller sur la page Register
3. Créer un compte avec email et mot de passe
4. Se connecter

### Accéder à l'interface des émulateurs

Ouvrir http://localhost:4000 pour :
- Voir les données Firestore
- Gérer les utilisateurs Auth
- Consulter les fichiers Storage
- Voir les logs des Functions

## Données de test

Pour créer des données de démonstration :

```bash
npm run seed
```

Cela créera :
- 1 Super Admin (admin@test.com / password123)
- 3 Organisateurs
- 10 Participants
- 5 Événements exemple

## Configuration avancée

### Configuration Email

**Option 1 : SMTP (Gmail) - Recommandé pour le développement**

1. Utiliser votre compte Gmail
2. Activer la validation en 2 étapes
3. Générer un mot de passe d'application
4. Configurer dans `.env` :
   ```bash
   SMTP_ENABLED=true
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   ```

**Option 2 : SendGrid - Recommandé pour la production**

1. Créer un compte [SendGrid](https://sendgrid.com/)
2. Générer une API Key
3. Vérifier l'expéditeur
4. Configurer dans `.env` :
   ```bash
   DEFAULT_EMAIL_PROVIDER=sendgrid
   SENDGRID_ENABLED=true
   SENDGRID_API_KEY=your-api-key
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   ```

### Configuration SMS (optionnel)

Le système supporte plusieurs providers SMS avec failover automatique :

**Twilio (Recommandé)**
1. Créer un compte [Twilio](https://www.twilio.com/)
2. Récupérer Account SID et Auth Token
3. Acheter un numéro de téléphone
4. Configurer via l'interface admin ou l'API

**Vonage (Nexmo)**
1. Créer un compte [Vonage](https://www.vonage.com/)
2. Récupérer API Key et Secret
3. Configurer via l'interface admin

**AWS SNS**
1. Créer un compte AWS
2. Configurer SNS et récupérer les credentials
3. Configurer via l'interface admin

Tester l'envoi de SMS :
```bash
curl -X POST http://localhost:5001/api/admin/sms-providers/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"phone": "+33612345678", "message": "Test AttendanceX"}'
```

## Scripts disponibles

### Backend (dans `backend/functions`)

```bash
# Développement
npm run dev              # Démarre les émulateurs avec hot-reload
npm run build            # Compile TypeScript vers JavaScript
npm run build:watch      # Compile en mode watch (auto-recompilation)
npm run serve            # Build + démarre les émulateurs

# Qualité du code
npm run lint             # Vérifie le code avec ESLint
npm run lint:fix         # Corrige automatiquement les erreurs ESLint

# Documentation
npm run docs:generate    # Génère la documentation Swagger
npm run docs:serve       # Build + génère docs + démarre émulateurs
npm run docs:build       # Build + génère documentation
npm run docs:test        # Teste la documentation Swagger

# Production
npm run deploy           # Déploie les functions sur Firebase
npm run logs             # Affiche les logs des functions en production

# Autres
npm run shell            # Ouvre le shell Firebase Functions
npm run start            # Alias pour shell
```

### Frontend (dans `frontend`)

```bash
npm run dev              # Démarre le serveur de développement Vite
npm run build            # Build pour la production
npm run preview          # Prévisualise le build de production
```

## Déploiement en production

### 1. Build du projet

```bash
# Backend
cd backend/functions
npm run build

# Frontend
cd ../../frontend
npm run build
```

### 2. Déployer sur Firebase

```bash
# Déploiement complet (depuis la racine)
firebase deploy

# Ou par service
firebase deploy --only functions    # Backend uniquement
firebase deploy --only hosting      # Frontend uniquement
firebase deploy --only firestore    # Rules + indexes uniquement
firebase deploy --only storage      # Storage rules uniquement
```

### 3. Vérifier le déploiement

```bash
# Tester l'API en production
curl https://your-project-id.web.app/api/health

# Ouvrir l'interface
open https://your-project-id.web.app
```

### 4. Consulter les logs de production

```bash
cd backend/functions
npm run logs

# Ou avec Firebase CLI
firebase functions:log --only api
```

## Résolution de problèmes

### ❌ "Firebase project not found"

```bash
# Lister les projets disponibles
firebase projects:list

# Sélectionner le bon projet
firebase use your-project-id
```

### ❌ "Permission denied" sur Firestore

```bash
# Déployer les règles de sécurité
firebase deploy --only firestore:rules
```

### ❌ "Module not found" ou erreurs de dépendances

```bash
# Backend
cd backend/functions
rm -rf node_modules package-lock.json
npm install

# Frontend
cd ../../frontend
rm -rf node_modules package-lock.json
npm install
```

### ❌ "Port already in use"

Modifier les ports dans `firebase.json` :
```json
{
  "emulators": {
    "functions": {
      "port": 5001
    },
    "firestore": {
      "port": 8080
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

### ❌ Erreurs de compilation TypeScript

```bash
cd backend/functions

# Vérifier la version de Node.js (doit être 20)
node --version

# Nettoyer et recompiler
rm -rf lib
npm run build
```

### ❌ "Cannot read properties of undefined (reading 'QR_CODE')"

Ce problème survient si le tsconfig.json n'est pas correctement configuré. Vérifier que :
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node"
  }
}
```

### ❌ Problèmes avec les émulateurs

```bash
# Arrêter tous les processus Firebase
pkill -f firebase

# Nettoyer les données des émulateurs
firebase emulators:export ./emulator-data
firebase emulators:start --import=./emulator-data

# Ou redémarrer proprement
cd backend/functions
npm run dev
```

### 📝 Logs et debugging

```bash
# Voir les logs des émulateurs en temps réel
cd backend/functions
npm run dev

# Dans un autre terminal, consulter les logs
firebase functions:log

# Logs spécifiques à une fonction
firebase functions:log --only api
```

### Configuration Stripe (pour la facturation)

Pour activer la facturation automatisée :

1. **Créer un compte Stripe**
   - Aller sur [Stripe](https://stripe.com)
   - Créer un compte et compléter le profil

2. **Récupérer les clés API**
   - Dashboard Stripe → Développeurs → Clés API
   - Copier la clé secrète de test : `sk_test_...`
   - En production, utiliser la clé live : `sk_live_...`

3. **Configurer dans `.env`**
   ```bash
   STRIPE_SECRET_KEY=sk_test_your_stripe_key
   ```

4. **Configurer les webhooks (production)**
   - Dashboard Stripe → Développeurs → Webhooks
   - Ajouter un endpoint : `https://your-domain.com/api/webhooks/stripe`
   - Sélectionner les événements : `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`

5. **Tester la facturation**
   - Utiliser les cartes de test Stripe
   - Carte de test : `4242 4242 4242 4242`
   - Date d'expiration : n'importe quelle date future
   - CVC : n'importe quel 3 chiffres

## Prochaines étapes

Une fois l'installation terminée :

1. **Créer votre organisation**
   - Compléter le wizard d'onboarding
   - Configurer le branding (logo, couleurs)
   - Choisir votre plan d'abonnement

2. **Inviter votre équipe**
   - Ajouter des membres avec leurs rôles
   - Configurer les permissions

3. **Créer votre premier événement**
   - Utiliser le wizard de création
   - Configurer les méthodes de présence
   - Générer le QR code

4. **Tester le marquage de présences**
   - Scanner le QR code
   - Tester la géolocalisation
   - Valider manuellement

5. **Explorer les fonctionnalités**
   - Consulter les rapports et analytics
   - Personnaliser les templates de notifications
   - Configurer les rappels automatiques
   - Générer des attestations de présence

## Support

- Documentation : [readme.md](./readme.md)
- Guide du projet : [project-overview.md](./project-overview.md)
- Issues GitHub : https://github.com/SteveRuben/attendance-management-system/issues
