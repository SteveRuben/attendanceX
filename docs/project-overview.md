# Vue d'ensemble du projet AttendanceX

AttendanceX est une plateforme multi-tenant de **gestion d'événements avec évaluation des coûts** qui transforme la façon dont les organisations planifient, exécutent et analysent leurs événements.

## Positionnement Unique

### Focus Principal
- **Gestion d'événements** avec suivi intelligent des présences
- **Évaluation des coûts** en temps réel et calcul du ROI
- **Architecture multi-tenant** pour agences et entreprises
- **Analytics avancées** pour optimiser les performances événementielles

### Différenciation Marché
Contrairement aux solutions RH traditionnelles (BambooHR, Workday) ou aux plateformes de ticketing basiques (Eventbrite), AttendanceX se concentre sur :
- L'**analyse des coûts événementiels** avec ROI en temps réel
- La **gestion multi-client** pour les agences événementielles
- L'**open source** avec possibilité d'auto-hébergement
- Les **analytics prédictives** pour l'optimisation budgétaire

## Architecture technique

### Structure du code

```
attendance-management-system/
├── backend/
│   └── functions/
│       ├── src/
│       │   ├── controllers/      # Endpoints API
│       │   ├── services/         # Logique métier
│       │   ├── models/           # Modèles de données
│       │   ├── middleware/       # Middleware Express
│       │   ├── routes/           # Routes API
│       │   ├── utils/            # Utilitaires
│       │   ├── triggers/         # Triggers Firestore
│       │   ├── jobs/             # Tâches planifiées
│       │   └── config/           # Configuration
│       ├── lib/                  # Code compilé
│       └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/           # Composants React
│   │   ├── pages/                # Pages
│   │   ├── services/             # Services API
│   │   ├── utils/                # Utilitaires
│   │   └── styles/               # Styles
│   └── package.json
├── docs/                         # Documentation
└── tests/                        # Tests
```

### Technologies utilisées

**Backend**
- **Runtime** : Node.js 18 + TypeScript 5.3
- **Framework** : Express.js
- **Base de données** : Cloud Firestore (NoSQL)
- **Authentification** : Firebase Authentication
- **Stockage** : Firebase Storage
- **Déploiement** : Firebase Functions (serverless)

**Frontend**
- **Build tool** : Vite
- **Langage** : TypeScript
- **Styling** : TailwindCSS
- **PWA** : Service Worker

**DevOps**
- **CI/CD** : GitHub Actions
- **Monitoring** : Firebase Analytics
- **Tests** : Jest, Cypress

## Modèle de données

### Collections Firestore

#### Users
```typescript
{
  id: string,
  email: string,
  displayName: string,
  role: "super_admin" | "admin" | "organizer" | "participant",
  permissions: {
    canCreateEvents: boolean,
    canManageUsers: boolean,
    // ...
  },
  profile: {
    department: string,
    preferences: object
  },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### Events
```typescript
{
  id: string,
  title: string,
  organizerId: string,
  participants: string[],
  location: {
    type: "physical" | "virtual" | "hybrid",
    coordinates?: { latitude: number, longitude: number }
  },
  startDateTime: timestamp,
  endDateTime: timestamp,
  attendanceSettings: {
    requireGeolocation: boolean,
    checkInRadius: number,
    methods: string[]
  },
  status: "draft" | "published" | "cancelled",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### Attendances
```typescript
{
  id: string,
  eventId: string,
  userId: string,
  status: "present" | "absent" | "late" | "excused",
  method: "qr_code" | "geolocation" | "manual" | "biometric",
  checkInTime: timestamp,
  checkOutTime?: timestamp,
  validation: {
    isValidated: boolean,
    validatedBy?: string
  },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## Architecture backend

### Pattern MVC

Le backend suit une architecture en couches :

1. **Routes** : Définissent les endpoints API
2. **Controllers** : Gèrent les requêtes HTTP
3. **Services** : Contiennent la logique métier
4. **Models** : Représentent les données et leur validation

### Exemple de flux

```
Client Request
    ↓
Route (/api/events)
    ↓
Middleware (auth, validation)
    ↓
Controller (EventController.create)
    ↓
Service (EventService.create)
    ↓
Model (EventModel.validate)
    ↓
Firestore
    ↓
Response
```

### Middleware

- **auth.ts** : Authentification Firebase
- **validation.ts** : Validation des données
- **errorHandler.ts** : Gestion des erreurs
- **rateLimit.ts** : Limitation de taux

### Services principaux

- **UserService** : Gestion des utilisateurs
- **EventService** : Gestion des événements
- **AttendanceService** : Gestion des présences
- **NotificationService** : Envoi de notifications
- **SmsService** : Envoi de SMS
- **ReportService** : Génération de rapports

## Architecture frontend

### Structure des composants

```
components/
├── common/              # Composants réutilisables
│   ├── Button.tsx
│   ├── Input.tsx
│   └── Modal.tsx
├── forms/               # Formulaires
│   ├── EventForm.tsx
│   └── UserForm.tsx
└── layout/              # Layout
    ├── Header.tsx
    ├── Sidebar.tsx
    └── Footer.tsx
```

### Services API

Les services frontend communiquent avec l'API backend :

```typescript
// services/api.service.ts
export class ApiService {
  async request<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options?.headers
      }
    });
    
    if (!response.ok) {
      throw new ApiError(response.status, await response.json());
    }
    
    return response.json();
  }
}
```

## Sécurité

### Authentification

- Firebase Authentication pour la gestion des utilisateurs
- JWT tokens pour l'authentification API
- Refresh tokens pour les sessions longues

### Autorisation

- Système de rôles : super_admin, admin, organizer, participant
- Permissions granulaires par rôle
- Vérification des permissions à chaque requête

### Règles Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null 
        && (request.auth.uid == userId || hasRole('admin'));
    }
    
    match /events/{eventId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null 
        && hasPermission('canCreateEvents');
      allow update, delete: if request.auth != null 
        && (resource.data.organizerId == request.auth.uid || hasRole('admin'));
    }
  }
}
```

## Notifications

### Architecture multi-canal

Le système supporte plusieurs canaux de notification :

1. **Email** : SendGrid, Mailgun, AWS SES
2. **SMS** : Twilio, Vonage, AWS SNS
3. **Push** : Notifications navigateur
4. **In-app** : Notifications dans l'interface

### Système de templates

Les notifications utilisent des templates personnalisables :

```typescript
{
  id: "event_reminder",
  name: "Rappel d'événement",
  channels: ["email", "sms"],
  templates: {
    email: {
      subject: "Rappel : {{eventTitle}}",
      body: "Bonjour {{userName}}, ..."
    },
    sms: {
      message: "Rappel : {{eventTitle}} le {{eventDate}}"
    }
  }
}
```

### Failover automatique

Pour les SMS, le système essaie automatiquement les providers de secours en cas d'échec :

```
Twilio (priorité 1)
    ↓ (échec)
Vonage (priorité 2)
    ↓ (échec)
AWS SNS (priorité 3)
```

## Tests

### Types de tests

1. **Tests unitaires** : Services, models, utils
2. **Tests d'intégration** : API endpoints
3. **Tests E2E** : Parcours utilisateur complets

### Exécuter les tests

```bash
# Tests unitaires
npm run test

# Tests avec coverage
npm run test:coverage

# Tests E2E
npm run test:e2e
```

### Exemple de test

```typescript
describe('EventService', () => {
  it('should create an event', async () => {
    const eventData = {
      title: 'Test Event',
      organizerId: 'user123',
      startDateTime: new Date()
    };
    
    const event = await eventService.create(eventData);
    
    expect(event).toBeDefined();
    expect(event.title).toBe('Test Event');
  });
});
```

## Contribution

### Workflow de développement

1. **Fork** le repository
2. **Créer** une branche feature : `git checkout -b feature/ma-fonctionnalite`
3. **Développer** et tester localement
4. **Commit** : `git commit -m "feat: ajout de ma fonctionnalité"`
5. **Push** : `git push origin feature/ma-fonctionnalite`
6. **Pull Request** vers la branche main

### Standards de code

- **TypeScript strict** activé
- **ESLint** pour le linting
- **Prettier** pour le formatage
- **Conventional Commits** pour les messages de commit

### Convention de nommage

- **Variables/fonctions** : camelCase (`getUserById`)
- **Classes** : PascalCase (`UserService`)
- **Constantes** : SCREAMING_SNAKE_CASE (`MAX_RETRY_COUNT`)
- **Fichiers** : kebab-case (`user-service.ts`)

### Documentation du code

Utiliser JSDoc pour documenter les fonctions publiques :

```typescript
/**
 * Crée un nouvel événement
 * @param eventData - Données de l'événement
 * @returns L'événement créé
 * @throws {ValidationError} Si les données sont invalides
 */
async create(eventData: CreateEventRequest): Promise<Event> {
  // ...
}
```

## Déploiement

### Environnements

- **Development** : Émulateurs Firebase locaux
- **Staging** : Firebase project staging
- **Production** : Firebase project production

### Pipeline CI/CD

GitHub Actions automatise :
1. Tests sur chaque PR
2. Build et déploiement sur merge vers main
3. Vérification de la qualité du code

### Monitoring

- **Firebase Analytics** : Métriques d'utilisation
- **Error Reporting** : Suivi des erreurs
- **Performance Monitoring** : Performance de l'app

## Roadmap

### Version actuelle : 1.0.0
- ✅ Backend complet avec API REST
- ✅ Système SMS multi-provider
- ✅ Authentification et sécurité
- ✅ Rapports de base

### Version 1.1.0 (Q2 2024)
- 📱 Application mobile native
- 🤖 Prédictions IA
- 🔗 Intégrations calendriers
- 📊 Analytics avancées

### Version 1.2.0 (Q3 2024)
- 🌐 Mode multi-tenant
- 🔐 SSO et LDAP
- 📡 API webhooks
- 🎨 Customisation interface

## Ressources

### Documentation
- [Guide de démarrage](./getting-started.md)
- [README principal](./readme.md)

### Liens utiles
- [Firebase Documentation](https://firebase.google.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)

### Support
- GitHub Issues pour les bugs
- Discussions GitHub pour les questions
- Email : support@attendancex.com

## Licence

Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus de détails.