# Design Document - ReBAC Authorization System

## Architecture Overview

Le système ReBAC d'AttendanceX s'inspire de Google Zanzibar et utilise une approche basée sur les tuples de relations stockés dans Firestore avec un cache Redis pour les performances.

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  (Controllers, Services utilisant ReBAC)                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   ReBAC Service Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Check API  │  │  Expand API  │  │  Write API   │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│  ┌──────▼──────────────────▼──────────────────▼───────┐    │
│  │         Relation Resolution Engine                  │    │
│  │  (Recursive resolution, caching, optimization)      │    │
│  └──────┬──────────────────────────────────────────────┘    │
└─────────┼───────────────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────────────────┐
│                    Storage Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Firestore  │  │  Redis Cache │  │  Audit Logs  │     │
│  │   (Tuples)   │  │  (Hot data)  │  │  (History)   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Data Model

### Tuple Structure

```typescript
interface RelationTuple {
  // Identifiant unique du tuple
  id: string;
  
  // Tenant isolation
  tenantId: string;
  
  // Subject (qui a la permission)
  subject: {
    type: 'user' | 'team' | 'role' | 'organization';
    id: string;
    relation?: string; // Pour les relations indirectes (ex: member#organization:123)
  };
  
  // Relation (type de lien)
  relation: string; // 'owner', 'member', 'viewer', 'editor', etc.
  
  // Object (ressource concernée)
  object: {
    type: string; // 'organization', 'event', 'client', 'project', etc.
    id: string;
  };
  
  // Métadonnées
  createdAt: Timestamp;
  createdBy?: string;
  expiresAt?: Timestamp; // Pour les relations temporaires
  
  // Conditions (optionnel)
  condition?: {
    expression: string; // Ex: "object.status == 'draft'"
    context?: Record<string, any>;
  };
  
  // Audit
  source: 'system' | 'manual' | 'migration' | 'delegation';
  metadata?: Record<string, any>;
}
```

### Namespace Schema

```typescript
interface NamespaceSchema {
  name: string; // 'organization', 'event', etc.
  
  // Relations possibles dans ce namespace
  relations: {
    [relationName: string]: {
      // Permissions accordées par cette relation
      permissions: string[];
      
      // Relations dont celle-ci hérite
      inheritsFrom?: string[];
      
      // Relations transitives
      union?: string[]; // Cette relation OU celle-là
      intersection?: string[]; // Cette relation ET celle-là
      
      // Relation vers un autre namespace
      computedUserset?: {
        relation: string;
        namespace: string;
      };
    };
  };
  
  // Permissions disponibles
  permissions: {
    [permissionName: string]: {
      description: string;
      // Quelles relations donnent cette permission
      grantedBy: string[];
    };
  };
}
```

## Core Components

### 1. ReBAC Service

```typescript
class ReBACService {
  private tupleStore: TupleStore;
  private cache: CacheService;
  private schemaRegistry: SchemaRegistry;
  
  /**
   * Vérifie si un subject a une permission sur un object
   */
  async check(
    subject: string,
    permission: string,
    object: string,
    context?: CheckContext
  ): Promise<boolean> {
    // 1. Parse subject et object
    const subjectParsed = this.parseEntity(subject);
    const objectParsed = this.parseEntity(object);
    
    // 2. Vérifier le cache
    const cacheKey = this.getCacheKey(subject, permission, object);
    const cached = await this.cache.get(cacheKey);
    if (cached !== null) return cached;
    
    // 3. Résoudre les relations
    const result = await this.resolve(
      subjectParsed,
      permission,
      objectParsed,
      context
    );
    
    // 4. Mettre en cache
    await this.cache.set(cacheKey, result, 300); // 5 min TTL
    
    // 5. Logger pour audit
    await this.auditLog(subject, permission, object, result);
    
    return result;
  }
  
  /**
   * Liste tous les objects accessibles par un subject
   */
  async expand(
    subject: string,
    permission: string,
    objectType: string,
    options?: ExpandOptions
  ): Promise<string[]> {
    // 1. Récupérer le schéma
    const schema = this.schemaRegistry.getSchema(objectType);
    
    // 2. Trouver quelles relations donnent cette permission
    const grantingRelations = schema.permissions[permission].grantedBy;
    
    // 3. Pour chaque relation, trouver les tuples
    const objectIds = new Set<string>();
    
    for (const relation of grantingRelations) {
      const tuples = await this.tupleStore.findTuples({
        subject,
        relation,
        objectType
      });
      
      tuples.forEach(tuple => objectIds.add(tuple.object.id));
    }
    
    // 4. Résoudre les relations transitives
    const transitiveIds = await this.resolveTransitive(
      subject,
      permission,
      objectType,
      Array.from(objectIds)
    );
    
    return Array.from(new Set([...objectIds, ...transitiveIds]));
  }
  
  /**
   * Crée une nouvelle relation
   */
  async write(tuple: RelationTuple): Promise<void> {
    // 1. Valider le tuple
    await this.validateTuple(tuple);
    
    // 2. Vérifier les doublons
    const existing = await this.tupleStore.findExact(tuple);
    if (existing) return;
    
    // 3. Stocker
    await this.tupleStore.create(tuple);
    
    // 4. Invalider le cache
    await this.invalidateCache(tuple);
    
    // 5. Émettre un événement
    await this.emitEvent('tuple.created', tuple);
  }
  
  /**
   * Supprime une relation
   */
  async delete(tuple: Partial<RelationTuple>): Promise<void> {
    // 1. Trouver les tuples correspondants
    const tuples = await this.tupleStore.find(tuple);
    
    // 2. Supprimer
    for (const t of tuples) {
      await this.tupleStore.delete(t.id);
      await this.invalidateCache(t);
    }
    
    // 3. Émettre un événement
    await this.emitEvent('tuple.deleted', tuple);
  }
  
  /**
   * Résout récursivement les relations
   */
  private async resolve(
    subject: ParsedEntity,
    permission: string,
    object: ParsedEntity,
    context?: CheckContext,
    depth: number = 0
  ): Promise<boolean> {
    // Limite de profondeur pour éviter les boucles infinies
    if (depth > 10) return false;
    
    // 1. Récupérer le schéma de l'object
    const schema = this.schemaRegistry.getSchema(object.type);
    
    // 2. Trouver quelles relations donnent cette permission
    const grantingRelations = schema.permissions[permission]?.grantedBy || [];
    
    // 3. Vérifier chaque relation
    for (const relation of grantingRelations) {
      // 3a. Relation directe
      const directTuple = await this.tupleStore.findExact({
        subject: `${subject.type}:${subject.id}`,
        relation,
        object: `${object.type}:${object.id}`
      });
      
      if (directTuple) {
        // Vérifier les conditions si présentes
        if (directTuple.condition) {
          const conditionMet = await this.evaluateCondition(
            directTuple.condition,
            object,
            context
          );
          if (conditionMet) return true;
        } else {
          return true;
        }
      }
      
      // 3b. Relation via un userset (ex: member@organization)
      const relationDef = schema.relations[relation];
      if (relationDef.computedUserset) {
        const { relation: parentRelation, namespace: parentNamespace } = 
          relationDef.computedUserset;
        
        // Trouver les parents
        const parentTuples = await this.tupleStore.find({
          subject: `${object.type}:${object.id}`,
          relation: parentRelation,
          objectType: parentNamespace
        });
        
        // Vérifier récursivement sur chaque parent
        for (const parentTuple of parentTuples) {
          const parentObject = this.parseEntity(
            `${parentTuple.object.type}:${parentTuple.object.id}`
          );
          
          const hasPermission = await this.resolve(
            subject,
            permission,
            parentObject,
            context,
            depth + 1
          );
          
          if (hasPermission) return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Évalue une condition
   */
  private async evaluateCondition(
    condition: RelationTuple['condition'],
    object: ParsedEntity,
    context?: CheckContext
  ): Promise<boolean> {
    if (!condition) return true;
    
    // Récupérer l'objet complet
    const objectData = await this.getObjectData(object);
    
    // Évaluer l'expression
    // Utiliser une bibliothèque comme expr-eval ou créer un évaluateur simple
    return this.expressionEvaluator.evaluate(
      condition.expression,
      { object: objectData, context }
    );
  }
}
```

### 2. Tuple Store

```typescript
class TupleStore {
  private db: Firestore;
  
  /**
   * Collection Firestore pour les tuples
   * Index composites:
   * - tenantId + subject + relation + object
   * - tenantId + object + relation
   * - tenantId + subject + object
   */
  private get collection() {
    return this.db.collection('rebac_tuples');
  }
  
  async create(tuple: RelationTuple): Promise<void> {
    await this.collection.doc(tuple.id).set({
      ...tuple,
      createdAt: FieldValue.serverTimestamp()
    });
  }
  
  async findExact(tuple: Partial<RelationTuple>): Promise<RelationTuple | null> {
    const query = this.collection
      .where('tenantId', '==', tuple.tenantId)
      .where('subject', '==', tuple.subject)
      .where('relation', '==', tuple.relation)
      .where('object', '==', tuple.object)
      .limit(1);
    
    const snapshot = await query.get();
    return snapshot.empty ? null : snapshot.docs[0].data() as RelationTuple;
  }
  
  async find(filter: Partial<RelationTuple>): Promise<RelationTuple[]> {
    let query: Query = this.collection;
    
    if (filter.tenantId) {
      query = query.where('tenantId', '==', filter.tenantId);
    }
    if (filter.subject) {
      query = query.where('subject', '==', filter.subject);
    }
    if (filter.relation) {
      query = query.where('relation', '==', filter.relation);
    }
    if (filter.object) {
      query = query.where('object', '==', filter.object);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.data() as RelationTuple);
  }
  
  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }
  
  /**
   * Nettoie les tuples expirés
   */
  async cleanupExpired(): Promise<number> {
    const now = Timestamp.now();
    const query = this.collection
      .where('expiresAt', '<=', now)
      .limit(500);
    
    const snapshot = await query.get();
    const batch = this.db.batch();
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    return snapshot.size;
  }
}
```

### 3. Schema Registry

```typescript
class SchemaRegistry {
  private schemas: Map<string, NamespaceSchema> = new Map();
  
  constructor() {
    this.loadSchemas();
  }
  
  private loadSchemas() {
    // Organization Schema
    this.schemas.set('organization', {
      name: 'organization',
      relations: {
        owner: {
          permissions: ['view', 'edit', 'delete', 'manage_members', 'manage_billing'],
          inheritsFrom: []
        },
        admin: {
          permissions: ['view', 'edit', 'manage_members', 'view_analytics'],
          inheritsFrom: []
        },
        manager: {
          permissions: ['view', 'view_analytics'],
          inheritsFrom: []
        },
        member: {
          permissions: ['view'],
          inheritsFrom: []
        },
        viewer: {
          permissions: ['view'],
          inheritsFrom: []
        }
      },
      permissions: {
        view: {
          description: 'Can view organization',
          grantedBy: ['owner', 'admin', 'manager', 'member', 'viewer']
        },
        edit: {
          description: 'Can edit organization settings',
          grantedBy: ['owner', 'admin']
        },
        delete: {
          description: 'Can delete organization',
          grantedBy: ['owner']
        },
        manage_members: {
          description: 'Can manage organization members',
          grantedBy: ['owner', 'admin']
        },
        manage_billing: {
          description: 'Can manage billing',
          grantedBy: ['owner']
        },
        view_analytics: {
          description: 'Can view analytics',
          grantedBy: ['owner', 'admin', 'manager']
        }
      }
    });
    
    // Event Schema
    this.schemas.set('event', {
      name: 'event',
      relations: {
        creator: {
          permissions: ['view', 'edit', 'delete', 'manage_participants', 'view_analytics'],
          inheritsFrom: []
        },
        organizer: {
          permissions: ['view', 'edit', 'manage_participants'],
          inheritsFrom: []
        },
        participant: {
          permissions: ['view', 'mark_attendance'],
          inheritsFrom: []
        },
        viewer: {
          permissions: ['view'],
          inheritsFrom: []
        },
        parent_organization: {
          permissions: [],
          inheritsFrom: [],
          computedUserset: {
            relation: 'member',
            namespace: 'organization'
          }
        }
      },
      permissions: {
        view: {
          description: 'Can view event',
          grantedBy: ['creator', 'organizer', 'participant', 'viewer', 'parent_organization']
        },
        edit: {
          description: 'Can edit event',
          grantedBy: ['creator', 'organizer']
        },
        delete: {
          description: 'Can delete event',
          grantedBy: ['creator']
        },
        manage_participants: {
          description: 'Can manage participants',
          grantedBy: ['creator', 'organizer']
        },
        mark_attendance: {
          description: 'Can mark attendance',
          grantedBy: ['participant']
        },
        view_analytics: {
          description: 'Can view analytics',
          grantedBy: ['creator', 'organizer']
        }
      }
    });
    
    // Ajouter les autres schémas (client, project, document, etc.)
  }
  
  getSchema(namespace: string): NamespaceSchema {
    const schema = this.schemas.get(namespace);
    if (!schema) {
      throw new Error(`Schema not found for namespace: ${namespace}`);
    }
    return schema;
  }
}
```

### 4. Middleware Integration

```typescript
/**
 * Middleware ReBAC pour Express
 */
export const requirePermission = (
  permission: string,
  objectGetter: (req: AuthenticatedRequest) => string
) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }
      
      // Récupérer l'objet concerné
      const object = objectGetter(req);
      
      // Vérifier la permission avec ReBAC
      const rebac = ReBACService.getInstance();
      const hasPermission = await rebac.check(
        `user:${user.id}`,
        permission,
        object,
        {
          tenantId: req.tenantId,
          requestId: req.id
        }
      );
      
      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          details: {
            required: permission,
            object
          }
        });
        return;
      }
      
      next();
    } catch (error) {
      console.error('ReBAC middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
};

// Utilisation
router.put(
  '/events/:eventId',
  requireAuth,
  requirePermission('edit', (req) => `event:${req.params.eventId}`),
  eventController.update
);
```

## Migration Strategy

### Phase 1: Parallel Run (2 semaines)
- Implémenter ReBAC en parallèle de RBAC
- Logger les différences de résultats
- Pas de changement de comportement

### Phase 2: Gradual Rollout (4 semaines)
- Activer ReBAC par namespace progressivement
- Commencer par les nouveaux modules
- Fallback sur RBAC en cas d'erreur

### Phase 3: Full Migration (2 semaines)
- Migrer toutes les permissions RBAC vers ReBAC
- Désactiver RBAC
- Nettoyer le code legacy

### Phase 4: Optimization (2 semaines)
- Optimiser les index Firestore
- Tuner le cache Redis
- Améliorer les performances

## Performance Optimizations

### 1. Caching Strategy
```typescript
// Cache à 3 niveaux
class CacheStrategy {
  // L1: In-memory (très rapide, petite taille)
  private l1Cache: Map<string, boolean> = new Map();
  
  // L2: Redis (rapide, taille moyenne)
  private l2Cache: RedisClient;
  
  // L3: Firestore (lent, grande taille)
  private l3Store: TupleStore;
  
  async get(key: string): Promise<boolean | null> {
    // Essayer L1
    if (this.l1Cache.has(key)) {
      return this.l1Cache.get(key)!;
    }
    
    // Essayer L2
    const l2Result = await this.l2Cache.get(key);
    if (l2Result !== null) {
      this.l1Cache.set(key, l2Result);
      return l2Result;
    }
    
    return null;
  }
}
```

### 2. Batch Operations
```typescript
// Vérifier plusieurs permissions en une seule requête
async checkBatch(
  checks: Array<{ subject: string; permission: string; object: string }>
): Promise<boolean[]> {
  // Grouper par type pour optimiser les requêtes
  const results = await Promise.all(
    checks.map(check => this.check(check.subject, check.permission, check.object))
  );
  return results;
}
```

### 3. Index Optimization
```firestore
// Index composites Firestore
indexes:
  - collectionGroup: rebac_tuples
    fields:
      - fieldPath: tenantId
        order: ASCENDING
      - fieldPath: subject
        order: ASCENDING
      - fieldPath: relation
        order: ASCENDING
      - fieldPath: object
        order: ASCENDING
  
  - collectionGroup: rebac_tuples
    fields:
      - fieldPath: tenantId
        order: ASCENDING
      - fieldPath: object
        order: ASCENDING
      - fieldPath: relation
        order: ASCENDING
```

## Security Considerations

1. **Tenant Isolation**: Tous les tuples sont préfixés avec tenantId
2. **Audit Logging**: Toutes les vérifications sont loggées
3. **Rate Limiting**: Limiter les vérifications par utilisateur
4. **Validation**: Valider tous les tuples avant stockage
5. **Encryption**: Chiffrer les tuples sensibles au repos

## Monitoring & Observability

```typescript
// Métriques à tracker
const metrics = {
  'rebac.check.duration': histogram,
  'rebac.check.cache_hit_rate': gauge,
  'rebac.expand.duration': histogram,
  'rebac.tuple.count': gauge,
  'rebac.resolution.depth': histogram,
  'rebac.errors.rate': counter
};
```

## Testing Strategy

1. **Unit Tests**: Tester chaque composant isolément
2. **Integration Tests**: Tester les flux complets
3. **Performance Tests**: Vérifier les temps de réponse
4. **Load Tests**: Tester avec des millions de tuples
5. **Security Tests**: Tester l'isolation et les fuites
