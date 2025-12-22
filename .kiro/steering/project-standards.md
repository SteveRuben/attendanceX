---
inclusion: always
---

# Standards et Conventions du Projet AttendanceX

Ce document définit les standards de développement, conventions de code et bonnes pratiques pour le projet AttendanceX.

## Architecture et Structure

### Structure des Dossiers
- `backend/functions/src/` - Code backend TypeScript
  - `controllers/` - Endpoints API (logique de routage)
  - `services/` - Logique métier
  - `models/` - Modèles de données et validation
  - `middleware/` - Middleware Express
  - `routes/` - Définition des routes
  - `utils/` - Utilitaires partagés
  - `types/` - Types TypeScript
- `docs` pour la documentation générale  
- `frontend-v2/src/` - Code frontend Next.js
  - `pages/` - Pages Next.js
  - `components/` - Composants React réutilisables
  - `services/` - Services API
  - `hooks/` - Hooks React personnalisés
  - `utils/` - Utilitaires frontend
  - `types/` - Types TypeScript

### Pattern MVC Backend
Respecter le flux : Route → Middleware → Controller → Service → Model → Database

## Conventions de Code

### Nommage
- **Variables/fonctions** : camelCase (`getUserById`, `eventData`)
- **Classes/Interfaces** : PascalCase (`UserService`, `EventModel`)
- **Constantes** : SCREAMING_SNAKE_CASE (`MAX_RETRY_COUNT`)
- **Fichiers** : kebab-case (`user-service.ts`, `event-controller.ts`)
- **Composants React** : PascalCase (`UserProfile.tsx`)

### TypeScript
- Utiliser TypeScript strict mode
- Définir des interfaces pour tous les objets de données
- Éviter `any`, utiliser des types spécifiques
- Documenter les fonctions publiques avec JSDoc

### Gestion des Erreurs
```typescript
// Backend - Utiliser les classes d'erreur personnalisées
throw new ValidationError('Email invalide');
throw new NotFoundError('Utilisateur non trouvé');

// Frontend - Gestion d'erreur avec try/catch
try {
  const result = await apiService.getUser(id);
} catch (error) {
  handleApiError(error);
}
```

### Validation des Données
- Backend : Utiliser les validators dans `common/validators/`
- Frontend : Validation côté client + validation serveur
- Toujours valider les entrées utilisateur

## Standards API

### Routes RESTful
```
GET    /api/users           - Liste des utilisateurs
GET    /api/users/:id       - Utilisateur spécifique
POST   /api/users           - Créer un utilisateur
PUT    /api/users/:id       - Mettre à jour un utilisateur
DELETE /api/users/:id       - Supprimer un utilisateur
```

### Réponses API
```typescript
// Succès
{
  success: true,
  data: { ... },
  message?: string
}

// Erreur
{
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Description de l\'erreur',
    details?: { ... }
  }
}
```

### Authentification
- Utiliser JWT native
- Middleware `auth.ts` pour vérifier les tokens
- Middleware `roles.ts` pour les permissions

## Tests

### Structure des Tests
- Tests unitaires : `tests/backend/unit/`
- Tests d'intégration : `tests/backend/integration/`
- Tests E2E : `tests/e2e/`

### Conventions de Test
```typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a user with valid data', async () => {
      // Arrange
      const userData = { email: 'test@example.com' };
      
      // Act
      const result = await userService.createUser(userData);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.email).toBe(userData.email);
    });
  });
});
```

### Scripts de Test
- `npm run test:backend` - Tests backend
- `npm run test:frontend` - Tests frontend
- `npm run test:e2e` - Tests end-to-end
- `npm run test:coverage` - Coverage des tests

## Sécurité

### Permissions
- Utiliser le système de rôles : `owner`, `admin`, `organizer`, `participant`, `contributor`
- Vérifier les permissions à chaque endpoint sensible
- Utiliser `hasPermission()`  helper

### Validation des Entrées
- Toujours valider et sanitiser les entrées utilisateur
- Utiliser les validators Joi/Zod pour la validation
- Échapper les données avant insertion en base

### Middleware de Sécurité
- Rate limiting avec `rateLimit.ts`
- Validation des tokens avec `auth.ts`
- Validation du contexte tenant avec `tenant-context.middleware.ts`

## Performance

### Backend
- Utiliser la pagination pour les listes
- Implémenter le cache Redis pour les données fréquentes
- Optimiser les requêtes Firestore (éviter les N+1)

### Frontend
- Lazy loading des composants avec `React.lazy()`
- Optimisation des images avec Next.js Image
- Debounce pour les recherches et API calls

## Git et Déploiement

### Commits
Utiliser Conventional Commits :
```
feat: ajout de la fonctionnalité X
fix: correction du bug Y
docs: mise à jour de la documentation
refactor: refactoring du service Z
test: ajout des tests pour X
```

### Branches
- `main` - Production
- `develop` - Développement
- `feature/nom-fonctionnalite` - Nouvelles fonctionnalités
- `fix/nom-bug` - Corrections de bugs

### Déploiement
- Tests automatiques sur chaque PR
- Déploiement automatique sur merge vers main
- Environnements : dev, staging, production

## Documentation

### Code
- Documenter les fonctions publiques avec JSDoc
- Commenter la logique complexe
- Maintenir les README à jour

### API
- Documenter tous les endpoints
- Inclure des exemples de requêtes/réponses
- Maintenir la documentation OpenAPI/Swagger

## Outils de Développement

### Linting et Formatage
- ESLint pour le linting
- Prettier pour le formatage automatique
- Husky pour les pre-commit hooks

### IDE
- Configuration VSCode recommandée
- Extensions TypeScript, ESLint, Prettier
- Snippets personnalisés pour le projet

## Monitoring et Logs

### Logs
```typescript
// Utiliser le logger configuré
logger.info('Utilisateur créé', { userId, email });
logger.error('Erreur lors de la création', { error, context });
```

### Métriques
- Firebase Analytics pour l'usage
- Error Reporting pour les erreurs
- Performance Monitoring pour les performances