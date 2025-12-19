# RBAC → ReBAC Migration Guide

Ce guide décrit comment exécuter le script `migrate-rbac-to-rebac.ts` pour convertir les permissions historiques (RBAC) vers des tuples ReBAC.

## Mappage des rôles

| Rôle RBAC (TenantRole) | Relation ReBAC (`organization`) |
| ---------------------- | -------------------------------- |
| owner                  | owner                           |
| admin                  | admin                           |
| manager                | manager                         |
| member                 | member                          |
| viewer                 | viewer                          |

Les créateurs d’événements deviennent `event#creator`, et les collaborateurs affectés à un projet deviennent `project#assigned_to`.

## Prérequis

1. Se placer dans `backend/functions`.
2. Configurer Firebase (variables d’environnement ou emulateur).
3. Installer les dépendances (`npm install` si nécessaire).

## Dry-run

```
npm run rebac:migrate:dry-run
```

- Scanne les memberships, événements et projets.
- Compte les tuples qui seraient créés sans toucher la base.
- Utile pour estimer l’impact avant migration réelle.

## Migration complète

```
npm run rebac:migrate
```

- Génère un `migrationId` (ex: `rbac_to_rebac_v1_kx83...`).
- Crée les tuples manquants via le ReBACService (écriture idempotente).
- Affiche les statistiques (traités / créés / ignorés).
- Vérifie le nombre de tuples écrits (`metadata.migrationId`).

Vous pouvez également forcer un `migrationId` :

```
ts-node src/scripts/rebac/migrate-rbac-to-rebac.ts --migration-id custom-id
```

## Validation

1. Vérifier les métriques affichées (nombre de tuples créés vs nombre de memberships/événements/projets).
2. Contrôler quelques documents dans `rebac_tuples` (metadata contient `migrationId`).
3. Lancer la batterie de tests ReBAC (`npm run test:backend -- --testPathPattern=reBAC`).

## Rollback

```
ts-node src/scripts/rebac/migrate-rbac-to-rebac.ts --rollback <migrationId>
```

Le script supprime tous les tuples dont `metadata.migrationId` correspond. Les écritures futures (via AutoTupleHooks) recréeront les tuples nécessaires.

## Historique & Support

- Script : `backend/functions/src/scripts/rebac/migrate-rbac-to-rebac.ts`
- Hooks utilisés : `backend/functions/src/rebac/hooks/AutoTupleHooks.ts`
- Tests : `tests/backend/reBAC/AutoTupleHooks.test.ts`, `tests/backend/reBAC/RbacMigrationHelpers.test.ts`

Pour toute question, contactez l’équipe ReBAC.***
