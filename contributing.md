# Contributing Guide

Guide de contribution au projet.

## Workflow de développement

### 1. Créer une branche
```bash
# Créer une branche feature
git checkout -b feature/nom-de-la-feature

# Créer une branche bugfix
git checkout -b bugfix/description-du-bug
```

### 2. Développement
- Écrire le code en suivant les standards
- Ajouter des tests pour les nouvelles fonctionnalités
- Mettre à jour la documentation si nécessaire

### 3. Tests et validation
```bash
# Exécuter tous les tests
npm test

# Vérifier le linting
npm run lint

# Vérifier le build
npm run build
```

### 4. Commit et push
```bash
# Commit avec message conventionnel
git commit -m "feat: ajouter authentification OAuth"

# Push de la branche
git push origin feature/nom-de-la-feature
```

### 5. Pull Request
- Créer une PR sur GitHub
- Remplir le template de PR
- Assigner des reviewers
- Attendre l'approbation

## Standards de code

### Conventions de nommage
- **Variables** : camelCase
- **Fonctions** : camelCase
- **Classes** : PascalCase
- **Constantes** : UPPER_SNAKE_CASE
- **Fichiers** : kebab-case

### Structure des fichiers
```typescript
// Imports externes
import React from 'react';
import { Router } from 'express';

// Imports internes
import { AuthService } from '../services/auth.service';
import { validateRequest } from '../utils/validation';

// Types et interfaces
interface UserData {
  id: string;
  email: string;
}

// Constantes
const DEFAULT_TIMEOUT = 5000;

// Implémentation
export class UserController {
  // ...
}
```

### Documentation du code
```typescript
/**
 * Authentifie un utilisateur avec email et mot de passe
 * @param email - Email de l'utilisateur
 * @param password - Mot de passe en clair
 * @returns Promise<AuthResult> - Résultat de l'authentification
 * @throws {AuthError} - Si les identifiants sont invalides
 */
async function authenticateUser(email: string, password: string): Promise<AuthResult> {
  // Implementation
}
```

## Messages de commit

### Format Conventional Commits
```
type(scope): description

[body optionnel]

[footer optionnel]
```

### Types autorisés
- **feat** : Nouvelle fonctionnalité
- **fix** : Correction de bug
- **docs** : Documentation uniquement
- **style** : Formatage, point-virgules manquants, etc.
- **refactor** : Refactoring sans changement fonctionnel
- **test** : Ajout ou modification de tests
- **chore** : Maintenance, configuration, etc.

### Exemples
```bash
feat(auth): ajouter authentification OAuth Google
fix(presence): corriger calcul des heures travaillées
docs(api): mettre à jour documentation des endpoints
refactor(services): réorganiser les services par domaine
```

## Tests

### Couverture requise
- **Nouvelles fonctionnalités** : 100% de couverture
- **Corrections de bugs** : Tests de régression obligatoires
- **Refactoring** : Maintenir la couverture existante

### Types de tests à écrire
```typescript
// Test unitaire
describe('AuthService', () => {
  it('should validate correct credentials', () => {
    // Test implementation
  });
});

// Test d'intégration
describe('Auth API', () => {
  it('should return JWT token on successful login', async () => {
    // Test implementation
  });
});
```

## Review Process

### Critères de review
- **Fonctionnalité** : Le code fait-il ce qu'il est censé faire ?
- **Tests** : Y a-t-il des tests appropriés ?
- **Performance** : Y a-t-il des problèmes de performance ?
- **Sécurité** : Y a-t-il des vulnérabilités ?
- **Maintenabilité** : Le code est-il lisible et maintenable ?

### Checklist du reviewer
- [ ] Le code compile sans erreur
- [ ] Tous les tests passent
- [ ] La couverture de test est suffisante
- [ ] Le code suit les standards du projet
- [ ] La documentation est à jour
- [ ] Pas de secrets ou données sensibles dans le code

## Déploiement

### Environnements
1. **Development** : Déploiement automatique sur push
2. **Staging** : Déploiement automatique sur merge vers `develop`
3. **Production** : Déploiement manuel après approbation

### Process de release
1. Créer une branche `release/vX.Y.Z`
2. Finaliser les tests et la documentation
3. Merger vers `main`
4. Créer un tag de version
5. Déployer en production

## Ressources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [Conventional Commits](https://www.conventionalcommits.org/)