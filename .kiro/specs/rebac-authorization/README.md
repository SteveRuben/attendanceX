# ReBAC Authorization System

## Overview

Cette spécification définit l'implémentation d'un système d'autorisation basé sur les relations (ReBAC - Relationship-Based Access Control) pour AttendanceX. ReBAC remplacera progressivement le système RBAC actuel pour offrir un contrôle d'accès plus flexible et granulaire.

## Pourquoi ReBAC ?

### Limitations du RBAC actuel

1. **Rigidité** : Les rôles sont statiques et ne reflètent pas les relations dynamiques
2. **Complexité** : Multiplication des rôles pour gérer les cas spécifiques
3. **Manque de contexte** : Impossible de dire "peut éditer SI créateur OU admin de l'organisation"
4. **Scalabilité** : Difficile de gérer les permissions cross-organisation

### Avantages de ReBAC

1. **Flexibilité** : Permissions basées sur les relations réelles entre entités
2. **Naturel** : Reflète la structure organisationnelle (membre de, propriétaire de, etc.)
3. **Granularité** : Contrôle très fin des accès
4. **Scalabilité** : Fonctionne avec des millions d'utilisateurs et ressources
5. **Multi-tenant** : Parfait pour l'architecture SaaS

## Exemple Concret

### Avec RBAC (actuel)
```typescript
// Vérifier si un utilisateur peut éditer un événement
if (user.role === 'admin' || user.role === 'organizer') {
  // Mais comment savoir s'il est admin de CETTE organisation ?
  // Ou organisateur de CET événement ?
  // Nécessite des vérifications supplémentaires complexes
}
```

### Avec ReBAC (nouveau)
```typescript
// Vérifier si un utilisateur peut éditer un événement
const canEdit = await rebac.check('user:123', 'edit', 'event:456');

// Le système résout automatiquement :
// - user:123 est-il creator de event:456 ? OUI -> GRANTED
// - OU user:123 est-il organizer de event:456 ? 
// - OU user:123 est-il admin de l'organisation qui possède event:456 ?
```

## Architecture

```
User --[member_of]--> Organization --[owns]--> Event
User --[creator]--> Event
User --[organizer]--> Event
User --[participant]--> Event
```

Avec ReBAC, on définit :
- Les **relations** possibles (member_of, creator, organizer, etc.)
- Les **permissions** accordées par chaque relation
- Les **règles de résolution** (héritage, transitivité)

## Documents

- **[requirements.md](./requirements.md)** : Exigences fonctionnelles complètes (15 requirements)
- **[design.md](./design.md)** : Architecture technique détaillée avec code
- **[tasks.md](./tasks.md)** : Plan d'implémentation en 6 phases (12 semaines)

## Quick Start

### 1. Définir une relation

```typescript
await rebac.write({
  tenantId: 'org123',
  subject: { type: 'user', id: '456' },
  relation: 'member',
  object: { type: 'organization', id: '123' }
});
```

### 2. Vérifier une permission

```typescript
const canView = await rebac.check(
  'user:456',
  'view',
  'organization:123'
);
// true
```

### 3. Lister les ressources accessibles

```typescript
const events = await rebac.expand(
  'user:456',
  'view',
  'event'
);
// ['event:1', 'event:2', 'event:3', ...]
```

## Schémas de Relations

### Organization
- **owner** : Toutes permissions
- **admin** : Gestion sauf suppression et billing
- **manager** : Gestion d'équipe et événements
- **member** : Accès de base
- **viewer** : Lecture seule

### Event
- **creator** : Toutes permissions sur l'événement
- **organizer** : Gestion de l'événement
- **participant** : Voir et marquer présence
- **viewer** : Lecture seule
- **parent_organization** : Héritage des permissions de l'org

### Client
- **owner** : Toutes permissions
- **assigned_to** : Gestion du client
- **viewer** : Lecture seule
- **parent_organization** : Héritage

### Project
- **owner** : Toutes permissions
- **manager** : Gestion du projet
- **contributor** : Contribution
- **viewer** : Lecture seule
- **parent_organization** : Héritage

## Migration Strategy

### Phase 1: Parallel Run (2 semaines)
- ReBAC et RBAC tournent en parallèle
- Logging des différences
- Pas de changement de comportement

### Phase 2: Gradual Rollout (4 semaines)
- Activation par namespace progressivement
- Nouveaux modules utilisent ReBAC
- Fallback sur RBAC si erreur

### Phase 3: Full Migration (2 semaines)
- Migration de toutes les permissions
- Désactivation de RBAC
- Nettoyage du code

### Phase 4: Optimization (2 semaines)
- Optimisation des performances
- Tuning du cache
- Amélioration continue

## Performance Targets

- **check()** : < 50ms (P95)
- **expand()** : < 500ms (P95)
- **Cache hit rate** : > 80%
- **Throughput** : 10,000 req/s par tenant
- **Storage** : Support de 1M+ tuples par tenant

## Security

- **Tenant isolation** : Tous les tuples préfixés avec tenantId
- **Audit logging** : Toutes les vérifications loggées
- **Rate limiting** : Protection contre les abus
- **Validation** : Tous les tuples validés avant stockage
- **Encryption** : Données sensibles chiffrées

## Testing

- **Unit tests** : 100% de couverture
- **Integration tests** : Tous les flux testés
- **Performance tests** : Benchmarks réguliers
- **Load tests** : Simulation de charge réelle
- **Security tests** : Pentesting et audit

## Monitoring

Métriques à surveiller :
- `rebac.check.duration` : Temps de vérification
- `rebac.check.cache_hit_rate` : Taux de cache hit
- `rebac.expand.duration` : Temps d'expansion
- `rebac.tuple.count` : Nombre de tuples
- `rebac.resolution.depth` : Profondeur de résolution
- `rebac.errors.rate` : Taux d'erreurs

## Resources

### Inspiration
- **Google Zanzibar** : Le système qui a inspiré ReBAC
- **Ory Keto** : Implémentation open-source
- **SpiceDB** : Alternative moderne
- **Auth0 FGA** : Service managé

### Documentation
- [Google Zanzibar Paper](https://research.google/pubs/pub48190/)
- [ReBAC Explained](https://www.osohq.com/academy/relationship-based-access-control-rebac)
- [Ory Keto Docs](https://www.ory.sh/docs/keto/)

## FAQ

### Q: ReBAC remplace-t-il complètement RBAC ?
**R**: Oui, à terme. Mais la migration sera progressive avec une période de coexistence.

### Q: Quelles sont les performances comparées à RBAC ?
**R**: Avec le cache, ReBAC est aussi rapide que RBAC (< 50ms). Sans cache, légèrement plus lent mais plus flexible.

### Q: Comment gérer les permissions complexes ?
**R**: ReBAC supporte les relations transitives et conditionnelles pour gérer les cas complexes.

### Q: Est-ce compatible avec le multi-tenant ?
**R**: Oui, ReBAC est parfait pour le multi-tenant avec isolation stricte par tenant.

### Q: Que se passe-t-il en cas de boucle infinie ?
**R**: Le système limite la profondeur de résolution à 10 niveaux pour éviter les boucles.

### Q: Comment déboguer les problèmes de permissions ?
**R**: L'admin UI permet de tracer la résolution et voir pourquoi un accès est accordé/refusé.

## Support

Pour toute question :
- Consulter la documentation complète dans les fichiers de spec
- Créer une issue GitHub
- Contacter l'équipe architecture

## Status

- ✅ Spécification complète
- ⏳ Implémentation en cours
- ⏳ Tests en cours
- ⏳ Documentation en cours
- ⏳ Déploiement prévu

## Contributors

- Architecture : Équipe Backend
- Implémentation : À définir
- Review : Équipe Sécurité
- Documentation : Équipe Produit
