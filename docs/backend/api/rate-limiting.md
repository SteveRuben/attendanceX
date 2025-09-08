# Rate Limiting

Documentation du système de limitation de débit.

## Vue d'ensemble

Le système implémente une limitation de débit pour protéger l'API contre les abus.

## Limites par défaut

- **Authentification** : 5 tentatives par minute
- **API générale** : 100 requêtes par minute
- **Upload de fichiers** : 10 requêtes par minute

## Headers de réponse

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Gestion des dépassements

- **Status Code** : 429 Too Many Requests
- **Retry-After** : Header indiquant quand réessayer
- **Backoff exponentiel** : Recommandé côté client

## Configuration

Les limites peuvent être configurées par organisation et par utilisateur.