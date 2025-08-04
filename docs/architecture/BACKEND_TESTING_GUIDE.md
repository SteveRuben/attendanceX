# 🚀 Guide de Démarrage Rapide - Tests Backend

Ce guide vous permet de lancer rapidement les tests backend pour AttendanceX.

## ⚡ Démarrage Ultra-Rapide

### **1. Installation et Configuration**

```bash
# Cloner le projet et installer les dépendances
git clone <repo-url>
cd attendance-management-system
npm install

# Configuration automatique (Linux/Mac)
./scripts/test-backend.sh setup

# Configuration automatique (Windows)
.\scripts\test-backend.ps1 setup
```

### **2. Lancer les Tests**

#### **Linux/Mac**
```bash
# Tests unitaires seulement (le plus rapide)
./scripts/test-backend.sh unit

# Tous les tests
./scripts/test-backend.sh all

# Tests avec couverture
./scripts/test-backend.sh coverage

# Mode développement (watch)
./scripts/test-backend.sh watch
```

#### **Windows**
```powershell
# Tests unitaires seulement (le plus rapide)
.\scripts\test-backend.ps1 unit

# Tous les tests
.\scripts\test-backend.ps1 all

# Tests avec couverture
.\scripts\test-backend.ps1 coverage

# Mode développement (watch)
.\scripts\test-backend.ps1 watch
```

## 📋 Commandes NPM Directes

Si vous préférez utiliser npm directement :

```bash
# Tests unitaires backend
npm run test:backend:unit

# Tests d'intégration backend
npm run test:backend:integration

# Tous les tests backend
npm run test:backend

# Tests avec couverture
npm run test:backend:coverage

# Mode watch (développement)
npm run test:backend:watch
```

## 🎯 Tests Spécifiques

### **Par Type de Composant**

```bash
# Tests des contrôleurs seulement
npm run test:backend:unit -- --testPathPattern=controllers

# Tests des services seulement
npm run test:backend:unit -- --testPathPattern=services

# Tests des middlewares seulement
npm run test:backend:unit -- --testPathPattern=middleware
```

### **Par Fichier Spécifique**

```bash
# Tests du contrôleur d'authentification
npm run test:backend -- --testPathPattern=auth.controller.test.ts

# Tests du service d'authentification
npm run test:backend -- --testPathPattern=auth.service.test.ts

# Tests du middleware d'authentification
npm run test:backend -- --testPathPattern=auth.test.ts
```

### **Par Nom de Test**

```bash
# Tests contenant "login" dans le nom
npm run test:backend -- --testNamePattern="login"

# Tests d'un describe spécifique
npm run test:backend -- --testNamePattern="AuthController"
```

## 🔧 Configuration Requise

### **Dépendances Minimales**

Assurez-vous d'avoir ces packages dans `backend/functions/package.json` :

```json
{
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/supertest": "^2.0.12",
    "jest": "^29.5.0",
    "supertest": "^6.3.3",
    "ts-jest": "^29.1.0"
  }
}
```

### **Variables d'Environnement**

Le fichier `.env.test` est automatiquement configuré avec :
- Configuration Firebase de test
- Secrets JWT pour les tests
- Configuration email de test

## 📊 Rapports de Tests

### **Couverture de Code**

```bash
# Générer le rapport de couverture
npm run test:backend:coverage

# Le rapport HTML sera dans : tests/reports/coverage/lcov-report/index.html
```

### **Rapports JUnit (CI/CD)**

```bash
# Générer des rapports compatibles CI/CD
npm run test:backend -- --reporters=jest-junit
```

## 🐛 Résolution Rapide des Problèmes

### **Erreur "Cannot find module"**
```bash
cd backend/functions && npm install
```

### **Tests qui traînent**
```bash
npm run test:backend -- --testTimeout=60000
```

### **Problèmes de permissions (Windows)**
```powershell
# Exécuter PowerShell en tant qu'administrateur
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### **Nettoyage complet**
```bash
# Linux/Mac
./scripts/test-backend.sh clean

# Windows
.\scripts\test-backend.ps1 clean

# Ou manuellement
rm -rf node_modules backend/functions/node_modules
npm install
cd backend/functions && npm install
```

## 📈 Métriques de Performance

### **Tests Rapides (< 30s)**
- Tests unitaires seulement
- Pas d'émulateurs Firebase
- Mocks complets

### **Tests Complets (1-3 min)**
- Tests unitaires + intégration
- Avec émulateurs Firebase
- Couverture de code

### **Objectifs de Couverture**
- **Lignes** : > 75%
- **Fonctions** : > 75%
- **Branches** : > 75%

## 🚨 Aide Rapide

### **Commandes d'Aide**
```bash
# Linux/Mac
./scripts/test-backend.sh help

# Windows
.\scripts\test-backend.ps1 help

# NPM
npm run test:backend -- --help
```

### **Support**
- Consultez `tests/backend/README.md` pour la documentation complète
- Vérifiez les logs dans `tests/reports/`
- Utilisez `--verbose` pour plus de détails

## 🎉 Workflow de Développement Recommandé

1. **Développement** : `npm run test:backend:watch`
2. **Avant commit** : `npm run test:backend:unit`
3. **Avant push** : `npm run test:backend:coverage`
4. **CI/CD** : `npm run test:backend` (automatique)

---

**🚀 Vous êtes prêt ! Lancez vos premiers tests avec une des commandes ci-dessus.**