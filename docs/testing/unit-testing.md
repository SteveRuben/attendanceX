# Unit Testing

Guide des tests unitaires.

## Principes

Les tests unitaires valident le comportement de fonctions et classes individuelles en isolation.

## Structure

### Organisation des fichiers
```
src/
├── services/
│   ├── auth.service.ts
│   └── auth.service.test.ts
└── utils/
    ├── validation.ts
    └── validation.test.ts
```

### Convention de nommage
- Fichiers de test : `*.test.ts` ou `*.spec.ts`
- Describe blocks : Nom de la classe/fonction
- Test cases : "should [behavior] when [condition]"

## Exemples

### Service Testing
```typescript
describe('AuthService', () => {
  let authService: AuthService;
  
  beforeEach(() => {
    authService = new AuthService();
  });
  
  describe('validateToken', () => {
    it('should return true for valid token', () => {
      const token = 'valid-jwt-token';
      const result = authService.validateToken(token);
      expect(result).toBe(true);
    });
    
    it('should return false for invalid token', () => {
      const token = 'invalid-token';
      const result = authService.validateToken(token);
      expect(result).toBe(false);
    });
  });
});
```

### Utility Testing
```typescript
describe('ValidationUtils', () => {
  describe('isValidEmail', () => {
    it('should return true for valid email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
    });
    
    it('should return false for invalid email', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
    });
  });
});
```

## Mocking

### External Services
```typescript
jest.mock('../services/firestore.service', () => ({
  FirestoreService: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn()
  }
}));
```

### Async Functions
```typescript
it('should handle async operations', async () => {
  const mockResult = { id: '123', name: 'Test' };
  jest.spyOn(service, 'fetchData').mockResolvedValue(mockResult);
  
  const result = await service.getData();
  expect(result).toEqual(mockResult);
});
```

## Coverage

### Objectifs
- **Statements** : > 80%
- **Branches** : > 75%
- **Functions** : > 80%
- **Lines** : > 80%

### Exclusions
- Fichiers de configuration
- Types TypeScript
- Code de test
- Mocks et stubs