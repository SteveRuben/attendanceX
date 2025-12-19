# Tasks - ReBAC Authorization System Implementation

## Phase 1: Foundation (Semaine 1-2)

### Task 1.1: Setup Core Infrastructure
**Priority**: P0 (Critical)
**Estimated**: 3 days

- [ ] Créer la collection Firestore `rebac_tuples` avec index composites (le faire en local)✅
- [ ] Configurer Redis pour le cache (si pas déjà fait)
- [ ] Créer les types TypeScript pour RelationTuple et NamespaceSchema  ✅
- [ ] Implémenter la classe TupleStore avec CRUD de base ✅
- [ ] Écrire les tests unitaires pour TupleStore ✅

**Acceptance Criteria**:
- Collection Firestore créée avec index optimisés
- TupleStore peut créer, lire, mettre à jour et supprimer des tuples
- Tests passent avec 100% de couverture

### Task 1.2: Schema Registry
**Priority**: P0 (Critical)
**Estimated**: 2 days

- [ ] Créer la classe SchemaRegistry ✅
- [ ] Définir les schémas pour organization, event, client ✅
- [ ] Définir les schémas pour project, document, timesheet, invoice ✅
- [ ] Implémenter la validation de schéma ✅
- [ ] Écrire les tests unitaires ✅

**Acceptance Criteria**:
- Tous les namespaces ont un schéma défini
- La validation détecte les tuples invalides
- Tests passent

### Task 1.3: Basic ReBAC Service
**Priority**: P0 (Critical)
**Estimated**: 3 days

- [ ] Créer la classe ReBACService ✅
- [ ] Implémenter la méthode check() pour relations directes ✅
- [ ] Implémenter la méthode write() pour créer des tuples ✅
- [ ] Implémenter la méthode delete() pour supprimer des tuples ✅
- [ ] Ajouter le logging d'audit ✅
- [ ] Écrire les tests unitaires ✅

**Acceptance Criteria**:
- check() retourne true/false correctement pour relations directes
- write() crée des tuples valides
- delete() supprime les tuples
- Tous les appels sont loggés

## Phase 2: Advanced Features (Semaine 3-4)
### Task 2.1: Recursive Resolution
**Priority**: P0 (Critical)
**Estimated**: 4 days

- [ ] Implémenter la résolution récursive dans resolve()✅
- [ ] Gérer les relations transitives (computedUserset)✅
- [ ] Ajouter la limite de profondeur (max 10)✅
- [ ] Optimiser avec mémoïsation✅
- [ ] Écrire les tests pour cas complexes✅

**Acceptance Criteria**:
- Résout correctement les relations parent-child
- Détecte et évite les boucles infinies
- Tests passent pour tous les cas edge

### Task 2.2: Expand API
**Priority**: P1 (High)
**Estimated**: 3 days

- [ ] Implémenter la méthode expand()✅
- [ ] Optimiser les requêtes Firestore✅
- [ ] Ajouter la pagination✅✅
- [ ] Gérer les relations transitives✅✅
- [ ] Écrire les tests✅

**Acceptance Criteria**:
- expand() retourne tous les objets accessibles
- Pagination fonctionne correctement
- Performance acceptable (< 500ms pour 1000 objets)

### Task 2.3: Caching Layer
**Priority**: P1 (High)
**Estimated**: 3 days

- [ ] Implémenter le cache L1 (in-memory)✅
- [ ] Implémenter le cache L2 (Redis)✅
- [ ] Créer la stratégie d'invalidation✅
- [ ] Ajouter les métriques de cache hit rate✅
- [ ] Écrire les tests✅

**Acceptance Criteria**:
- Cache hit rate > 80% en production
- Invalidation fonctionne correctement
- Pas de données stale

### Task 2.4: Conditional Permissions
**Priority**: P2 (Medium)
**Estimated**: 3 days

- [ ] Créer l'évaluateur d'expressions✅
- [ ] Implémenter evaluateCondition()✅
- [ ] Supporter les opérateurs de base (==, !=, <, >, AND, OR)✅
- [ ] Gérer le contexte dynamique✅
- [ ] Écrire les tests✅

**Acceptance Criteria**:
- Conditions simples fonctionnent
- Conditions complexes avec AND/OR fonctionnent
- Erreurs sont gérées gracieusement

## Phase 3: Integration (Semaine 5-6)

### Task 3.1: Middleware Integration
**Priority**: P0 (Critical)
**Estimated**: 2 days

- [ ] Créer le middleware requirePermission()✅
- [ ] Intégrer avec le middleware auth existant✅
- [ ] Ajouter le support du contexte tenant✅
- [ ] Gérer les erreurs proprement✅
- [ ] Écrire les tests d'intégration✅

**Acceptance Criteria**:
- Middleware fonctionne avec les routes existantes
- Erreurs 401/403 retournées correctement
- Tests d'intégration passent

### Task 3.2: Auto-Tuple Creation
**Priority**: P1 (High)
**Estimated**: 3 days

- [ ] Créer des hooks pour auto-création de tuples✅
- [ ] Hook sur création d'organisation (owner)✅
- [ ] Hook sur création d'événement (creator)✅
- [ ] Hook sur invitation membre (member)✅
- [ ] Hook sur assignation projet (assigned_to)✅
- [ ] Écrire les tests✅

**Acceptance Criteria**:
- Tuples créés automatiquement lors des opérations
- Pas de tuples orphelins
- Tests passent

### Task 3.3: Migration RBAC -> ReBAC
**Priority**: P1 (High)
**Estimated**: 4 days

- [ ] Créer le script de migration✅
- [ ] Mapper les rôles RBAC vers relations ReBAC✅
- [ ] Migrer les permissions existantes✅
- [ ] Valider la migration✅
- [ ] Créer le script de rollback✅
- [ ] Documenter le processus✅

**Acceptance Criteria**:
- Script migre toutes les permissions
- Validation confirme l'équivalence
- Rollback fonctionne

### Task 3.4: Parallel Run Mode
**Priority**: P1 (High)
**Estimated**: 2 days

- [ ] Implémenter le mode parallel run
- [ ] Logger les différences RBAC vs ReBAC
- [ ] Créer un dashboard de comparaison
- [ ] Alerter sur les divergences
- [ ] Documenter les résultats

**Acceptance Criteria**:
- Les deux systèmes tournent en parallèle
- Différences sont loggées
- Dashboard montre les métriques

## Phase 4: Optimization (Semaine 7-8)

### Task 4.1: Performance Tuning
**Priority**: P1 (High)
**Estimated**: 3 days

- [ ] Profiler les requêtes lentes
- [ ] Optimiser les index Firestore
- [ ] Tuner le cache Redis
- [ ] Implémenter le batch checking
- [ ] Mesurer les améliorations

**Acceptance Criteria**:
- check() < 50ms (P95)
- expand() < 500ms (P95)
- Cache hit rate > 80%

### Task 4.2: Monitoring & Alerting
**Priority**: P1 (High)
**Estimated**: 2 days

- [ ] Ajouter les métriques Prometheus
- [ ] Créer les dashboards Grafana
- [ ] Configurer les alertes
- [ ] Documenter les runbooks
- [ ] Tester les alertes

**Acceptance Criteria**:
- Métriques collectées
- Dashboards créés
- Alertes fonctionnent

### Task 4.3: Load Testing
**Priority**: P1 (High)
**Estimated**: 2 days

- [ ] Créer les scénarios de load test
- [ ] Tester avec 1M tuples
- [ ] Tester avec 10K req/s
- [ ] Identifier les bottlenecks
- [ ] Documenter les résultats

**Acceptance Criteria**:
- Système supporte 1M tuples
- Système supporte 10K req/s
- Pas de dégradation significative

### Task 4.4: Cleanup & Maintenance
**Priority**: P2 (Medium)
**Estimated**: 2 days

- [ ] Implémenter le cleanup des tuples expirés
- [ ] Créer un job de maintenance quotidien
- [ ] Ajouter la détection de tuples orphelins
- [ ] Implémenter la compaction
- [ ] Documenter la maintenance

**Acceptance Criteria**:
- Tuples expirés supprimés automatiquement
- Pas de tuples orphelins
- Job de maintenance fonctionne

## Phase 5: Advanced Features (Semaine 9-10)

### Task 5.1: Delegation System
**Priority**: P2 (Medium)
**Estimated**: 3 days

- [ ] Implémenter la création de délégations
- [ ] Gérer l'expiration automatique
- [ ] Logger les actions déléguées
- [ ] Permettre la révocation
- [ ] Écrire les tests

**Acceptance Criteria**:
- Délégations créées et expirées automatiquement
- Actions loggées avec contexte de délégation
- Révocation fonctionne

### Task 5.2: Admin UI
**Priority**: P2 (Medium)
**Estimated**: 4 days

- [ ] Créer l'interface de visualisation des relations
- [ ] Implémenter le tracer de résolution
- [ ] Ajouter la gestion manuelle des tuples
- [ ] Créer le détecteur d'incohérences
- [ ] Écrire les tests E2E

**Acceptance Criteria**:
- UI permet de visualiser les relations
- Tracer montre le chemin de résolution
- Gestion manuelle fonctionne

### Task 5.3: Temporal Relations
**Priority**: P2 (Medium)
**Estimated**: 2 days

- [ ] Implémenter les tuples avec TTL
- [ ] Créer le job de cleanup
- [ ] Ajouter les notifications d'expiration
- [ ] Gérer le renouvellement
- [ ] Écrire les tests

**Acceptance Criteria**:
- Tuples expirent automatiquement
- Notifications envoyées avant expiration
- Renouvellement fonctionne

### Task 5.4: Audit & Compliance
**Priority**: P1 (High)
**Estimated**: 3 days

- [ ] Implémenter l'audit trail complet
- [ ] Créer les rapports de conformité
- [ ] Ajouter l'export pour audits externes
- [ ] Implémenter la recherche dans les logs
- [ ] Documenter pour compliance

**Acceptance Criteria**:
- Toutes les actions sont auditées
- Rapports générés automatiquement
- Export fonctionne
- Recherche performante

## Phase 6: Documentation & Training (Semaine 11-12)

### Task 6.1: Technical Documentation
**Priority**: P1 (High)
**Estimated**: 3 days

- [ ] Documenter l'architecture ReBAC
- [ ] Créer le guide d'utilisation pour développeurs
- [ ] Documenter tous les schémas de namespaces
- [ ] Créer des exemples de code
- [ ] Documenter les patterns courants

**Acceptance Criteria**:
- Documentation complète et à jour
- Exemples fonctionnent
- Patterns documentés

### Task 6.2: Migration Guide
**Priority**: P1 (High)
**Estimated**: 2 days

- [ ] Créer le guide de migration RBAC -> ReBAC
- [ ] Documenter les différences
- [ ] Créer des exemples de migration
- [ ] Documenter les pièges courants
- [ ] Créer une FAQ

**Acceptance Criteria**:
- Guide complet et clair
- Exemples couvrent les cas courants
- FAQ répond aux questions principales

### Task 6.3: Team Training
**Priority**: P1 (High)
**Estimated**: 2 days

- [ ] Préparer la présentation ReBAC
- [ ] Créer des exercices pratiques
- [ ] Former l'équipe backend
- [ ] Former l'équipe frontend
- [ ] Créer des ressources de référence

**Acceptance Criteria**:
- Équipe comprend ReBAC
- Équipe peut utiliser l'API
- Ressources disponibles

### Task 6.4: Runbooks & Troubleshooting
**Priority**: P1 (High)
**Estimated**: 2 days

- [ ] Créer les runbooks opérationnels
- [ ] Documenter les problèmes courants
- [ ] Créer le guide de troubleshooting
- [ ] Documenter les procédures d'urgence
- [ ] Tester les runbooks

**Acceptance Criteria**:
- Runbooks complets
- Problèmes courants documentés
- Procédures testées

## Estimation Totale

- **Phase 1**: 8 jours
- **Phase 2**: 13 jours
- **Phase 3**: 11 jours
- **Phase 4**: 9 jours
- **Phase 5**: 12 jours
- **Phase 6**: 9 jours

**Total**: ~62 jours (12 semaines avec 1 développeur)

Avec 2 développeurs en parallèle: ~6-7 semaines

## Dependencies

- Firebase Functions déjà configuré ✅
- Firestore déjà en place ✅
- Redis à configurer (si pas déjà fait)
- Système d'audit existant à étendre

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Performance dégradée | High | Medium | Load testing précoce, optimisation continue |
| Migration complexe | High | High | Parallel run, rollback plan, migration progressive |
| Bugs de sécurité | Critical | Low | Tests exhaustifs, audit externe, bug bounty |
| Résistance de l'équipe | Medium | Medium | Formation, documentation, support continu |
| Complexité sous-estimée | High | Medium | Buffer de 20%, revues régulières |

## Success Metrics

- ✅ check() < 50ms (P95)
- ✅ expand() < 500ms (P95)
- ✅ Cache hit rate > 80%
- ✅ 0 régression de fonctionnalités
- ✅ Migration complète en < 1 heure
- ✅ Réduction de 50% du code de permissions
- ✅ 100% de couverture de tests
- ✅ 0 incident de sécurité
