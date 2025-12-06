# ReBAC Examples - Cas d'Usage Pratiques

## Table des Matières

1. [Cas d'Usage Simples](#cas-dusage-simples)
2. [Cas d'Usage Avancés](#cas-dusage-avancés)
3. [Intégration dans le Code](#intégration-dans-le-code)
4. [Patterns Courants](#patterns-courants)
5. [Troubleshooting](#troubleshooting)

## Cas d'Usage Simples

### 1. Créer une organisation et son propriétaire

```typescript
// Lors de la création d'une organisation
async function createOrganization(userId: string, orgData: any) {
  // 1. Créer l'organisation
  const org = await organizationService.create(orgData);
  
  // 2. Créer la relation owner
  await rebac.write({
    tenantId: org.id,
    subject: { type: 'user', id: userId },
    relation: 'owner',
    object: { type: 'organization', id: org.id },
    source: 'system',
    createdBy: userId
  });
  
  return org;
}
```

### 2. Inviter un membre dans une organisation

```typescript
// Lors de l'acceptation d'une invitation
async function acceptInvitation(userId: string, invitationId: string) {
  const invitation = await getInvitation(invitationId);
  
  // Créer la relation member
  await rebac.write({
    tenantId: invitation.organizationId,
    subject: { type: 'user', id: userId },
    relation: invitation.role, // 'member', 'admin', 'manager'
    object: { type: 'organization', id: invitation.organizationId },
    source: 'system',
    createdBy: invitation.invitedBy
  });
  
  // Supprimer l'invitation
  await deleteInvitation(invitationId);
}
```

### 3. Créer un événement

```typescript
// Lors de la création d'un événement
async function createEvent(userId: string, eventData: any) {
  // 1. Créer l'événement
  const event = await eventService.create(eventData);
  
  // 2. Créer la relation creator
  await rebac.write({
    tenantId: eventData.organizationId,
    subject: { type: 'user', id: userId },
    relation: 'creator',
    object: { type: 'event', id: event.id },
    source: 'system',
    createdBy: userId
  });
  
  // 3. Lier l'événement à l'organisation
  await rebac.write({
    tenantId: eventData.organizationId,
    subject: { type: 'event', id: event.id },
    relation: 'parent_organization',
    object: { type: 'organization', id: eventData.organizationId },
    source: 'system',
    createdBy: userId
  });
  
  return event;
}
```

### 4. Vérifier si un utilisateur peut éditer un événement

```typescript
// Dans le controller
async function updateEvent(req: AuthenticatedRequest, res: Response) {
  const { eventId } = req.params;
  const userId = req.user.id;
  
  // Vérifier la permission
  const canEdit = await rebac.check(
    `user:${userId}`,
    'edit',
    `event:${eventId}`
  );
  
  if (!canEdit) {
    return res.status(403).json({
      success: false,
      error: 'Vous n\'avez pas la permission d\'éditer cet événement'
    });
  }
  
  // Continuer avec la mise à jour
  const event = await eventService.update(eventId, req.body);
  res.json({ success: true, data: event });
}
```

### 5. Lister tous les événements visibles par un utilisateur

```typescript
// Dans le controller
async function listEvents(req: AuthenticatedRequest, res: Response) {
  const userId = req.user.id;
  
  // Récupérer tous les IDs d'événements accessibles
  const eventIds = await rebac.expand(
    `user:${userId}`,
    'view',
    'event'
  );
  
  // Récupérer les événements depuis Firestore
  const events = await eventService.getByIds(eventIds);
  
  res.json({ success: true, data: events });
}
```

## Cas d'Usage Avancés

### 1. Ajouter un organisateur à un événement

```typescript
async function addOrganizer(eventId: string, userId: string, addedBy: string) {
  // Vérifier que celui qui ajoute a la permission
  const canManage = await rebac.check(
    `user:${addedBy}`,
    'manage_participants',
    `event:${eventId}`
  );
  
  if (!canManage) {
    throw new Error('Permission denied');
  }
  
  // Ajouter la relation organizer
  await rebac.write({
    tenantId: req.tenantId,
    subject: { type: 'user', id: userId },
    relation: 'organizer',
    object: { type: 'event', id: eventId },
    source: 'manual',
    createdBy: addedBy
  });
}
```

### 2. Déléguer temporairement des permissions

```typescript
async function delegateAccess(
  fromUserId: string,
  toUserId: string,
  resourceType: string,
  resourceId: string,
  duration: number // en secondes
) {
  // Vérifier que l'utilisateur a les permissions à déléguer
  const canDelegate = await rebac.check(
    `user:${fromUserId}`,
    'edit',
    `${resourceType}:${resourceId}`
  );
  
  if (!canDelegate) {
    throw new Error('Cannot delegate permissions you don\'t have');
  }
  
  // Créer une relation temporaire
  const expiresAt = new Date(Date.now() + duration * 1000);
  
  await rebac.write({
    tenantId: req.tenantId,
    subject: { type: 'user', id: toUserId },
    relation: 'editor', // Relation déléguée
    object: { type: resourceType, id: resourceId },
    source: 'delegation',
    createdBy: fromUserId,
    expiresAt,
    metadata: {
      delegatedBy: fromUserId,
      delegatedAt: new Date()
    }
  });
  
  // Notifier l'utilisateur
  await notificationService.send({
    userId: toUserId,
    type: 'permission_delegated',
    message: `Vous avez reçu un accès temporaire jusqu'à ${expiresAt}`,
    data: { resourceType, resourceId, expiresAt }
  });
}
```

### 3. Permissions conditionnelles (édition seulement si brouillon)

```typescript
// Dans le schéma
const timesheetSchema = {
  name: 'timesheet',
  relations: {
    owner: {
      permissions: ['view', 'edit_if_draft', 'submit'],
      inheritsFrom: []
    },
    approver: {
      permissions: ['view', 'approve', 'reject'],
      inheritsFrom: []
    }
  },
  permissions: {
    edit: {
      description: 'Can edit timesheet',
      grantedBy: ['owner'],
      condition: 'object.status == "draft"' // Condition !
    }
  }
};

// Utilisation
const canEdit = await rebac.check(
  'user:123',
  'edit',
  'timesheet:456'
);
// Retourne true seulement si user:123 est owner ET timesheet.status == 'draft'
```

### 4. Permissions héritées via hiérarchie

```typescript
// Structure : Organization -> Team -> Project

// 1. Créer la hiérarchie
await rebac.write({
  tenantId: 'org123',
  subject: { type: 'team', id: 'team456' },
  relation: 'parent_organization',
  object: { type: 'organization', id: 'org123' }
});

await rebac.write({
  tenantId: 'org123',
  subject: { type: 'project', id: 'proj789' },
  relation: 'parent_team',
  object: { type: 'team', id: 'team456' }
});

// 2. Donner accès à l'organisation
await rebac.write({
  tenantId: 'org123',
  subject: { type: 'user', id: 'user123' },
  relation: 'admin',
  object: { type: 'organization', id: 'org123' }
});

// 3. Vérifier l'accès au projet (hérité)
const canView = await rebac.check(
  'user:123',
  'view',
  'project:789'
);
// true - car user:123 est admin de l'org qui contient le projet
```

### 5. Partage de document avec plusieurs niveaux

```typescript
async function shareDocument(
  documentId: string,
  sharedWith: string[],
  permission: 'viewer' | 'editor',
  sharedBy: string
) {
  // Vérifier que celui qui partage a la permission
  const canShare = await rebac.check(
    `user:${sharedBy}`,
    'share',
    `document:${documentId}`
  );
  
  if (!canShare) {
    throw new Error('Permission denied');
  }
  
  // Créer les relations pour chaque utilisateur
  const tuples = sharedWith.map(userId => ({
    tenantId: req.tenantId,
    subject: { type: 'user', id: userId },
    relation: permission,
    object: { type: 'document', id: documentId },
    source: 'manual',
    createdBy: sharedBy
  }));
  
  await Promise.all(tuples.map(tuple => rebac.write(tuple)));
  
  // Notifier les utilisateurs
  await notificationService.sendBulk(
    sharedWith.map(userId => ({
      userId,
      type: 'document_shared',
      message: `Un document a été partagé avec vous`,
      data: { documentId, permission }
    }))
  );
}
```

## Intégration dans le Code

### Middleware Express

```typescript
// middleware/rebac.middleware.ts
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
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      const object = objectGetter(req);
      const rebac = ReBACService.getInstance();
      
      const hasPermission = await rebac.check(
        `user:${userId}`,
        permission,
        object,
        {
          tenantId: req.tenantId,
          requestId: req.id,
          ip: req.ip
        }
      );
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          details: {
            required: permission,
            object
          }
        });
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

// Utilisation dans les routes
router.put(
  '/events/:eventId',
  requireAuth,
  requirePermission('edit', (req) => `event:${req.params.eventId}`),
  eventController.update
);

router.delete(
  '/events/:eventId',
  requireAuth,
  requirePermission('delete', (req) => `event:${req.params.eventId}`),
  eventController.delete
);

router.post(
  '/events/:eventId/participants',
  requireAuth,
  requirePermission('manage_participants', (req) => `event:${req.params.eventId}`),
  eventController.addParticipant
);
```

### Service Layer

```typescript
// services/event.service.ts
class EventService {
  private rebac: ReBACService;
  
  constructor() {
    this.rebac = ReBACService.getInstance();
  }
  
  async getVisibleEvents(userId: string): Promise<Event[]> {
    // Récupérer les IDs accessibles
    const eventIds = await this.rebac.expand(
      `user:${userId}`,
      'view',
      'event'
    );
    
    // Récupérer les événements
    const events = await this.getByIds(eventIds);
    
    return events;
  }
  
  async canUserEdit(userId: string, eventId: string): Promise<boolean> {
    return await this.rebac.check(
      `user:${userId}`,
      'edit',
      `event:${eventId}`
    );
  }
  
  async getEditableEvents(userId: string): Promise<Event[]> {
    const eventIds = await this.rebac.expand(
      `user:${userId}`,
      'edit',
      'event'
    );
    
    return await this.getByIds(eventIds);
  }
}
```

### Firestore Triggers

```typescript
// triggers/organization.triggers.ts
export const onOrganizationCreated = functions.firestore
  .document('organizations/{orgId}')
  .onCreate(async (snapshot, context) => {
    const org = snapshot.data();
    const orgId = context.params.orgId;
    
    // Créer la relation owner automatiquement
    const rebac = ReBACService.getInstance();
    await rebac.write({
      tenantId: orgId,
      subject: { type: 'user', id: org.createdBy },
      relation: 'owner',
      object: { type: 'organization', id: orgId },
      source: 'system',
      createdBy: org.createdBy
    });
  });

// triggers/event.triggers.ts
export const onEventCreated = functions.firestore
  .document('events/{eventId}')
  .onCreate(async (snapshot, context) => {
    const event = snapshot.data();
    const eventId = context.params.eventId;
    
    const rebac = ReBACService.getInstance();
    
    // Relation creator
    await rebac.write({
      tenantId: event.organizationId,
      subject: { type: 'user', id: event.createdBy },
      relation: 'creator',
      object: { type: 'event', id: eventId },
      source: 'system',
      createdBy: event.createdBy
    });
    
    // Relation parent_organization
    await rebac.write({
      tenantId: event.organizationId,
      subject: { type: 'event', id: eventId },
      relation: 'parent_organization',
      object: { type: 'organization', id: event.organizationId },
      source: 'system',
      createdBy: event.createdBy
    });
  });
```

## Patterns Courants

### Pattern 1: Vérification Batch

```typescript
// Vérifier plusieurs permissions en une fois
async function checkMultiplePermissions(
  userId: string,
  checks: Array<{ permission: string; object: string }>
): Promise<Record<string, boolean>> {
  const results = await Promise.all(
    checks.map(async ({ permission, object }) => ({
      key: `${permission}:${object}`,
      value: await rebac.check(`user:${userId}`, permission, object)
    }))
  );
  
  return Object.fromEntries(
    results.map(r => [r.key, r.value])
  );
}

// Utilisation
const permissions = await checkMultiplePermissions('user:123', [
  { permission: 'edit', object: 'event:456' },
  { permission: 'delete', object: 'event:456' },
  { permission: 'manage_participants', object: 'event:456' }
]);

console.log(permissions);
// {
//   'edit:event:456': true,
//   'delete:event:456': false,
//   'manage_participants:event:456': true
// }
```

### Pattern 2: Filtrage de Liste

```typescript
// Filtrer une liste d'objets selon les permissions
async function filterByPermission<T extends { id: string }>(
  userId: string,
  permission: string,
  objectType: string,
  objects: T[]
): Promise<T[]> {
  // Récupérer les IDs accessibles
  const accessibleIds = await rebac.expand(
    `user:${userId}`,
    permission,
    objectType
  );
  
  const accessibleSet = new Set(accessibleIds);
  
  // Filtrer
  return objects.filter(obj => 
    accessibleSet.has(`${objectType}:${obj.id}`)
  );
}

// Utilisation
const allEvents = await eventService.getAll();
const editableEvents = await filterByPermission(
  'user:123',
  'edit',
  'event',
  allEvents
);
```

### Pattern 3: Cascade de Suppression

```typescript
// Supprimer toutes les relations liées à une ressource
async function deleteResourceWithRelations(
  resourceType: string,
  resourceId: string
) {
  const rebac = ReBACService.getInstance();
  
  // 1. Supprimer la ressource
  await deleteResource(resourceType, resourceId);
  
  // 2. Supprimer toutes les relations où la ressource est subject
  await rebac.delete({
    subject: { type: resourceType, id: resourceId }
  });
  
  // 3. Supprimer toutes les relations où la ressource est object
  await rebac.delete({
    object: { type: resourceType, id: resourceId }
  });
}
```

## Troubleshooting

### Déboguer une permission refusée

```typescript
// Fonction de debug pour tracer la résolution
async function debugPermission(
  subject: string,
  permission: string,
  object: string
) {
  const rebac = ReBACService.getInstance();
  
  console.log(`\n=== Debug Permission ===`);
  console.log(`Subject: ${subject}`);
  console.log(`Permission: ${permission}`);
  console.log(`Object: ${object}`);
  
  // 1. Vérifier le résultat
  const result = await rebac.check(subject, permission, object);
  console.log(`\nResult: ${result ? 'GRANTED' : 'DENIED'}`);
  
  // 2. Lister toutes les relations du subject
  const subjectRelations = await rebac.tupleStore.find({
    subject: subject
  });
  console.log(`\nSubject Relations (${subjectRelations.length}):`);
  subjectRelations.forEach(r => {
    console.log(`  - ${r.relation} -> ${r.object.type}:${r.object.id}`);
  });
  
  // 3. Lister toutes les relations vers l'object
  const objectRelations = await rebac.tupleStore.find({
    object: object
  });
  console.log(`\nObject Relations (${objectRelations.length}):`);
  objectRelations.forEach(r => {
    console.log(`  - ${r.subject.type}:${r.subject.id} --${r.relation}--> object`);
  });
  
  // 4. Vérifier le schéma
  const [objectType] = object.split(':');
  const schema = rebac.schemaRegistry.getSchema(objectType);
  const grantingRelations = schema.permissions[permission]?.grantedBy || [];
  console.log(`\nGranting Relations for '${permission}':`);
  grantingRelations.forEach(r => console.log(`  - ${r}`));
  
  return result;
}

// Utilisation
await debugPermission('user:123', 'edit', 'event:456');
```

### Détecter les tuples orphelins

```typescript
// Trouver les tuples qui pointent vers des ressources supprimées
async function findOrphanTuples() {
  const rebac = ReBACService.getInstance();
  const orphans = [];
  
  // Récupérer tous les tuples
  const allTuples = await rebac.tupleStore.find({});
  
  for (const tuple of allTuples) {
    // Vérifier si l'objet existe
    const objectExists = await checkResourceExists(
      tuple.object.type,
      tuple.object.id
    );
    
    if (!objectExists) {
      orphans.push(tuple);
    }
  }
  
  console.log(`Found ${orphans.length} orphan tuples`);
  return orphans;
}

// Nettoyer les orphelins
async function cleanupOrphanTuples() {
  const orphans = await findOrphanTuples();
  
  for (const tuple of orphans) {
    await rebac.delete({ id: tuple.id });
    console.log(`Deleted orphan tuple: ${tuple.id}`);
  }
}
```

### Analyser les performances

```typescript
// Mesurer le temps de résolution
async function benchmarkCheck(
  subject: string,
  permission: string,
  object: string,
  iterations: number = 100
) {
  const rebac = ReBACService.getInstance();
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await rebac.check(subject, permission, object);
    const duration = Date.now() - start;
    times.push(duration);
  }
  
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];
  const p99 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.99)];
  
  console.log(`\n=== Benchmark Results (${iterations} iterations) ===`);
  console.log(`Average: ${avg.toFixed(2)}ms`);
  console.log(`P95: ${p95}ms`);
  console.log(`P99: ${p99}ms`);
  console.log(`Min: ${Math.min(...times)}ms`);
  console.log(`Max: ${Math.max(...times)}ms`);
}

// Utilisation
await benchmarkCheck('user:123', 'view', 'event:456', 1000);
```

Ces exemples couvrent les cas d'usage les plus courants et montrent comment intégrer ReBAC dans AttendanceX de manière pratique et performante.
