# 🚀 Guide d'Onboarding Frontend - Attendance Management System

## 📋 Table des Matières

1. [Vue d'ensemble du Frontend](#vue-densemble-du-frontend)
2. [Architecture Frontend](#architecture-frontend)
3. [Configuration de développement](#configuration-de-développement)
4. [Structure du projet Frontend](#structure-du-projet-frontend)
5. [Composants et Pages](#composants-et-pages)
6. [État et gestion des données](#état-et-gestion-des-données)
7. [Authentification et routing](#authentification-et-routing)
8. [Tests Frontend](#tests-frontend)
9. [Build et déploiement](#build-et-déploiement)
10. [Ressources et documentation](#ressources-et-documentation)

---

## 🎯 Vue d'ensemble du Frontend

### Stack Technique Frontend
```
Framework:   React 18 + TypeScript
State Mgmt:  Redux Toolkit + RTK Query
Styling:     Tailwind CSS + Headless UI
Routing:     React Router v6
Forms:       React Hook Form + Zod
UI Library:  Custom components + Radix UI
Build:       Vite + SWC
Testing:     Vitest + Testing Library + Playwright
Deployment:  Firebase Hosting + Vercel
```

### Architecture SaaS Multi-Tenant Frontend
- **Contexte tenant** automatique dans toute l'application
- **Branding dynamique** par tenant (couleurs, logo, domaine)
- **Feature flags** basés sur le plan d'abonnement
- **Routing conditionnel** selon les permissions
- **État global** avec isolation par tenant
- **Notifications temps réel** avec branding personnalisé

### Fonctionnalités Frontend Principales
- 🔐 **Authentification complète** avec 2FA et multi-tenant
- 🏢 **Onboarding tenant** avec assistant guidé
- 💳 **Gestion des abonnements** avec interface Stripe
- 👥 **Gestion des utilisateurs** avec invitations
- 📅 **Calendrier d'événements** avec vues multiples
- ✅ **Interface de présence** avec géolocalisation
- 🔗 **Configuration des intégrations** OAuth
- 📊 **Tableaux de bord** avec analytics temps réel
- 🎨 **Personnalisation** du branding par tenant-
--

## 🏗️ Architecture Frontend

### Architecture React Multi-Tenant
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   App Router    │    │   Tenant        │    │   Auth Guard    │
│   Protected     │◄──►│   Context       │◄──►│   Permissions   │
│   Routes        │    │   Branding      │    │   Feature Gates │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Pages       │    │   Components    │    │   State Mgmt    │
│   Dashboard     │◄──►│   UI Library    │◄──►│   Redux Store   │
│   Events        │    │   Forms         │    │   API Cache     │
│   Settings      │    │   Layouts       │    │   Local State   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Couches d'Architecture Frontend

#### 1. Application Layer
- **App Router** : Routing avec protection et contexte tenant
- **Auth Guard** : Protection des routes selon les permissions
- **Error Boundaries** : Gestion des erreurs React
- **Theme Provider** : Branding dynamique par tenant

#### 2. Feature Layer
- **Pages** : Composants de page avec logique métier
- **Layouts** : Structures de mise en page réutilisables
- **Feature Components** : Composants spécifiques aux fonctionnalités
- **Hooks** : Logique réutilisable et état local

#### 3. UI Layer
- **Design System** : Composants UI cohérents
- **Forms** : Formulaires avec validation
- **Data Display** : Tableaux, graphiques, listes
- **Feedback** : Notifications, modales, tooltips

#### 4. Data Layer
- **Redux Store** : État global de l'application
- **RTK Query** : Cache et synchronisation API
- **Local Storage** : Persistance locale
- **Session Storage** : Données temporaires

---

## ⚙️ Configuration de développement

### Prérequis
```bash
# Versions requises
Node.js >= 18.0.0
npm >= 8.0.0

# Outils recommandés
VS Code + Extensions React/TypeScript
React Developer Tools (navigateur)
Redux DevTools (navigateur)
```

### Installation Frontend
```bash
# Cloner le repository
git clone <repository-url>
cd attendance-management-system

# Installer les dépendances frontend
cd frontend
npm install

# Démarrer le serveur de développement
npm run dev
```

### Variables d'Environnement Frontend
```env
# frontend/.env

# API Configuration
VITE_API_URL=http://localhost:5001/api/v1
VITE_API_TIMEOUT=30000
VITE_WS_URL=ws://localhost:5001

# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id

# Multi-Tenant Configuration
VITE_ENABLE_MULTI_TENANT=true
VITE_DEFAULT_THEME=light
VITE_ENABLE_CUSTOM_DOMAINS=true

# Stripe Configuration (Frontend)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_SUCCESS_URL=http://localhost:3000/billing/success
VITE_STRIPE_CANCEL_URL=http://localhost:3000/billing/cancel

# OAuth Configuration (Frontend)
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_MICROSOFT_CLIENT_ID=your-microsoft-client-id
VITE_SLACK_CLIENT_ID=your-slack-client-id

# Development
VITE_NODE_ENV=development
VITE_DEBUG=true
VITE_MOCK_API=false

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_INTEGRATIONS=true
VITE_ENABLE_ML_FEATURES=false
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_GEOLOCATION=true

# Performance
VITE_ENABLE_PWA=true
VITE_ENABLE_SERVICE_WORKER=true
VITE_CACHE_DURATION=300000

# Monitoring
VITE_SENTRY_DSN=your-sentry-dsn
VITE_ANALYTICS_ID=your-analytics-id
VITE_HOTJAR_ID=your-hotjar-id
```

### Démarrage du Frontend
```bash
# Développement avec hot reload
npm run dev

# Développement avec HTTPS
npm run dev:https

# Build de production
npm run build

# Preview du build
npm run preview

# Services disponibles :
# - Frontend: http://localhost:3000
# - Storybook: http://localhost:6006 (si configuré)
```

---

## 📁 Structure du projet Frontend

### Vue d'ensemble Frontend
```
frontend/
├── 📁 src/                        # Code source React
│   ├── 📁 components/             # Composants React
│   │   ├── 📁 ui/                 # Composants UI de base
│   │   ├── 📁 forms/              # Composants de formulaires
│   │   ├── 📁 layout/             # Composants de mise en page
│   │   ├── 📁 auth/               # Composants d'authentification
│   │   ├── 📁 tenant/             # Composants tenant/onboarding
│   │   ├── 📁 subscription/       # Composants abonnement
│   │   ├── 📁 dashboard/          # Composants tableau de bord
│   │   ├── 📁 events/             # Composants événements
│   │   ├── 📁 attendance/         # Composants présence
│   │   ├── 📁 users/              # Composants utilisateurs
│   │   ├── 📁 notifications/      # Composants notifications
│   │   ├── 📁 integrations/       # Composants intégrations
│   │   └── 📁 reports/            # Composants rapports
│   ├── 📁 pages/                  # Pages de l'application
│   │   ├── 📄 LoginPage.tsx       # Page de connexion
│   │   ├── 📄 RegisterPage.tsx    # Page d'inscription
│   │   ├── 📄 DashboardPage.tsx   # Tableau de bord
│   │   ├── 📄 EventsPage.tsx      # Gestion événements
│   │   ├── 📄 AttendancePage.tsx  # Gestion présence
│   │   ├── 📄 UsersPage.tsx       # Gestion utilisateurs
│   │   ├── 📄 SettingsPage.tsx    # Paramètres
│   │   └── 📄 BillingPage.tsx     # Facturation
│   ├── 📁 services/               # Services API
│   │   ├── 📄 api.service.ts      # Service API de base
│   │   ├── 📄 auth.service.ts     # Service authentification
│   │   ├── 📄 tenant.service.ts   # Service tenant
│   │   ├── 📄 user.service.ts     # Service utilisateurs
│   │   ├── 📄 event.service.ts    # Service événements
│   │   └── 📄 subscription.service.ts # Service abonnements
│   ├── 📁 store/                  # État Redux
│   │   ├── 📄 store.ts            # Configuration store
│   │   ├── 📁 slices/             # Slices Redux
│   │   │   ├── 📄 auth.slice.ts   # État authentification
│   │   │   ├── 📄 tenant.slice.ts # État tenant
│   │   │   ├── 📄 user.slice.ts   # État utilisateurs
│   │   │   └── 📄 ui.slice.ts     # État interface
│   │   └── 📁 api/                # RTK Query APIs
│   │       ├── 📄 authApi.ts      # API authentification
│   │       ├── 📄 tenantApi.ts    # API tenant
│   │       └── 📄 eventsApi.ts    # API événements
│   ├── 📁 hooks/                  # Hooks personnalisés
│   │   ├── 📄 useAuth.ts          # Hook authentification
│   │   ├── 📄 useTenant.ts        # Hook contexte tenant
│   │   ├── 📄 useApi.ts           # Hook API
│   │   ├── 📄 useLocalStorage.ts  # Hook localStorage
│   │   └── 📄 usePermissions.ts   # Hook permissions
│   ├── 📁 utils/                  # Utilitaires
│   │   ├── 📄 date.utils.ts       # Utilitaires dates
│   │   ├── 📄 format.utils.ts     # Utilitaires formatage
│   │   ├── 📄 validation.utils.ts # Utilitaires validation
│   │   └── 📄 theme.utils.ts      # Utilitaires thème
│   ├── 📁 types/                  # Types TypeScript
│   │   ├── 📄 api.types.ts        # Types API
│   │   ├── 📄 auth.types.ts       # Types authentification
│   │   ├── 📄 tenant.types.ts     # Types tenant
│   │   └── 📄 common.types.ts     # Types communs
│   ├── 📁 styles/                 # Styles CSS
│   │   ├── 📄 globals.css         # Styles globaux
│   │   ├── 📄 components.css      # Styles composants
│   │   └── 📄 utilities.css       # Utilitaires CSS
│   ├── 📁 assets/                 # Assets statiques
│   │   ├── 📁 images/             # Images
│   │   ├── 📁 icons/              # Icônes
│   │   └── 📁 fonts/              # Polices
│   ├── 📄 App.tsx                 # Composant racine
│   ├── 📄 main.tsx                # Point d'entrée
│   └── 📄 vite-env.d.ts           # Types Vite
├── 📄 package.json                # Dépendances frontend
├── 📄 vite.config.ts              # Configuration Vite
├── 📄 tailwind.config.ts          # Configuration Tailwind
├── 📄 tsconfig.json               # Configuration TypeScript
└── 📄 .env                        # Variables d'environnement
```---


## 🎨 Composants et Pages

### Système de Design

#### Composants UI de Base
```typescript
// components/ui/Button.tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

// components/ui/Input.tsx
interface InputProps {
  type: 'text' | 'email' | 'password' | 'number';
  placeholder?: string;
  error?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
}

// components/ui/Modal.tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}
```

#### Layout Components
```typescript
// components/layout/AppLayout.tsx
interface AppLayoutProps {
  children: React.ReactNode;
  sidebar?: boolean;
  header?: boolean;
  footer?: boolean;
}

// components/layout/Sidebar.tsx
interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  navigation: NavigationItem[];
}

// components/layout/Header.tsx
interface HeaderProps {
  user: User;
  tenant: Tenant;
  onTenantSwitch: (tenantId: string) => void;
  onLogout: () => void;
}
```

### Pages Principales

#### Page d'Authentification
```typescript
// pages/LoginPage.tsx
export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  
  const { login, isLoading } = useAuth();
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await login({ email, password, tenantId });
      if (result.requiresTwoFactor) {
        setShowTwoFactor(true);
      }
    } catch (error) {
      // Handle error
    }
  };
  
  return (
    <AuthLayout>
      <LoginForm
        onSubmit={handleLogin}
        loading={isLoading}
        showTwoFactor={showTwoFactor}
      />
    </AuthLayout>
  );
};
```

#### Dashboard Multi-Tenant
```typescript
// pages/DashboardPage.tsx
export const DashboardPage: React.FC = () => {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const { data: analytics } = useGetAnalyticsQuery({
    tenantId: tenant.id,
    period: 'last_30_days'
  });
  
  return (
    <AppLayout>
      <DashboardHeader tenant={tenant} user={user} />
      <DashboardGrid>
        <MetricsCards data={analytics?.metrics} />
        <RecentEvents tenantId={tenant.id} />
        <AttendanceChart data={analytics?.attendance} />
        <QuickActions tenant={tenant} />
      </DashboardGrid>
    </AppLayout>
  );
};
```

#### Gestion des Événements
```typescript
// pages/EventsPage.tsx
export const EventsPage: React.FC = () => {
  const { tenant } = useTenant();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [filters, setFilters] = useState<EventFilters>({});
  
  const { 
    data: events, 
    isLoading,
    refetch 
  } = useGetEventsQuery({
    tenantId: tenant.id,
    ...filters
  });
  
  return (
    <AppLayout>
      <EventsHeader 
        view={view} 
        onViewChange={setView}
        onFiltersChange={setFilters}
      />
      {view === 'list' ? (
        <EventsList events={events} onRefresh={refetch} />
      ) : (
        <EventsCalendar events={events} />
      )}
    </AppLayout>
  );
};
```

---

## 🔄 État et gestion des données

### Redux Store Configuration
```typescript
// store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { authApi } from './api/authApi';
import { tenantApi } from './api/tenantApi';
import { eventsApi } from './api/eventsApi';
import authSlice from './slices/auth.slice';
import tenantSlice from './slices/tenant.slice';
import uiSlice from './slices/ui.slice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    tenant: tenantSlice,
    ui: uiSlice,
    [authApi.reducerPath]: authApi.reducer,
    [tenantApi.reducerPath]: tenantApi.reducer,
    [eventsApi.reducerPath]: eventsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    })
    .concat(authApi.middleware)
    .concat(tenantApi.middleware)
    .concat(eventsApi.middleware),
});
```

### Auth Slice (Multi-Tenant)
```typescript
// store/slices/auth.slice.ts
interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  currentTenantId: string | null;
  tenantMemberships: TenantMembership[];
  permissions: string[];
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.currentTenantId = action.payload.tenantId;
      state.tenantMemberships = action.payload.memberships;
      state.permissions = action.payload.permissions;
      state.isAuthenticated = true;
      state.isLoading = false;
    },
    switchTenant: (state, action) => {
      state.currentTenantId = action.payload.tenantId;
      state.permissions = action.payload.permissions;
      state.token = action.payload.token;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.currentTenantId = null;
      state.tenantMemberships = [];
      state.permissions = [];
      state.isAuthenticated = false;
    },
  },
});
```

### RTK Query API
```typescript
// store/api/tenantApi.ts
export const tenantApi = createApi({
  reducerPath: 'tenantApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1/tenants',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      const tenantId = (getState() as RootState).auth.currentTenantId;
      
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      if (tenantId) {
        headers.set('X-Tenant-ID', tenantId);
      }
      return headers;
    },
  }),
  tagTypes: ['Tenant', 'TenantSettings', 'TenantUsers'],
  endpoints: (builder) => ({
    getTenant: builder.query<Tenant, string>({
      query: (id) => `/${id}`,
      providesTags: ['Tenant'],
    }),
    updateTenant: builder.mutation<Tenant, UpdateTenantRequest>({
      query: ({ id, ...patch }) => ({
        url: `/${id}`,
        method: 'PUT',
        body: patch,
      }),
      invalidatesTags: ['Tenant'],
    }),
    switchTenantContext: builder.mutation<TenantContext, string>({
      query: (tenantId) => ({
        url: '/switch-context',
        method: 'POST',
        body: { tenantId },
      }),
    }),
  }),
});
```

### Hooks Personnalisés
```typescript
// hooks/useTenant.ts
export const useTenant = () => {
  const dispatch = useAppDispatch();
  const { currentTenantId, tenantMemberships } = useAppSelector(state => state.auth);
  const { data: tenant } = useGetTenantQuery(currentTenantId!, {
    skip: !currentTenantId
  });
  
  const switchTenant = async (tenantId: string) => {
    try {
      const result = await dispatch(
        tenantApi.endpoints.switchTenantContext.initiate(tenantId)
      ).unwrap();
      
      dispatch(authSlice.actions.switchTenant(result));
    } catch (error) {
      console.error('Failed to switch tenant:', error);
    }
  };
  
  const hasPermission = (permission: string) => {
    const membership = tenantMemberships.find(m => m.tenantId === currentTenantId);
    return membership?.permissions.includes(permission) || false;
  };
  
  return {
    tenant,
    currentTenantId,
    tenantMemberships,
    switchTenant,
    hasPermission,
  };
};

// hooks/useAuth.ts
export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isLoading } = useAppSelector(state => state.auth);
  
  const login = async (credentials: LoginCredentials) => {
    try {
      const result = await dispatch(
        authApi.endpoints.login.initiate(credentials)
      ).unwrap();
      
      dispatch(authSlice.actions.loginSuccess(result));
      return result;
    } catch (error) {
      throw error;
    }
  };
  
  const logout = () => {
    dispatch(authSlice.actions.logout());
    // Clear local storage, redirect, etc.
  };
  
  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };
};
```

---

## 🧪 Tests Frontend

### Configuration des Tests
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});

// src/test/setup.ts
import '@testing-library/jest-dom';
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Tests de Composants
```typescript
// components/auth/LoginForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { LoginForm } from './LoginForm';
import { store } from '../../store/store';

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
};

describe('LoginForm', () => {
  it('should render login form', () => {
    renderWithProvider(<LoginForm onSubmit={jest.fn()} />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });
  
  it('should handle form submission', async () => {
    const mockSubmit = jest.fn();
    renderWithProvider(<LoginForm onSubmit={mockSubmit} />);
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });
});
```

### Tests E2E avec Playwright
```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should login with tenant context', async ({ page }) => {
    await page.goto('/login');
    
    // Fill login form
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.fill('[data-testid="tenant-input"]', 'test-tenant');
    
    // Submit form
    await page.click('[data-testid="login-button"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="tenant-name"]')).toContainText('Test Tenant');
  });
  
  test('should switch tenant context', async ({ page }) => {
    // Login first
    await page.goto('/login');
    // ... login steps
    
    // Switch tenant
    await page.click('[data-testid="tenant-switcher"]');
    await page.click('[data-testid="tenant-option-2"]');
    
    // Verify context change
    await expect(page.locator('[data-testid="tenant-name"]')).toContainText('Other Tenant');
  });
});
```

---

## 🚀 Build et déploiement

### Build de Production
```bash
# Build optimisé
npm run build

# Analyse du bundle
npm run build:analyze

# Preview du build
npm run preview
```

### Configuration Vite
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
          ui: ['@headlessui/react', '@heroicons/react']
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:5001'
    }
  }
});
```

### Déploiement Firebase Hosting
```bash
# Build et déploiement
npm run build
firebase deploy --only hosting

# Configuration firebase.json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

---

## 📚 Ressources et documentation

### Outils de Développement
- **React DevTools** : Extension navigateur pour debugging React
- **Redux DevTools** : Extension pour debugging Redux
- **Vite DevTools** : Outils de développement Vite
- **Tailwind CSS IntelliSense** : Extension VS Code

### Documentation
- **Storybook** : Documentation des composants UI
- **TypeScript** : Types et interfaces
- **API Documentation** : Swagger UI backend

### Guides et Tutoriels
- **React 18** : https://react.dev/
- **Redux Toolkit** : https://redux-toolkit.js.org/
- **Tailwind CSS** : https://tailwindcss.com/
- **Vite** : https://vitejs.dev/

### Performance et Monitoring
- **Web Vitals** : Métriques de performance
- **Lighthouse** : Audit de performance
- **Sentry** : Monitoring des erreurs
- **Analytics** : Suivi de l'utilisation