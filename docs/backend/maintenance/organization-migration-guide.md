# Migration d'Organisation - Guide d'utilisation

Ce guide explique comment utiliser les outils de migration pour ajouter le contexte organisationnel aux utilisateurs existants.

## Vue d'ensemble

La migration d'organisation permet de :
- Créer automatiquement des organisations pour les utilisateurs existants qui n'en ont pas
- Assigner les utilisateurs comme propriétaires de leur organisation
- Configurer des paramètres par défaut basés sur le secteur d'activité
- Valider l'intégrité des données après migration
- Effectuer un rollback si nécessaire

## Prérequis

1. Accès aux Firebase Functions avec les droits d'administration
2. Node.js et npm installés
3. Variables d'environnement configurées
4. Sauvegarde de la base de données recommandée

## Utilisation via CLI

### 1. Vérifier le statut actuel

```bash
npm run migrate:organizations:status
```

Cette commande affiche :
- Nombre total d'utilisateurs et d'organisations
- Utilisateurs avec/sans organisation
- Progression de la migration
- Si une migration est nécessaire

### 2. Simulation de migration (recommandé)

```bash
npm run migrate:organizations:dry-run
```

Ou avec des options personnalisées :

```bash
npx ts-node src/scripts/run-migration.ts run --dry-run --batch-size=50 --sector=services --default-name="Mon Entreprise"
```

Options disponibles :
- `--dry-run` : Simule la migration sans l'exécuter
- `--batch-size <number>` : Nombre d'utilisateurs à traiter par batch (défaut: 100)
- `--default-name <string>` : Nom par défaut pour les organisations (défaut: "Mon Organisation")
- `--sector <sector>` : Secteur par défaut (services, retail, healthcare, beauty, education, consulting, association, other)

### 3. Exécution de la migration

⚠️ **ATTENTION** : Assurez-vous d'avoir une sauvegarde avant d'exécuter la migration réelle.

```bash
npm run migrate:organizations
```

Ou avec des options :

```bash
npx ts-node src/scripts/run-migration.ts run --batch-size=50 --sector=services
```

### 4. Validation post-migration

```bash
npm run migrate:organizations:validate
```

Cette commande vérifie :
- La validité des modèles utilisateur et organisation
- L'absence d'utilisateurs orphelins
- L'absence d'organisations orphelines
- La cohérence des compteurs de membres

### 5. Rollback (si nécessaire)

```bash
npm run migrate:organizations:rollback
```

⚠️ **ATTENTION** : Le rollback supprime les organisations créées lors de la migration et réinitialise les utilisateurs. À utiliser avec précaution.

## Utilisation via API REST

Les endpoints suivants sont disponibles pour les super administrateurs :

### POST /api/migration/organization/run

Exécute la migration d'organisation.

```json
{
  "dryRun": false,
  "batchSize": 100,
  "defaultOrganizationName": "Mon Organisation",
  "defaultSector": "other"
}
```

### GET /api/migration/organization/status

Retourne le statut de la migration.

### POST /api/migration/organization/validate

Valide l'intégrité des données après migration.

### POST /api/migration/organization/rollback

Effectue un rollback de la migration.

## Processus de migration détaillé

### 1. Analyse des utilisateurs existants

La migration commence par analyser tous les utilisateurs pour identifier :
- Ceux qui ont déjà une organisation assignée
- Ceux qui n'ont pas d'organisation

### 2. Création d'organisations par défaut

Pour chaque utilisateur sans organisation :
1. Génération d'un nom d'organisation basé sur les informations utilisateur
2. Création d'une organisation avec des paramètres par défaut
3. Assignment de l'utilisateur comme propriétaire
4. Configuration des fonctionnalités selon le secteur

### 3. Mise à jour des utilisateurs

Chaque utilisateur migré reçoit :
- `organizationId` : ID de l'organisation créée
- `isOrganizationAdmin` : true
- `organizationRole` : "owner"
- `joinedOrganizationAt` : Date de migration

### 4. Validation

Vérification de l'intégrité :
- Tous les utilisateurs ont une organisation
- Toutes les organisations ont au moins un membre
- Les modèles de données sont valides

## Gestion des erreurs

### Erreurs courantes

1. **Utilisateur sans ID** : Ignoré avec log d'erreur
2. **Échec de création d'organisation** : Utilisateur non migré, erreur loggée
3. **Échec de mise à jour utilisateur** : Organisation créée mais utilisateur non assigné

### Récupération d'erreurs

- Les erreurs sont collectées et rapportées à la fin
- La migration continue même en cas d'erreurs individuelles
- Les statistiques finales incluent le nombre d'erreurs

## Bonnes pratiques

### Avant la migration

1. **Sauvegarde** : Créer une sauvegarde complète de Firestore
2. **Test** : Exécuter d'abord en mode `--dry-run`
3. **Maintenance** : Planifier une fenêtre de maintenance
4. **Communication** : Informer les utilisateurs de la maintenance

### Pendant la migration

1. **Monitoring** : Surveiller les logs et métriques
2. **Performance** : Ajuster la taille des batches si nécessaire
3. **Arrêt d'urgence** : Préparer une procédure d'arrêt si problème

### Après la migration

1. **Validation** : Exécuter la validation complète
2. **Tests** : Tester les fonctionnalités principales
3. **Monitoring** : Surveiller les erreurs utilisateur
4. **Nettoyage** : Supprimer les anciennes données si nécessaire

## Rollback

### Quand faire un rollback

- Erreurs critiques détectées
- Perte de données
- Problèmes de performance majeurs
- Feedback utilisateur négatif

### Processus de rollback

1. Suppression des organisations créées par migration
2. Réinitialisation des champs d'organisation des utilisateurs
3. Validation de l'état de rollback

### Limitations du rollback

- Ne peut pas récupérer les données modifiées manuellement après migration
- Efficace seulement dans les 24h suivant la migration
- Ne restaure pas les données supprimées par erreur

## Monitoring et métriques

### Métriques à surveiller

- Temps d'exécution de la migration
- Nombre d'erreurs par batch
- Utilisation des ressources Firestore
- Temps de réponse des API

### Logs importants

- Début/fin de migration
- Erreurs par utilisateur
- Statistiques par batch
- Validation des données

## Support et dépannage

### Logs de débogage

Les logs détaillés sont disponibles dans :
- Firebase Functions logs
- Console de sortie du script CLI
- Réponses API avec détails d'erreur

### Commandes de diagnostic

```bash
# Vérifier l'état général
npm run migrate:organizations:status

# Valider l'intégrité
npm run migrate:organizations:validate

# Voir les logs Firebase
firebase functions:log
```

### Contact support

En cas de problème critique :
1. Arrêter la migration si en cours
2. Documenter l'erreur avec logs
3. Contacter l'équipe technique
4. Préparer les informations de rollback si nécessaire