# Documentation API - Attendance Management System

## 📚 Documentation générée automatiquement

Cette documentation a été générée le 11/09/2025 13:42:43.

## 🔗 Liens utiles

- **Documentation interactive**: [/docs](/docs) (Swagger UI)
- **Spécification JSON**: [swagger.json](./swagger.json)
- **Spécification YAML**: [swagger.yaml](./swagger.yaml)

## 📋 Informations sur l'API

- **Version**: 2.0.0
- **Description**: N/A
- **Serveurs**:
  - Serveur de développement local: http://localhost:5001/attendance-x/us-central1/api
  - Serveur de production: https://us-central1-attendance-x.cloudfunctions.net/api

## 🏷️ Tags disponibles

- **Authentication**: Endpoints d'authentification et gestion des sessions JWT
- **Users**: Gestion des utilisateurs et profils
- **Events**: Gestion des événements et planification
- **Attendances**: Gestion des présences et check-in
- **Notifications**: Système de notifications multi-canal
- **Reports**: Génération et gestion des rapports
- **ML/AI**: Intelligence artificielle et prédictions
- **System**: Endpoints système et monitoring

## 🔐 Authentification

Cette API utilise l'authentification JWT (JSON Web Tokens).

### Comment s'authentifier:

1. **Obtenir un token**: Utilisez l'endpoint `POST /auth/login`
2. **Utiliser le token**: Incluez le token dans l'header de vos requêtes:
   ```
   Authorization: Bearer <votre-token-jwt>
   ```

### Durée de vie des tokens:

- **Access Token**: 24 heures
- **Refresh Token**: 7 jours

## 📊 Codes de réponse

| Code | Description |
|------|-------------|
| 200  | Succès |
| 201  | Créé avec succès |
| 400  | Données invalides |
| 401  | Non authentifié |
| 403  | Permissions insuffisantes |
| 404  | Ressource non trouvée |
| 409  | Conflit (ex: email déjà utilisé) |
| 429  | Rate limiting dépassé |
| 500  | Erreur serveur |

## 🛠️ Développement

### Régénérer la documentation:

```bash
npm run docs:generate
```

### Servir la documentation localement:

```bash
npm run dev
# Puis aller sur http://localhost:5001/docs
```

## 📞 Support

- **Email**: support@attendance-x.com
- **Documentation**: https://attendance-x.com/docs
- **GitHub**: https://github.com/SteveRuben/attendanceX

---

*Documentation générée automatiquement par le script generate-swagger-docs.ts*
