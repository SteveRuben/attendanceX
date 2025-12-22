# Mode parallel run ReBAC

Ce mode exécute ReBAC et le moteur RBAC historique en parallèle afin de détecter les divergences *avant* la bascule complète.

## Activation

1. Déployer la fonction avec `RBAC_PARALLEL_RUN_ENABLED=true`.
2. Vérifier que les collections Firestore `rebac_parallel_run` et `rebac_parallel_alerts` existent (créées automatiquement au premier write).
3. Aucun trafic n’est émis tant que la variable d’environnement reste à `false`/non définie.

## Fonctionnement

1. `requirePermission()` calcule le verdict ReBAC.
2. `ParallelRunService` s’exécute silencieusement :
   - appelle `authService.hasPermission()` (RBAC),
   - compare les deux décisions,
   - écrit uniquement les divergences dans `rebac_parallel_run`.
3. Lorsque RBAC autorise mais ReBAC refuse, un document d’alerte est ajouté à `rebac_parallel_alerts` **et** un log `warn` est émis.  
4. Les documents contiennent les métadonnées minimales (tenant, utilisateur, permission, subject/object refs, chemin HTTP, snapshot de contexte IP/UA/correlationId).

## API / Dashboard

```
GET /api/rebac/parallel-run/stats?limit=50
Headers: Bearer token + permission `view_rebac_parallel_stats`
```

Réponse : 
- `enabled` (bool).
- `mismatchCount` / `alertsCount`.
- `breakdown` par type (`rbac_allow_rebac_deny`, `rbac_deny_rebac_allow`).
- `recentMismatches[]` (jusqu’à 100 entrées) et `recentAlerts[]`.
- `lastUpdated` ISO.

Cette route est pensée pour nourrir un dashboard interne (tableau + widget de tendances).

## Alerting

- `rbac_allow_rebac_deny` → alerte `critical` (risque de régression d’accès).
- `rbac_deny_rebac_allow` → suivi simple (fuite potentielle mais moins urgente).
- Les équipes SecOps peuvent brancher Firebase Triggers / BigQuery export sur `rebac_parallel_alerts` pour pousser des notifications Slack/PagerDuty.

## Validation & tests

- Logique testée dans `tests/backend/reBAC/ParallelRunService.test.ts`.
- Exécution Jest locale bloquée tant que la dépendance `jest-watch-typeahead/filename` n’est pas installée (cf. README ReBAC). Mentionner cette limitation lors des rapports CI.
