# Integration Testing

Guide des tests d'intégration.

## Vue d'ensemble

Les tests d'intégration valident l'interaction entre différents composants du système.

## Configuration

### Firebase Emulators
```bash
# Démarrer les émulateurs
firebase emulators:start --only firestore,functions

# Exécuter les tests
npm run test:integration
```

### Setup des tests
```typescript
beforeAll(async () => {
  // Initialiser les émulateurs
  await initializeTestEnvironment({
    projectId: 'test-project',
    firestore: {
      host: 'localhost',
      port: 8080
    }
  });
});

afterEach(async () => {
  // Nettoyer les données de test
  await clearFirestoreData({ projectId: 'test-project' });
});
```

## Types de tests

### Service Integration
```typescript
describe('PresenceService Integration', () => {
  it('should create presence and trigger notifications', async () => {
    // Arrange
    const user = await createTestUser();
    const organization = await createTestOrganization();
    
    // Act
    const presence = await presenceService.createPresence({
      userId: user.id,
      organizationId: organization.id
    });
    
    // Assert
    expect(presence).toBeDefined();
    
    // Vérifier les effets de bord
    const notifications = await getNotifications(user.id);
    expect(notifications).toHaveLength(1);
  });
});
```

### API Integration
```typescript
describe('Presence API', () => {
  it('should handle complete presence workflow', async () => {
    // Setup
    const app = createTestApp();
    const token = await getAuthToken();
    
    // Check-in
    const checkInResponse = await request(app)
      .post('/api/presence')
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'checkin' });
    
    expect(checkInResponse.status).toBe(201);
    
    // Check-out
    const checkOutResponse = await request(app)
      .put(`/api/presence/${checkInResponse.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'checkout' });
    
    expect(checkOutResponse.status).toBe(200);
  });
});
```

### Database Integration
```typescript
describe('Firestore Integration', () => {
  it('should maintain data consistency across collections', async () => {
    // Créer une organisation
    const org = await firestoreService.create('organizations', {
      name: 'Test Org',
      memberCount: 0
    });
    
    // Ajouter un membre
    await firestoreService.create('users', {
      organizationId: org.id,
      name: 'Test User'
    });
    
    // Vérifier la mise à jour du compteur
    const updatedOrg = await firestoreService.get('organizations', org.id);
    expect(updatedOrg.memberCount).toBe(1);
  });
});
```

## Données de test

### Fixtures
```typescript
export const testFixtures = {
  user: {
    id: 'test-user-1',
    email: 'test@example.com',
    name: 'Test User'
  },
  organization: {
    id: 'test-org-1',
    name: 'Test Organization',
    settings: {
      requireLocation: true
    }
  }
};
```

### Factories
```typescript
export class TestDataFactory {
  static createUser(overrides = {}) {
    return {
      id: generateId(),
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
      ...overrides
    };
  }
  
  static createOrganization(overrides = {}) {
    return {
      id: generateId(),
      name: `Test Org ${Date.now()}`,
      ...overrides
    };
  }
}
```

## Bonnes pratiques

- Utiliser des émulateurs pour l'isolation
- Nettoyer les données après chaque test
- Tester les cas d'erreur et les edge cases
- Valider les effets de bord
- Utiliser des données déterministes