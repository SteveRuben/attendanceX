# Tests Frontend - AttendanceX

Ce dossier contient tous les tests pour le frontend AttendanceX.

## Structure

```
frontend/tests/
├── e2e/                 # Tests End-to-End
├── unit/               # Tests unitaires
│   ├── components/     # Tests des composants
│   └── pages/         # Tests des pages
└── README.md          # Ce fichier
```

## Types de Tests

### Tests End-to-End (`e2e/`)
Tests qui simulent l'interaction complète de l'utilisateur avec l'application.

- **organization-membership-flow.e2e.test.ts** - Tests du flux complet d'appartenance aux organisations

### Tests Unitaires (`unit/`)
Tests isolés des composants et pages individuelles.

#### Composants (`unit/components/`)
- **OrganizationSetup.error-handling.test.tsx** - Tests de gestion d'erreurs du composant OrganizationSetup

#### Pages (`unit/pages/`)
- **Dashboard.error-handling.test.tsx** - Tests de gestion d'erreurs de la page Dashboard

## Exécution des Tests

```bash
# Tous les tests frontend
cd frontend
npm test

# Tests E2E seulement
npm test -- tests/e2e/

# Tests unitaires seulement
npm test -- tests/unit/

# Test spécifique
npm test -- tests/unit/components/OrganizationSetup.error-handling.test.tsx

# Mode watch
npm test -- --watch

# Avec couverture
npm run test:coverage
```

## Configuration

Les tests utilisent :
- **Vitest** comme framework de test
- **Testing Library** pour les tests de composants React
- **jsdom** comme environnement de test
- **Mocks** pour les services et hooks

## Bonnes Pratiques

1. **Comportement utilisateur** - Tester ce que l'utilisateur voit et fait
2. **Accessibilité** - Utiliser les queries accessibles (getByRole, getByLabelText)
3. **Attente asynchrone** - Utiliser waitFor pour les opérations async
4. **Isolation** - Mocker les dépendances externes
5. **Nettoyage** - Nettoyer les mocks entre les tests

## Mocks Communs

### Services
```typescript
vi.mock('../services', () => ({
  userService: {
    getUserOrganizations: vi.fn(),
  },
  organizationService: {
    createOrganization: vi.fn(),
  }
}));
```

### Hooks d'authentification
```typescript
vi.mock('../hooks/use-auth', () => ({
  useAuth: () => ({
    user: { uid: 'test-user', email: 'test@example.com' }
  })
}));
```

### Navigation
```typescript
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});
```

## Patterns de Test

### Test de Composant Basique
```typescript
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MyComponent from '../MyComponent';

const renderComponent = (props = {}) => {
  return render(
    <BrowserRouter>
      <MyComponent {...props} />
    </BrowserRouter>
  );
};

describe('MyComponent', () => {
  it('should render correctly', () => {
    renderComponent();
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### Test d'Interaction
```typescript
import { fireEvent, waitFor } from '@testing-library/react';

it('should handle button click', async () => {
  renderComponent();
  
  const button = screen.getByRole('button', { name: /click me/i });
  fireEvent.click(button);
  
  await waitFor(() => {
    expect(screen.getByText('Success')).toBeInTheDocument();
  });
});
```

### Test de Gestion d'Erreurs
```typescript
it('should display error message on failure', async () => {
  vi.mocked(myService.myMethod).mockRejectedValue(new Error('Test error'));
  
  renderComponent();
  
  await waitFor(() => {
    expect(screen.getByText(/test error/i)).toBeInTheDocument();
  });
});
```

## Ajout de Nouveaux Tests

1. Créer le fichier dans la bonne structure (`e2e/`, `unit/components/`, `unit/pages/`)
2. Suivre la convention de nommage : `*.test.tsx` ou `*.test.ts`
3. Utiliser les patterns établis pour les mocks
4. Tester les comportements utilisateur, pas l'implémentation
5. Ajouter des tests pour les cas d'erreur

## Débogage

### Afficher le DOM rendu
```typescript
import { screen } from '@testing-library/react';

// Afficher le DOM complet
screen.debug();

// Afficher un élément spécifique
screen.debug(screen.getByTestId('my-element'));
```

### Logs des mocks
```typescript
// Vérifier les appels aux mocks
expect(myMock).toHaveBeenCalledWith(expectedArgs);
expect(myMock).toHaveBeenCalledTimes(1);

// Voir tous les appels
console.log(myMock.mock.calls);
```

### Mode interactif
```bash
# Lancer les tests en mode watch
npm test -- --watch

# Lancer un test spécifique en mode watch
npm test -- --watch tests/unit/components/MyComponent.test.tsx
```

## Couverture de Code

```bash
# Générer le rapport de couverture
npm run test:coverage

# Ouvrir le rapport HTML
open coverage/index.html
```

Objectifs de couverture :
- **Lignes** : 80%+
- **Fonctions** : 80%+
- **Branches** : 80%+
- **Statements** : 80%+