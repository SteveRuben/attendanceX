# 📚 Guide Swagger/OpenAPI - Attendance Management System

## 🎯 Vue d'ensemble

Votre projet utilise **Swagger/OpenAPI 3.0** pour documenter automatiquement votre API REST. La documentation est interactive et permet de tester les endpoints directement depuis l'interface web.

## 🚀 Démarrage rapide

### 1. Lancer la documentation

```bash
# Démarrer le serveur avec la documentation
npm run docs:serve

# Ou juste générer les fichiers
npm run docs:generate

# Tester la configuration
npm run docs:test
```

### 2. Accéder à la documentation

- **Interface interactive** : http://localhost:5001/docs
- **Spécification JSON** : http://localhost:5001/swagger.json
- **Fichiers générés** : `backend/functions/docs/`

## 📝 Comment documenter vos endpoints

### Structure de base

```typescript
/**
 * @swagger
 * /endpoint:
 *   method:
 *     tags: [Category]
 *     summary: Description courte
 *     description: |
 *       Description détaillée avec markdown
 *       
 *       **Fonctionnalités:**
 *       - Point 1
 *       - Point 2
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: param
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SchemaName'
 *     responses:
 *       200:
 *         description: Succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
```

### Exemple complet

```typescript
/**
 * @swagger
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Récupérer un utilisateur
 *     description: |
 *       Récupère les détails d'un utilisateur par son ID.
 *       
 *       **Permissions:** `read:users` ou propriétaire
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de l'utilisateur
 *         schema:
 *           type: string
 *           example: "user_123"
 *     responses:
 *       200:
 *         description: Utilisateur trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
```

## 🔧 Configuration avancée

### 1. Ajouter de nouveaux schémas

Modifiez `src/config/swagger.ts` :

```typescript
components: {
  schemas: {
    // Nouveau schéma
    MyNewSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' }
      },
      required: ['id', 'name']
    }
  }
}
```

### 2. Personnaliser l'interface

Modifiez `src/config/swagger-ui-config.ts` :

```typescript
customCss: `
  /* Vos styles CSS personnalisés */
  .swagger-ui .topbar {
    background-color: #your-color;
  }
`
```

### 3. Ajouter de nouveaux tags

```typescript
tags: [
  {
    name: 'NewCategory',
    description: 'Description de la nouvelle catégorie'
  }
]
```

## 🛠️ Bonnes pratiques

### 1. Documentation des endpoints

- ✅ **Utilisez des descriptions claires** avec markdown
- ✅ **Documentez tous les paramètres** (query, path, body)
- ✅ **Incluez des exemples** pour les requêtes et réponses
- ✅ **Spécifiez les codes d'erreur** possibles
- ✅ **Groupez par tags** logiques

### 2. Schémas réutilisables

- ✅ **Créez des schémas** pour les objets complexes
- ✅ **Utilisez $ref** pour éviter la duplication
- ✅ **Documentez les propriétés** avec des descriptions
- ✅ **Spécifiez les contraintes** (required, format, etc.)

### 3. Sécurité

- ✅ **Documentez l'authentification** requise
- ✅ **Spécifiez les permissions** nécessaires
- ✅ **Protégez la documentation** en production si nécessaire

## 📊 Outils et commandes

### Scripts disponibles

```bash
# Générer la documentation
npm run docs:generate

# Servir avec la documentation
npm run docs:serve

# Tester la configuration
npm run docs:test

# Build avec documentation
npm run docs:build
```

### Fichiers générés

```
backend/functions/docs/
├── swagger.json      # Spécification JSON
├── swagger.yaml      # Spécification YAML
└── README.md         # Documentation générée
```

## 🔍 Validation et tests

### 1. Valider la spécification

```bash
# Tester la configuration
npm run docs:test

# Vérifier la syntaxe
npx swagger-jsdoc -d src/config/swagger.ts src/routes/*.ts
```

### 2. Tester les endpoints

1. Ouvrez http://localhost:5001/docs
2. Cliquez sur "Authorize" et entrez votre token JWT
3. Testez les endpoints directement dans l'interface

## 🚨 Dépannage

### Problèmes courants

1. **Documentation vide** :
   - Vérifiez les chemins dans `swagger.ts` (apis)
   - Assurez-vous que les commentaires `@swagger` sont corrects

2. **Erreurs de syntaxe** :
   - Validez votre YAML avec un validateur en ligne
   - Vérifiez l'indentation des commentaires

3. **Schémas non trouvés** :
   - Vérifiez les références `$ref`
   - Assurez-vous que les schémas sont définis

### Debug

```bash
# Activer les logs détaillés
DEBUG=swagger-jsdoc npm run docs:generate

# Vérifier la spécification générée
cat backend/functions/docs/swagger.json | jq .
```

## 🌟 Alternatives et extensions

### Alternatives à Swagger UI

1. **Redoc** : Interface plus moderne
2. **Insomnia** : Client API avec import OpenAPI
3. **Postman** : Collection générée depuis OpenAPI

### Extensions utiles

1. **swagger-stats** : Métriques d'utilisation de l'API
2. **swagger-parser** : Validation avancée des specs
3. **openapi-generator** : Génération de clients SDK

## 📞 Support

- **Documentation officielle** : https://swagger.io/docs/
- **OpenAPI Specification** : https://spec.openapis.org/oas/v3.0.3/
- **Swagger JSDoc** : https://github.com/Surnet/swagger-jsdoc

---

*Guide créé pour le projet Attendance Management System*