# 🔐 Authentication Components

Ce dossier contient tous les composants liés à l'authentification pour l'application AttendanceX.

## 📁 Structure Organisée

```
auth/
├── 📄 index.ts                     # Exports centralisés
├── 📖 README.md                    # Cette documentation
│
├── 🔐 Composants Core
├── Login.tsx                       # Connexion multi-tenant
├── ForgotPassword.tsx              # Réinitialisation mot de passe
├── ResetPassword.tsx               # Définition nouveau mot de passe
├── VerifyEmail.tsx                 # Vérification email
├── VerifyEmailRequired.tsx         # Notice vérification requise
│
├── 🚀 Flow d'Onboarding
├── OnboardingFlow.tsx              # Orchestrateur principal (3 étapes)
├── InvitationAcceptance.tsx        # Acceptation invitation simplifiée
│
├── 📋 Étapes d'Onboarding
├── steps/
│   ├── OrganizationSetup.tsx       # Étape 1: Détails organisation
│   ├── PlanSelection.tsx           # Étape 2: Sélection plan
│   ├── AdminAccountSetup.tsx       # Étape 3: Compte admin
│   └── OnboardingComplete.tsx      # Étape 4: Confirmation
│
└── 🛡️ Utilitaires
    ├── ProtectedRoute.tsx          # Protection des routes
    ├── AuthRedirect.tsx            # Redirections auth
    ├── RegistrationSuccess.tsx     # Succès inscription
    └── VerificationErrorBoundary.tsx # Gestion erreurs
```

## 🎯 Utilisation des Composants

### Import Centralisé
```tsx
import { 
  Login, 
  OnboardingFlow, 
  ForgotPassword, 
  VerifyEmail,
  ProtectedRoute 
} from '../components/auth';
```

### Routes dans App.tsx
```tsx
// Routes d'authentification
<Route path="/login" element={<Login />} />
<Route path="/register" element={<OnboardingFlow />} />
<Route path="/accept-invitation" element={<InvitationAcceptance />} />
<Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/reset-password" element={<ResetPassword />} />
<Route path="/verify-email" element={<VerifyEmail />} />

// Routes protégées
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

## 🔄 Flows d'Authentification

### 1. 🆕 Nouvelle Organisation (Onboarding Complet)
```
/register → OnboardingFlow
├── Étape 1: OrganizationSetup
│   ├── Nom organisation
│   ├── Secteur d'activité
│   └── Taille entreprise
├── Étape 2: PlanSelection
│   ├── Basic (gratuit)
│   ├── Pro (payant)
│   └── Enterprise (sur mesure)
├── Étape 3: AdminAccountSetup
│   ├── Informations admin
│   ├── Email + mot de passe
│   └── Validation
└── Étape 4: OnboardingComplete
    └── Redirection → /dashboard
```

### 2. 📧 Acceptation d'Invitation (Simplifié)
```
/accept-invitation?token=xxx → InvitationAcceptance
├── Validation du token
├── Affichage détails organisation
├── Formulaire simple (username + password)
└── Création compte → /login
```

### 3. 🔑 Connexion Standard
```
/login → Login
├── Email + mot de passe
├── Sélection tenant (si multi-tenant)
└── Succès → /dashboard
```

### 4. 🔄 Réinitialisation Mot de Passe
```
/forgot-password → ForgotPassword
├── Saisie email
├── Envoi email de reset
├── Confirmation envoi
└── Utilisateur clique lien email → /reset-password

/reset-password?token=xxx → ResetPassword
├── Validation token
├── Nouveau mot de passe + confirmation
├── Indicateur force mot de passe
└── Succès → /login
```

### 5. ✅ Vérification Email
```
/verify-email?token=xxx → VerifyEmail
├── Validation token de vérification
├── Marquage email comme vérifié
└── Succès → /login ou /dashboard
```

## 🎨 Design System Unifié

### Couleurs
- **Primary**: `gray-900` (boutons principaux)
- **Accent**: `blue-600` (liens, actions secondaires)
- **Success**: `green-600` (confirmations)
- **Error**: `red-600` (erreurs)
- **Warning**: `yellow-500` (avertissements)

### Layout Commun
- **Container**: `max-w-md w-full` centré
- **Header**: Logo + titre + description
- **Card**: Fond blanc avec ombre légère
- **Boutons**: Hauteur `h-12` avec icônes Lucide
- **Responsive**: Mobile-first design

### Composants UI Utilisés
- `Card`, `CardContent`, `CardHeader`, `CardTitle`
- `Button` (variants: default, outline, destructive)
- `Input` avec icônes intégrées
- `Alert` avec variants colorés
- `Progress` pour l'onboarding
- `Select` pour les dropdowns

## 🔧 Dépendances Techniques

### UI Components
```tsx
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Progress } from '../components/ui/progress';
import { Select } from '../components/ui/select';
```

### Hooks & Contexts
```tsx
import { useAuth } from '../hooks/use-auth';
import { MultiTenantAuthProvider } from '../contexts/MultiTenantAuthContext';
```

### Navigation
```tsx
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
```

### Icons
```tsx
import { 
  Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight,
  CheckCircle, XCircle, AlertCircle, Loader2,
  Shield, Key, Building, Users, CreditCard
} from 'lucide-react';
```

## 📝 Fonctionnalités Clés

### ✅ Gestion d'État
- **Loading states** pour toutes les actions async
- **Error handling** avec messages utilisateur
- **Form validation** en temps réel
- **Success feedback** avec redirections

### ✅ Sécurité
- **Password strength** indicator
- **Token validation** pour reset/verify
- **Rate limiting** simulation
- **Secure redirects** après auth

### ✅ UX/UI
- **Progressive disclosure** (étapes onboarding)
- **Clear navigation** avec breadcrumbs
- **Responsive design** mobile-friendly
- **Accessibility** (ARIA labels, keyboard nav)

### ✅ Multi-tenant
- **Tenant selection** pour utilisateurs multi-org
- **Organization context** dans l'onboarding
- **Invitation system** avec tokens
- **Role-based access** via ProtectedRoute

## 🚀 Migration Effectuée

### ❌ Ancienne Structure (Supprimée)
```
pages/Auth/
├── Login.tsx
├── Register.tsx
├── ForgotPassword.tsx
├── ResetPassword.tsx
└── VerifyEmailRequired.tsx

pages/
├── VerifyEmail.tsx
└── AcceptInvitation.tsx

components/auth/
├── MultiTenantLoginForm.tsx
└── MultiTenantRegister.tsx
```

### ✅ Nouvelle Structure (Actuelle)
```
components/auth/
├── index.ts (exports centralisés)
├── Login.tsx (unifié)
├── OnboardingFlow.tsx (remplace Register)
├── InvitationAcceptance.tsx (remplace AcceptInvitation)
├── ForgotPassword.tsx (déplacé)
├── ResetPassword.tsx (déplacé)
├── VerifyEmail.tsx (déplacé)
├── VerifyEmailRequired.tsx (déplacé)
├── steps/ (nouveau)
└── utilitaires...
```

## 🔄 Prochaines Étapes

### 🎯 Améliorations Possibles
1. **Tests unitaires** pour chaque composant
2. **Storybook** pour documentation visuelle
3. **Internationalisation** (i18n) multilingue
4. **Analytics** tracking des conversions
5. **A/B testing** des flows d'onboarding

### 🔧 Intégrations Backend
1. **API endpoints** pour auth multi-tenant
2. **Email service** pour vérifications
3. **Payment integration** pour plans payants
4. **Audit logs** pour sécurité
5. **Rate limiting** côté serveur

---

**📞 Support**: Pour toute question sur cette structure, contactez l'équipe de développement.

**🔄 Dernière mise à jour**: Structure consolidée et documentée - Tous les fichiers d'auth sont maintenant centralisés dans `components/auth/`.