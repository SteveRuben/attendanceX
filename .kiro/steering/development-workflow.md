---
inclusion: always
---

# Workflow de Développement AttendanceX

Ce document décrit le processus de développement, les commandes essentielles et les bonnes pratiques pour travailler efficacement sur le projet.

## Configuration de l'Environnement

### Prérequis
- Node.js 18+ et npm 8+
- Firebase CLI : `npm install -g firebase-tools`
- Git configuré avec votre identité

### Installation Initiale
```bash
# Cloner le repository
git clone <repository-url>
cd attendance-management-system

# Installer toutes les dépendances
npm run install:all

# Configuration Firebase (une seule fois)
firebase login
firebase use --add  # Sélectionner le projet Firebase
```

## Commandes de Développement

### Démarrage Rapide
```bash
# Démarrer backend + frontend en parallèle
npm run dev

# Ou séparément :
npm run dev:backend    # Émulateurs Firebase sur port 5001
npm run dev:frontend   # Next.js sur port 3000
```

### Build et Tests
```bash
# Build complet
npm run build

# Tests backend complets
npm run test:backend

# Tests avec surveillance des changements
npm run test:backend:watch

# Tests avec coverage
npm run test:backend:coverage

# Tests d'intégration spécifiques
npm run test:backend:integration
```

### Linting et Qualité
```bash
# Linting complet
npm run lint

# Nettoyage des builds
npm run clean

# Validation des tests backend
npm run test:backend:validate
```

## Workflow Git

### Branches
1. **Créer une branche** depuis `main` :
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/nom-fonctionnalite
   ```

2. **Développer** avec commits fréquents :
   ```bash
   git add .
   git commit -m "feat: ajout de la validation des emails"
   ```

3. **Pousser et créer une PR** :
   ```bash
   git push origin feature/nom-fonctionnalite
   # Créer la Pull Request sur GitHub
   ```

### Messages de Commit
Utiliser Conventional Commits :
- `feat:` - Nouvelle fonctionnalité
- `fix:` - Correction de bug
- `docs:` - Documentation
- `style:` - Formatage, pas de changement de code
- `refactor:` - Refactoring sans changement de fonctionnalité
- `test:` - Ajout ou modification de tests
- `chore:` - Maintenance, configuration

## Développement Backend

### Structure des Fichiers
Lors de l'ajout d'une nouvelle fonctionnalité :

1. **Route** (`routes/`) - Définir les endpoints
2. **Controller** (`controllers/`) - Logique de routage
3. **Service** (`services/`) - Logique métier
4. **Model** (`models/`) - Validation des données
5. **Types** (`types/`) - Interfaces TypeScript
6. **Tests** (`tests/backend/`) - Tests unitaires et d'intégration

### Exemple de Création d'Endpoint
```typescript
// 1. Route (routes/users.routes.ts)
router.post('/users', authMiddleware, createUserController);

// 2. Controller (controllers/user.controller.ts)
export const createUserController = async (req: Request, res: Response) => {
  try {
    const userData = req.body;
    const user = await userService.createUser(userData);
    res.json({ success: true, data: user });
  } catch (error) {
    handleError(error, res);
  }
};

// 3. Service (services/user.service.ts)
export const createUser = async (userData: CreateUserRequest): Promise<User> => {
  // Validation
  const validatedData = validateCreateUser(userData);
  
  // Logique métier
  const user = await userModel.create(validatedData);
  
  return user;
};
```

### Tests Backend
```typescript
// tests/backend/unit/services/user.service.test.ts
describe('UserService', () => {
  describe('createUser', () => {
    it('should create user with valid data', async () => {
      const userData = { email: 'test@example.com', name: 'Test User' };
      const result = await userService.createUser(userData);
      
      expect(result).toBeDefined();
      expect(result.email).toBe(userData.email);
    });
  });
});
```

## Développement Frontend

### Structure des Composants
```
components/
├── ui/              # Composants de base (Button, Input, etc.)
├── forms/           # Formulaires spécifiques
├── layout/          # Layout et navigation
└── feature/         # Composants métier
```

### Hooks Personnalisés
Créer des hooks pour la logique réutilisable :
```typescript
// hooks/useUsers.ts
export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await usersService.getUsers();
      setUsers(data);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  return { users, loading, fetchUsers };
};
```

### Services API
Utiliser les services pour les appels API :
```typescript
// services/usersService.ts
export const usersService = {
  async getUsers(): Promise<User[]> {
    return apiClient.get('/api/users');
  },
  
  async createUser(userData: CreateUserRequest): Promise<User> {
    return apiClient.post('/api/users', userData);
  }
};
```

## Debugging

### Backend
```bash
# Logs des émulateurs Firebase
firebase emulators:start --debug

# Logs spécifiques aux fonctions
cd backend/functions && npm run logs
```

### Frontend
- Utiliser les DevTools React
- Console.log pour le debugging rapide
- React DevTools extension

### Base de Données
- Interface Firestore : http://localhost:4000/firestore
- Interface Auth : http://localhost:4000/auth

## Déploiement

### Environnements
- **Development** : Émulateurs locaux
- **Staging** : Firebase project staging
- **Production** : Firebase project production

### Commandes de Déploiement
```bash
# Déploiement complet
npm run deploy

# Déploiement backend uniquement
npm run deploy:functions

# Déploiement frontend uniquement
npm run deploy:hosting
```

### Vérifications Pré-Déploiement
1. Tests passent : `npm run test:ci`
2. Build réussit : `npm run build`
3. Linting OK : `npm run lint`
4. Pas de console.log en production

## Résolution de Problèmes

### Erreurs Communes

**Erreur de build backend :**
```bash
cd backend/functions
npm run clean
npm install
npm run build
```

**Erreur d'émulateurs :**
```bash
firebase emulators:kill
firebase emulators:start
```

**Erreur de dépendances :**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Logs et Debugging
- Logs backend : Vérifier la console des émulateurs
- Logs frontend : Vérifier la console du navigateur
- Erreurs réseau : Vérifier l'onglet Network des DevTools

## Performance et Optimisation

### Backend
- Utiliser la pagination pour les listes importantes
- Implémenter le cache pour les données fréquentes
- Optimiser les requêtes Firestore

### Frontend
- Lazy loading des composants lourds
- Debounce pour les recherches
- Optimisation des images avec Next.js Image

## Sécurité

### Développement Local
- Ne jamais commiter les clés API
- Utiliser les variables d'environnement
- Tester avec des données fictives

### Code Review
- Vérifier les permissions sur chaque endpoint
- Valider toutes les entrées utilisateur
- S'assurer de la gestion d'erreur appropriée

## Ressources Utiles

### Documentation
- [Firebase Docs](https://firebase.google.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [TypeScript Docs](https://www.typescriptlang.org/docs)

### Outils
- Firebase Console : https://console.firebase.google.com
- Émulateurs UI : http://localhost:4000
- Frontend Dev : http://localhost:3000