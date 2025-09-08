# Authentication

Documentation du système d'authentification.

## Vue d'ensemble

Le système utilise JWT (JSON Web Tokens) pour l'authentification des utilisateurs.

## Flow d'authentification

1. L'utilisateur envoie ses identifiants
2. Le serveur valide les identifiants
3. Un JWT est généré et retourné
4. Le client inclut le JWT dans les requêtes suivantes

## Headers requis

```
Authorization: Bearer <jwt_token>
```

## Gestion des tokens

- **Durée de vie** : 24 heures
- **Refresh** : Possible via l'endpoint `/auth/refresh`
- **Révocation** : Automatique à la déconnexion

## Sécurité

- Les tokens sont signés avec une clé secrète
- Les mots de passe sont hashés avec bcrypt
- Protection contre les attaques par force brute