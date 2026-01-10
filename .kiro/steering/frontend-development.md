---
inclusion: fileMatch
fileMatchPattern: "frontend-v2/**/*"
---

# Guide de Développement Frontend - AttendanceX

Ce document fournit des directives spécifiques pour le développement frontend avec Next.js et React dans le projet AttendanceX.

## Architecture Frontend

### Structure des Composants
```
src/
├── components/
│   ├── ui/              # Composants de base réutilisables
│   ├── forms/           # Formulaires spécifiques
│   ├── layout/          # Layout et navigation
│   ├── auth/            # Composants d'authentification
│   ├── dashboard/       # Composants du tableau de bord
│   └── [feature]/       # Composants par fonctionnalité
├── pages/
│   ├── api/             # API routes Next.js (si nécessaire)
│   ├── app/             # Pages de l'application
│   ├── auth/            # Pages d'authentification
│   └── onboarding/      # Pages d'onboarding
├── hooks/               # Hooks React personnalisés
├── services/            # Services API
├── utils/               # Utilitaires
├── types/               # Types TypeScript
└── contexts/            # Contextes React
```

### Conventions de Nommage
- **Composants** : PascalCase (`UserProfile.tsx`)
- **Hooks** : camelCase avec préfixe `use` (`useUsers.ts`)
- **Services** : camelCase avec suffixe `Service` (`usersService.ts`)
- **Types** : PascalCase avec suffixe approprié (`User.types.ts`)
- **Utilitaires** : camelCase (`formatDate.ts`)

## Développement de Composants

### Structure d'un Composant
```typescript
// components/users/UserCard.tsx
import React from 'react';
import { User } from '@/types/user.types';
import { Button } from '@/components/ui/Button';

interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
  onDelete?: (userId: string) => void;
  className?: string;
}

export const UserCard: React.FC<UserCardProps> = ({
  user,
  onEdit,
  onDelete,
  className = ''
}) => {
  const handleEdit = () => {
    onEdit?.(user);
  };

  const handleDelete = () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      onDelete?.(user.id);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{user.name}</h3>
          <p className="text-gray-600">{user.email}</p>
          <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
            {user.role}
          </span>
        </div>
        <div className="flex gap-2">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={handleEdit}>
              Modifier
            </Button>
          )}
          {onDelete && (
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              Supprimer
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
```

### Composants UI Réutilisables
```typescript
// components/ui/Button.tsx
import React from 'react';
import { cn } from '@/utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = 'default',
  size = 'default',
  loading = false,
  disabled,
  children,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50';
  
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
    outline: 'border border-gray-300 bg-white hover:bg-gray-50',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    ghost: 'hover:bg-gray-100'
  };
  
  const sizes = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 px-3',
    lg: 'h-11 px-8'
  };

  return (
    <button
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};
```

## Hooks Personnalisés

### Hook de Gestion d'État
```typescript
// hooks/useUsers.ts
import { useState, useEffect, useCallback } from 'react';
import { User } from '@/types/user.types';
import { usersService } from '@/services/usersService';
import { useToast } from '@/hooks/useToast';

interface UseUsersReturn {
  users: User[];
  loading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  createUser: (userData: CreateUserRequest) => Promise<void>;
  updateUser: (id: string, userData: UpdateUserRequest) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

export const useUsers = (): UseUsersReturn => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await usersService.getUsers();
      setUsers(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createUser = useCallback(async (userData: CreateUserRequest) => {
    try {
      const newUser = await usersService.createUser(userData);
      setUsers(prev => [...prev, newUser]);
      toast.success('Utilisateur créé avec succès');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la création';
      toast.error(errorMessage);
      throw err;
    }
  }, [toast]);

  const updateUser = useCallback(async (id: string, userData: UpdateUserRequest) => {
    try {
      const updatedUser = await usersService.updateUser(id, userData);
      setUsers(prev => prev.map(user => user.id === id ? updatedUser : user));
      toast.success('Utilisateur mis à jour avec succès');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
      toast.error(errorMessage);
      throw err;
    }
  }, [toast]);

  const deleteUser = useCallback(async (id: string) => {
    try {
      await usersService.deleteUser(id);
      setUsers(prev => prev.filter(user => user.id !== id));
      toast.success('Utilisateur supprimé avec succès');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression';
      toast.error(errorMessage);
      throw err;
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser
  };
};
```

### Hook de Formulaire
```typescript
// hooks/useForm.ts
import { useState, useCallback } from 'react';

interface UseFormOptions<T> {
  initialValues: T;
  validate?: (values: T) => Record<string, string>;
  onSubmit: (values: T) => Promise<void> | void;
}

export const useForm = <T extends Record<string, any>>({
  initialValues,
  validate,
  onSubmit
}: UseFormOptions<T>) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    // Effacer l'erreur du champ modifié
    if (errors[name as string]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    // Validation
    if (validate) {
      const validationErrors = validate(values);
      setErrors(validationErrors);
      
      if (Object.keys(validationErrors).length > 0) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validate, onSubmit]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    isSubmitting,
    setValue,
    handleSubmit,
    reset
  };
};
```

## Services API

### Service de Base
```typescript
// services/apiClient.ts
class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(response.status, errorData.error?.message || 'Erreur réseau');
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint);
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient(process.env.NEXT_PUBLIC_API_URL || '');
```

### Service Spécifique
```typescript
// services/usersService.ts
import { apiClient } from './apiClient';
import { User, CreateUserRequest, UpdateUserRequest } from '@/types/user.types';

export const usersService = {
  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
  }): Promise<User[]> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.role) searchParams.set('role', params.role);
    
    const query = searchParams.toString();
    const endpoint = `/api/users${query ? `?${query}` : ''}`;
    
    const response = await apiClient.get<{ data: User[] }>(endpoint);
    return response.data;
  },

  async getUserById(id: string): Promise<User> {
    const response = await apiClient.get<{ data: User }>(`/api/users/${id}`);
    return response.data;
  },

  async createUser(userData: CreateUserRequest): Promise<User> {
    const response = await apiClient.post<{ data: User }>('/api/users', userData);
    return response.data;
  },

  async updateUser(id: string, userData: UpdateUserRequest): Promise<User> {
    const response = await apiClient.put<{ data: User }>(`/api/users/${id}`, userData);
    return response.data;
  },

  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(`/api/users/${id}`);
  }
};
```

## Gestion d'État Global

### Contexte React
```typescript
// contexts/TenantContext.tsx
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Tenant } from '@/types/tenant.types';
import { tenantService } from '@/services/tenantService';

interface TenantState {
  currentTenant: Tenant | null;
  loading: boolean;
  error: string | null;
}

type TenantAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_TENANT'; payload: Tenant }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_TENANT' };

const initialState: TenantState = {
  currentTenant: null,
  loading: false,
  error: null,
};

const tenantReducer = (state: TenantState, action: TenantAction): TenantState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_TENANT':
      return { ...state, currentTenant: action.payload, loading: false, error: null };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'CLEAR_TENANT':
      return { ...state, currentTenant: null, error: null };
    default:
      return state;
  }
};

const TenantContext = createContext<{
  state: TenantState;
  dispatch: React.Dispatch<TenantAction>;
} | null>(null);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(tenantReducer, initialState);

  const value = { state, dispatch };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
```

## Gestion des Formulaires

### Formulaire avec Validation
```typescript
// components/forms/UserForm.tsx
import React from 'react';
import { useForm } from '@/hooks/useForm';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface UserFormData {
  name: string;
  email: string;
  role: string;
}

interface UserFormProps {
  initialData?: Partial<UserFormData>;
  onSubmit: (data: UserFormData) => Promise<void>;
  onCancel?: () => void;
}

const validateUser = (values: UserFormData): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!values.name.trim()) {
    errors.name = 'Le nom est requis';
  }

  if (!values.email.trim()) {
    errors.email = 'L\'email est requis';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Format d\'email invalide';
  }

  if (!values.role) {
    errors.role = 'Le rôle est requis';
  }

  return errors;
};

export const UserForm: React.FC<UserFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel
}) => {
  const { values, errors, isSubmitting, setValue, handleSubmit } = useForm({
    initialValues: {
      name: initialData.name || '',
      email: initialData.email || '',
      role: initialData.role || '',
    },
    validate: validateUser,
    onSubmit,
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Input
          label="Nom"
          value={values.name}
          onChange={(e) => setValue('name', e.target.value)}
          error={errors.name}
          required
        />
      </div>

      <div>
        <Input
          label="Email"
          type="email"
          value={values.email}
          onChange={(e) => setValue('email', e.target.value)}
          error={errors.email}
          required
        />
      </div>

      <div>
        <Select
          label="Rôle"
          value={values.role}
          onChange={(value) => setValue('role', value)}
          error={errors.role}
          options={[
            { value: 'participant', label: 'Participant' },
            { value: 'organizer', label: 'Organisateur' },
            { value: 'admin', label: 'Administrateur' },
          ]}
          required
        />
      </div>

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        )}
        <Button type="submit" loading={isSubmitting}>
          {initialData.name ? 'Mettre à jour' : 'Créer'}
        </Button>
      </div>
    </form>
  );
};
```

## Performance et Optimisation

### Lazy Loading
```typescript
// Lazy loading des composants lourds
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const HeavyComponent = lazy(() => import('@/components/HeavyComponent'));

export const MyPage = () => {
  return (
    <div>
      <h1>Ma Page</h1>
      <Suspense fallback={<LoadingSpinner />}>
        <HeavyComponent />
      </Suspense>
    </div>
  );
};
```

### Debounce pour les Recherches
```typescript
// hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Utilisation dans un composant de recherche
const SearchComponent = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (debouncedSearchTerm) {
      // Effectuer la recherche
      performSearch(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);

  return (
    <Input
      placeholder="Rechercher..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
  );
};
```

## Gestion des Erreurs

### Boundary d'Erreur
```typescript
// components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <h2 className="text-xl font-semibold text-red-600 mb-4">
            Une erreur s'est produite
          </h2>
          <p className="text-gray-600 mb-4">
            Nous nous excusons pour ce désagrément. Veuillez rafraîchir la page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Rafraîchir la page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## Tests Frontend

### Tests de Composants
```typescript
// __tests__/components/UserCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { UserCard } from '@/components/users/UserCard';
import { User } from '@/types/user.types';

const mockUser: User = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'participant',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UserCard', () => {
  it('should render user information', () => {
    render(<UserCard user={mockUser} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('participant')).toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', () => {
    const onEdit = jest.fn();
    render(<UserCard user={mockUser} onEdit={onEdit} />);
    
    fireEvent.click(screen.getByText('Modifier'));
    expect(onEdit).toHaveBeenCalledWith(mockUser);
  });

  it('should call onDelete when delete button is clicked and confirmed', () => {
    const onDelete = jest.fn();
    window.confirm = jest.fn(() => true);
    
    render(<UserCard user={mockUser} onDelete={onDelete} />);
    
    fireEvent.click(screen.getByText('Supprimer'));
    expect(onDelete).toHaveBeenCalledWith(mockUser.id);
  });
});
```

### Tests de Hooks
```typescript
// __tests__/hooks/useUsers.test.ts
import { renderHook, act } from '@testing-library/react';
import { useUsers } from '@/hooks/useUsers';
import { usersService } from '@/services/usersService';

jest.mock('@/services/usersService');

describe('useUsers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch users on mount', async () => {
    const mockUsers = [{ id: '1', name: 'John', email: 'john@example.com' }];
    (usersService.getUsers as jest.Mock).mockResolvedValue(mockUsers);

    const { result } = renderHook(() => useUsers());

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.users).toEqual(mockUsers);
    expect(result.current.loading).toBe(false);
  });
});
```