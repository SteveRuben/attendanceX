# Troubleshooting

Guide de dépannage pour les problèmes courants.

## Problèmes courants

### Connexion Firestore
**Symptômes** : Timeouts, erreurs de connexion
**Solutions** :
- Vérifier la configuration réseau
- Redémarrer les émulateurs
- Vérifier les règles de sécurité
- Contrôler les quotas

### Authentification
**Symptômes** : Échecs de connexion, tokens invalides
**Solutions** :
- Vérifier la configuration Firebase Auth
- Contrôler la validité des tokens
- Vérifier les règles CORS
- Redémarrer les services

### Performance lente
**Symptômes** : Réponses lentes, timeouts
**Solutions** :
- Analyser les logs de performance
- Optimiser les requêtes Firestore
- Vérifier les index de base de données
- Augmenter les ressources des fonctions

## Logs et debugging

### Cloud Logging
```bash
# Filtrer les erreurs
gcloud logging read "severity>=ERROR"

# Logs d'une fonction spécifique
gcloud logging read "resource.labels.function_name=myFunction"
```

### Local debugging
```bash
# Démarrer les émulateurs avec logs détaillés
firebase emulators:start --debug

# Logs des fonctions
firebase functions:log
```

## Procédures d'urgence

### Service indisponible
1. Vérifier le statut des services Google Cloud
2. Contrôler les quotas et limites
3. Redéployer la dernière version stable
4. Activer le mode maintenance si nécessaire

### Perte de données
1. Arrêter les écritures
2. Identifier la cause
3. Restaurer depuis backup
4. Valider l'intégrité des données

### Sécurité compromise
1. Révoquer les tokens d'accès
2. Changer les clés API
3. Analyser les logs d'accès
4. Notifier les utilisateurs si nécessaire

## Contacts d'urgence

- **DevOps** : devops@company.com
- **Security** : security@company.com
- **Management** : management@company.com