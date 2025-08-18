# Guide d'Intégration Frontend - Flows d'Authentification et d'Organisation

## 🎯 Vue d'Ensemble

Ce guide explique comment intégrer les nouveaux flows d'authentification et de configuration d'organisation dans le frontend.

## 🔄 Flow Complet d'Enregistrement et Configuration

### 1. **Enregistrement d'un Utilisateur**

```typescript
// types/auth.ts
interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organization: string; // Nom de l'organisation
}

interface RegisterResponse {
  success: boolean;
  message: string;
  data: {
    email: string;
    userId: string;
    verificationSent: boolean;
    expiresIn?: string;
    canResend?: boolean;
  };
  warning?: string;
}

// services/authService.ts
export const register = async (data: RegisterRequest): Promise<RegisterResponse> => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error('Erreur lors de l\'enregistrement');
  }
  
  return response.json();
};

// components/RegisterForm.tsx
const handleRegister = async (formData: RegisterRequest) => {
  try {
    const result = await register(formData);
    
    if (result.success) {
      // Rediriger vers la page de vérification d'email
      router.push('/auth/verify-email-sent', {
        query: { email: formData.email }
      });
    }
  } catch (error) {
    setError('Erreur lors de l\'enregistrement');
  }
};
```

### 2. **Vérification d'Email**

```typescript
// pages/auth/verify-email-sent.tsx
const VerifyEmailSentPage = () => {
  const router = useRouter();
  const { email } = router.query;

  return (
    <div className="verify-email-container">
      <h1>📧 Vérifiez votre email</h1>
      <p>
        Un email de vérification a été envoyé à <strong>{email}</strong>
      </p>
      <p>
        Cliquez sur le lien dans l'email pour activer votre compte.
      </p>
      <div className="actions">
        <button onClick={() => router.push('/auth/login')}>
          Aller à la connexion
        </button>
        <button onClick={handleResendEmail}>
          Renvoyer l'email
        </button>
      </div>
    </div>
  );
};

// Le lien dans l'email redirige vers GET /auth/verify-email?token=xxx
// qui affiche une page HTML avec redirection automatique vers /login
```

### 3. **Connexion avec Détection du Statut d'Organisation**

```typescript
// types/auth.ts
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  needsOrganization: boolean;
  organizationSetupRequired: boolean;
  organizationSetupStatus: {
    needsSetup: boolean;
    organizationId?: string;
    organizationName?: string;
  };
  permissions: Record<string, boolean>;
  sessionId: string;
}

// services/authService.ts
export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error('Erreur lors de la connexion');
  }
  
  return response.json();
};

// components/LoginForm.tsx
const handleLogin = async (formData: LoginRequest) => {
  try {
    const result = await login(formData);
    
    if (result.success) {
      // Stocker le token
      localStorage.setItem('token', result.data.token);
      localStorage.setItem('refreshToken', result.data.refreshToken);
      
      // Vérifier si l'organisation a besoin d'être configurée
      if (result.data.organizationSetupStatus?.needsSetup) {
        router.push('/organization/setup', {
          query: { 
            organizationId: result.data.organizationSetupStatus.organizationId,
            organizationName: result.data.organizationSetupStatus.organizationName
          }
        });
      } else if (result.data.needsOrganization) {
        // L'utilisateur n'a pas d'organisation du tout
        router.push('/organization/create');
      } else {
        // Tout est configuré, aller au dashboard
        router.push('/dashboard');
      }
    }
  } catch (error) {
    setError('Erreur lors de la connexion');
  }
};
```

### 4. **Page de Configuration d'Organisation**

```typescript
// types/organization.ts
interface OrganizationSetupRequest {
  displayName?: string;
  description?: string;
  sector: 'education' | 'healthcare' | 'corporate' | 'government' | 'non_profit' | 
         'technology' | 'finance' | 'retail' | 'manufacturing' | 'hospitality' | 
         'consulting' | 'other';
  contactInfo: {
    email: string;
    phone?: string;
    website?: string;
    address?: {
      street: string;
      city: string;
      state?: string;
      postalCode: string;
      country: string;
    };
  };
  settings?: {
    timezone?: string;
    language?: string;
    workingHours?: {
      start: string;
      end: string;
      workingDays: number[];
    };
  };
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    logoUrl?: string;
  };
}

// services/organizationService.ts
export const completeOrganizationSetup = async (
  organizationId: string, 
  data: OrganizationSetupRequest
): Promise<any> => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`/api/organizations/${organizationId}/complete-setup`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error('Erreur lors de la configuration');
  }
  
  return response.json();
};

// pages/organization/setup.tsx
const OrganizationSetupPage = () => {
  const router = useRouter();
  const { organizationId, organizationName } = router.query;
  const [formData, setFormData] = useState<OrganizationSetupRequest>({
    sector: 'other',
    contactInfo: { email: '' }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await completeOrganizationSetup(
        organizationId as string, 
        formData
      );
      
      if (result.success) {
        // Configuration terminée, rediriger vers le dashboard
        router.push('/dashboard');
      }
    } catch (error) {
      setError('Erreur lors de la configuration');
    }
  };

  return (
    <div className="organization-setup">
      <h1>🏢 Configurez votre organisation</h1>
      <p>Complétez les informations de <strong>{organizationName}</strong></p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Nom d'affichage</label>
          <input
            type="text"
            value={formData.displayName || ''}
            onChange={(e) => setFormData({
              ...formData,
              displayName: e.target.value
            })}
            placeholder="Nom complet de votre organisation"
          />
        </div>

        <div className="form-group">
          <label>Secteur d'activité *</label>
          <select
            value={formData.sector}
            onChange={(e) => setFormData({
              ...formData,
              sector: e.target.value as any
            })}
            required
          >
            <option value="technology">Technologie</option>
            <option value="healthcare">Santé</option>
            <option value="education">Éducation</option>
            <option value="finance">Finance</option>
            <option value="retail">Commerce</option>
            <option value="other">Autre</option>
          </select>
        </div>

        <div className="form-group">
          <label>Email de contact *</label>
          <input
            type="email"
            value={formData.contactInfo.email}
            onChange={(e) => setFormData({
              ...formData,
              contactInfo: {
                ...formData.contactInfo,
                email: e.target.value
              }
            })}
            required
          />
        </div>

        <div className="form-group">
          <label>Téléphone</label>
          <input
            type="tel"
            value={formData.contactInfo.phone || ''}
            onChange={(e) => setFormData({
              ...formData,
              contactInfo: {
                ...formData.contactInfo,
                phone: e.target.value
              }
            })}
          />
        </div>

        <button type="submit" className="btn-primary">
          Terminer la configuration
        </button>
      </form>
    </div>
  );
};
```

### 5. **Hook pour Vérifier le Statut d'Organisation**

```typescript
// hooks/useOrganizationStatus.ts
export const useOrganizationStatus = () => {
  const [status, setStatus] = useState<{
    needsSetup: boolean;
    organizationId?: string;
    organizationName?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/auth/organization-setup-status', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const result = await response.json();
          setStatus(result.data);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du statut:', error);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, []);

  return { status, loading };
};

// components/ProtectedRoute.tsx
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const { status, loading } = useOrganizationStatus();

  useEffect(() => {
    if (!loading && status?.needsSetup) {
      router.push('/organization/setup', {
        query: {
          organizationId: status.organizationId,
          organizationName: status.organizationName
        }
      });
    }
  }, [status, loading, router]);

  if (loading) {
    return <div>Chargement...</div>;
  }

  if (status?.needsSetup) {
    return null; // Redirection en cours
  }

  return <>{children}</>;
};
```

## 🎨 Composants UI Recommandés

### 1. **Composant de Notification**

```typescript
// components/Notification.tsx
interface NotificationProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ type, message, onClose }) => {
  return (
    <div className={`notification notification-${type}`}>
      <span>{message}</span>
      <button onClick={onClose}>×</button>
    </div>
  );
};
```

### 2. **Composant de Chargement**

```typescript
// components/LoadingSpinner.tsx
const LoadingSpinner: React.FC<{ message?: string }> = ({ message }) => {
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      {message && <p>{message}</p>}
    </div>
  );
};
```

## 🚀 Routing Recommandé

```typescript
// routes/index.ts
const routes = [
  // Authentification
  { path: '/auth/register', component: RegisterPage },
  { path: '/auth/login', component: LoginPage },
  { path: '/auth/verify-email-sent', component: VerifyEmailSentPage },
  
  // Organisation
  { path: '/organization/setup', component: OrganizationSetupPage },
  { path: '/organization/create', component: OrganizationCreatePage },
  
  // Application protégée
  { 
    path: '/dashboard', 
    component: DashboardPage,
    wrapper: ProtectedRoute 
  },
  { 
    path: '/events', 
    component: EventsPage,
    wrapper: ProtectedRoute 
  },
];
```

## ✅ Checklist d'Intégration

### Phase 1 : Authentification de Base
- [ ] Implémenter le formulaire d'enregistrement
- [ ] Implémenter le formulaire de connexion
- [ ] Gérer les tokens JWT (stockage, refresh)
- [ ] Implémenter la page de vérification d'email

### Phase 2 : Gestion d'Organisation
- [ ] Implémenter la détection du statut d'organisation après login
- [ ] Créer la page de configuration d'organisation
- [ ] Implémenter le hook `useOrganizationStatus`
- [ ] Créer le composant `ProtectedRoute`

### Phase 3 : UX et Polish
- [ ] Ajouter les notifications de succès/erreur
- [ ] Implémenter les états de chargement
- [ ] Ajouter la validation côté client
- [ ] Tester tous les flows end-to-end

## 🧪 Tests Recommandés

```typescript
// tests/auth.test.ts
describe('Authentication Flow', () => {
  test('should register user and redirect to email verification', async () => {
    // Test d'enregistrement
  });

  test('should login and redirect based on organization status', async () => {
    // Test de connexion avec différents statuts d'organisation
  });

  test('should complete organization setup', async () => {
    // Test de configuration d'organisation
  });
});
```

## 📱 Responsive Design

Assurez-vous que tous les formulaires et pages sont responsive :

```css
/* styles/auth.css */
.auth-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
}

.organization-setup {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
}

@media (max-width: 768px) {
  .auth-container,
  .organization-setup {
    padding: 1rem;
    margin: 0 1rem;
  }
}
```

## 🎯 Points Clés à Retenir

1. **Toujours vérifier le statut d'organisation** après la connexion
2. **Gérer les états de chargement** pour une meilleure UX
3. **Implémenter une gestion d'erreurs robuste**
4. **Tester tous les cas de figure** (première connexion, organisation existante, etc.)
5. **Prévoir les cas d'erreur réseau** et les retry automatiques