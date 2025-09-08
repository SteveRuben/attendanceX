# Database Schema

Schéma de base de données Firestore du système.

## Collections principales

### users
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'manager';
  organizationId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### organizations
```typescript
interface Organization {
  id: string;
  name: string;
  settings: OrganizationSettings;
  ownerId: string;
  members: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### presences
```typescript
interface Presence {
  id: string;
  userId: string;
  organizationId: string;
  checkIn: Timestamp;
  checkOut?: Timestamp;
  location?: GeoPoint;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Index recommandés

- `users`: `organizationId`, `email`
- `presences`: `userId`, `organizationId`, `createdAt`
- `organizations`: `ownerId`

## Règles de sécurité

Les règles Firestore garantissent que :
- Les utilisateurs ne peuvent accéder qu'aux données de leur organisation
- Seuls les admins peuvent modifier les paramètres d'organisation
- Les présences ne peuvent être modifiées que par leur propriétaire