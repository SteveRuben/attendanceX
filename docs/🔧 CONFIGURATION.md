# Clés de chiffrement (générer avec: openssl rand -base64 32)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
ENCRYPTION_KEY=your-encryption-key-must-be-32-characters
SESSION_SECRET=your-session-secret-key-for-cookies

# Configuration sécurité
SECURITY_HEADERS_ENABLED=true
FORCE_HTTPS=true
ENABLE_CORS=true
CORS_ORIGINS=https://your-domain.com,https://admin.your-domain.com

# ===== AUTHENTICATION CONFIGURATION =====
# Authentification à deux facteurs
ENABLE_2FA=true
2FA_ISSUER=AttendanceX
2FA_WINDOW=2                           # Fenêtre de tolérance en périodes de 30s

# Politique de mots de passe
PASSWORD_MIN_LENGTH=12
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true  
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SYMBOLS=true
PASSWORD_MAX_AGE_DAYS=90              # Force changement après 90 jours

# Session et tokens
JWT_EXPIRY=24h                        # 1h | 24h | 7d
REFRESH_TOKEN_EXPIRY=7d
SESSION_TIMEOUT_MINUTES=60
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_MINUTES=30

# ===== SMS CONFIGURATION =====
# Provider principal
DEFAULT_SMS_PROVIDER=twilio           # twilio | vonage | aws_sns | custom

# Twilio Configuration
TWILIO_ACCOUNT_SID=12345fh
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567
TWILIO_WEBHOOK_URL=https://your-domain.com/api/v1/webhooks/twilio

# Vonage (ex-Nexmo) Configuration
VONAGE_API_KEY=12345678
VONAGE_API_SECRET=your_vonage_api_secret
VONAGE_BRAND_NAME=AttendanceX
VONAGE_WEBHOOK_URL=https://your-domain.com/api/v1/webhooks/vonage

# AWS SNS Configuration
AWS_ACCESS_KEY_ID=AKIA1234567890ABCDEF
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=eu-west-1
AWS_SNS_TOPIC_ARN=arn:aws:sns:eu-west-1:123456789012:attendance-notifications

# SMS Limits et configuration
SMS_RATE_LIMIT_PER_MINUTE=10
SMS_RATE_LIMIT_PER_HOUR=100
SMS_RATE_LIMIT_PER_DAY=500
SMS_MAX_LENGTH=160
SMS_RETRY_ATTEMPTS=3
SMS_RETRY_DELAY_SECONDS=30

# ===== EMAIL CONFIGURATION =====
# Provider email principal
DEFAULT_EMAIL_PROVIDER=sendgrid       # sendgrid | mailgun | ses

# SendGrid Configuration
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@your-domain.com
SENDGRID_FROM_NAME=AttendanceX
SENDGRID_TEMPLATE_ID_WELCOME=d-1234567890abcdef
SENDGRID_TEMPLATE_ID_RESET=d-abcdef1234567890

# Mailgun Configuration (alternative)
MAILGUN_API_KEY=key-1234567890abcdef1234567890abcdef
MAILGUN_DOMAIN=mg.your-domain.com
MAILGUN_FROM_EMAIL=noreply@your-domain.com

# Email limits
EMAIL_RATE_LIMIT_PER_MINUTE=50
EMAIL_RATE_LIMIT_PER_HOUR=1000
EMAIL_RATE_LIMIT_PER_DAY=10000

# ===== DATABASE CONFIGURATION =====
# Firestore settings
FIRESTORE_MAX_CONNECTIONS=100
FIRESTORE_TIMEOUT_SECONDS=60
FIRESTORE_RETRY_ATTEMPTS=3

# Cache configuration
ENABLE_CACHE=true
CACHE_TTL_SECONDS=300                 # 5 minutes
CACHE_MAX_SIZE=1000
MEMORY_CACHE_ENABLED=true
REDIS_CACHE_ENABLED=false             # Pour future intégration Redis

# ===== NOTIFICATION CONFIGURATION =====
# Notifications par défaut
DEFAULT_NOTIFICATION_CHANNELS=email,push
ENABLE_SMS_NOTIFICATIONS=true
ENABLE_PUSH_NOTIFICATIONS=true
ENABLE_EMAIL_NOTIFICATIONS=true

# Intervales de rappel par défaut (en minutes avant événement)
DEFAULT_REMINDER_INTERVALS=1440,60,15 # 24h, 1h, 15min avant

# Web Push (VAPID)
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:admin@your-domain.com

# ===== GEOLOCATION CONFIGURATION =====
# Rayon de vérification par défaut (en mètres)
DEFAULT_CHECKIN_RADIUS=100
MAX_CHECKIN_RADIUS=1000
MIN_CHECKIN_RADIUS=10

# Précision GPS requise (en mètres)
GPS_ACCURACY_THRESHOLD=50
ENABLE_LOCATION_HISTORY=true

# ===== QR CODE CONFIGURATION =====
# Expiration par défaut des codes QR (en minutes)
QR_CODE_EXPIRY_MINUTES=60
QR_CODE_SIZE=200                      # pixels
QR_CODE_ERROR_CORRECTION=M            # L|M|Q|H

# ===== FILE UPLOAD CONFIGURATION =====
# Tailles limites
MAX_FILE_SIZE_BYTES=10485760          # 10MB
MAX_PROFILE_IMAGE_SIZE=2097152        # 2MB
MAX_DOCUMENT_SIZE=10485760            # 10MB

# Types de fichiers autorisés
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp
ALLOWED_DOCUMENT_TYPES=application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document

# ===== LOGGING CONFIGURATION =====
LOG_LEVEL=info                        # debug | info | warn | error
LOG_FORMAT=json                       # json | text
ENABLE_AUDIT_LOGGING=true
AUDIT_LOG_RETENTION_DAYS=2555         # 7 ans pour conformité

# Logging externe (optionnel)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
DATADOG_API_KEY=your_datadog_api_key

# ===== PERFORMANCE CONFIGURATION =====
# Rate limiting global
GLOBAL_RATE_LIMIT_REQUESTS=1000       # Requêtes par IP par heure
GLOBAL_RATE_LIMIT_WINDOW=3600         # Fenêtre en secondes

# Timeouts
API_TIMEOUT_SECONDS=30
DATABASE_TIMEOUT_SECONDS=10
EXTERNAL_API_TIMEOUT_SECONDS=15

# Pagination
DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=100

# ===== DEVELOPMENT CONFIGURATION =====
# Émulateurs (développement seulement)
USE_FIRESTORE_EMULATOR=false
USE_AUTH_EMULATOR=false
USE_FUNCTIONS_EMULATOR=false
USE_STORAGE_EMULATOR=false

FIRESTORE_EMULATOR_HOST=localhost:8080
AUTH_EMULATOR_HOST=localhost:9099
FUNCTIONS_EMULATOR_HOST=localhost:5001
STORAGE_EMULATOR_HOST=localhost:9199

# Debug
DEBUG_MODE=false
VERBOSE_LOGGING=false
ENABLE_PROFILING=false

# ===== INTEGRATION CONFIGURATION =====
# Calendriers externes (optionnel)
GOOGLE_CALENDAR_ENABLED=false
GOOGLE_CALENDAR_CLIENT_ID=your_google_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_google_client_secret

OUTLOOK_CALENDAR_ENABLED=false
OUTLOOK_CLIENT_ID=your_outlook_client_id
OUTLOOK_CLIENT_SECRET=your_outlook_client_secret

# Slack intégration (optionnel)
SLACK_ENABLED=false
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Teams intégration (optionnel)
TEAMS_ENABLED=false
TEAMS_WEBHOOK_URL=https://your-tenant.webhook.office.com/webhookb2/your-webhook

# ===== BACKUP CONFIGURATION =====
ENABLE_AUTO_BACKUP=true
BACKUP_SCHEDULE=0 2 * * *              # Cron: tous les jours à 2h
BACKUP_RETENTION_DAYS=30
BACKUP_STORAGE_BUCKET=your-backup-bucket

# ===== COMPLIANCE CONFIGURATION =====
# RGPD
GDPR_COMPLIANCE_MODE=true
DATA_RETENTION_DAYS=2555               # 7 ans
ENABLE_DATA_EXPORT=true
ENABLE_DATA_DELETION=true

# Audit
COMPLIANCE_AUDIT_ENABLED=true
AUDIT_TRAIL_RETENTION_YEARS=10
```

## 🔥 Configuration Firebase

### 📝 **firebase.json optimisé**
```json
{
  "projects": {
    "development": "attendance-dev-12345",
    "staging": "attendance-staging-12345",
    "production": "attendance-prod-12345"
  },
  "functions": [
    {
      "source": "backend/functions",
      "codebase": "default",
      "runtime": "nodejs18",
      "predeploy": [
        "npm --prefix \"$RESOURCE_DIR\" run build"
      ],
      "env": {
        "production": {
          "FUNCTIONS_MEMORY": "2GB",
          "FUNCTIONS_TIMEOUT": "540s",
          "FUNCTIONS_MAX_INSTANCES": "100",
          "FUNCTIONS_MIN_INSTANCES": "5",
          "FUNCTIONS_CONCURRENCY": "80"
        },
        "staging": {
          "FUNCTIONS_MEMORY": "1GB", 
          "FUNCTIONS_TIMEOUT": "300s",
          "FUNCTIONS_MAX_INSTANCES": "20"
        }
      }
    }
  ],
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "hosting": {
    "public": "frontend/dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "/api/v1/**",
        "function": {
          "functionId": "api",
          "region": "europe-west1"
        }
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/api/v1/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache, no-store, must-revalidate"
          }
        ]
      },
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control", 
            "value": "max-age=31536000"
          }
        ]
      },
      {
        "source": "**",
        "headers": [
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options", 
            "value": "DENY"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          },
          {
            "key": "Strict-Transport-Security",
            "value": "max-age=31536000; includeSubDomains"
          },
          {
            "key": "Referrer-Policy",
            "value": "strict-origin-when-cross-origin"
          }
        ]
      }
    ],
    "cleanUrls": true,
    "trailingSlash": false
  },
  "emulators": {
    "auth": {
      "port": 9099
    },
    "functions": {
      "port": 5001
    },
    "firestore": {
      "port": 8080
    },
    "storage": {
      "port": 9199
    },
    "ui": {
      "enabled": true,
      "port": 4000
    },
    "singleProjectMode": true,
    "logging": {
      "level": "DEBUG"
    }
  }
}
```

### 🔒 **firestore.rules optimisées**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ===== HELPER FUNCTIONS =====
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    function hasRole(role) {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == role;
    }
    
    function hasAnyRole(roles) {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in roles;
    }
    
    function hasPermission(permission) {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.permissions[permission] == true;
    }
    
    function isWithinBusinessHours() {
      let now = request.time;
      let hour = now.hours();
      let dayOfWeek = now.dayOfWeek();
      return dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 8 && hour <= 18;
    }
    
    function isValidEmail(email) {
      return email.matches('.*@.*\\..*');
    }
    
    function isRecentRequest() {
      return request.time > resource.data.updatedAt + duration.value(5, 'm');
    }

    // ===== USERS COLLECTION =====
    match /users/{userId} {
      allow read: if isAuthenticated() && (
        isOwner(userId) || 
        hasAnyRole(['admin', 'super_admin']) ||
        hasPermission('canViewUsers')
      );
      
      allow create: if isAuthenticated() && 
        hasAnyRole(['admin', 'super_admin']) &&
        isValidUserData() &&
        isWithinBusinessHours();
      
      allow update: if isAuthenticated() && (
        (isOwner(userId) && isValidProfileUpdate()) ||
        hasAnyRole(['admin', 'super_admin'])
      ) && isRecentRequest();
      
      allow delete: if isAuthenticated() && 
        hasRole('super_admin') &&
        userId != request.auth.uid; // Cannot delete self
        
      function isValidUserData() {
        let data = request.resource.data;
        return data.keys().hasAll(['email', 'displayName', 'role']) &&
               isValidEmail(data.email) &&
               data.displayName.size() > 0 &&
               data.role in ['participant', 'organizer', 'admin'];
      }
      
      function isValidProfileUpdate() {
        let data = request.resource.data;
        return !data.diff(resource.data).affectedKeys().hasAny(['role', 'permissions', 'status']);
      }
    }

    // ===== EVENTS COLLECTION =====
    match /events/{eventId} {
      allow read: if isAuthenticated() && (
        request.auth.uid in resource.data.participants ||
        resource.data.organizerId == request.auth.uid ||
        hasAnyRole(['admin', 'super_admin']) ||
        hasPermission('canViewAllEvents')
      );
      
      allow create: if isAuthenticated() && 
        hasPermission('canCreateEvents') &&
        isValidEventData() &&
        isWithinBusinessHours();
        
      allow update: if isAuthenticated() && (
        resource.data.organizerId == request.auth.uid ||
        hasAnyRole(['admin', 'super_admin'])
      ) && isValidEventUpdate() && !isEventLocked();
      
      allow delete: if isAuthenticated() && (
        resource.data.organizerId == request.auth.uid ||
        hasRole('super_admin')
      ) && canDeleteEvent();
      
      function isValidEventData() {
        let data = request.resource.data;
        return data.title.size() > 0 &&
               data.startDateTime is timestamp &&
               data.endDateTime is timestamp &&
               data.startDateTime < data.endDateTime &&
               data.organizerId == request.auth.uid;
      }
      
      function isValidEventUpdate() {
        return request.resource.data.organizerId == resource.data.organizerId;
      }
      
      function isEventLocked() {
        return resource.data.status == 'completed' ||
               resource.data.endDateTime < request.time;
      }
      
      function canDeleteEvent() {
        return resource.data.startDateTime > request.time &&
               resource.data.status != 'completed';
      }
    }

    // ===== ATTENDANCES COLLECTION =====
    match /attendances/{attendanceId} {
      allow read: if isAuthenticated() && (
        resource.data.userId == request.auth.uid ||
        isEventOrganizer(resource.data.eventId) ||
        hasAnyRole(['admin', 'super_admin']) ||
        hasPermission('canViewReports')
      );
      
      allow create: if isAuthenticated() && 
        isValidAttendanceData() &&
        canMarkAttendance();
      
      allow update: if isAuthenticated() && 
        hasAnyRole(['organizer', 'admin', 'super_admin']) &&
        isValidAttendanceUpdate();
      
      allow delete: if isAuthenticated() && 
        hasAnyRole(['admin', 'super_admin']);
        
      function isEventOrganizer(eventId) {
        return get(/databases/$(database)/documents/events/$(eventId)).data.organizerId == request.auth.uid;
      }
      
      function isValidAttendanceData() {
        let data = request.resource.data;
        return data.eventId.size() > 0 &&
               data.userId.size() > 0 &&
               data.status in ['present', 'absent', 'excused', 'late', 'left_early'] &&
               data.method in ['qr_code', 'geolocation', 'manual', 'biometric'];
      }
      
      function canMarkAttendance() {
        let eventData = get(/databases/$(database)/documents/events/$(request.resource.data.eventId)).data;
        let now = request.time;
        return now >= eventData.startDateTime - duration.value(30, 'm') &&
               now <= eventData.endDateTime + duration.value(2, 'h');
      }
      
      function isValidAttendanceUpdate() {
        return request.resource.data.eventId == resource.data.eventId &&
               request.resource.data.userId == resource.data.userId;
      }
    }

    // ===== NOTIFICATIONS COLLECTION =====
    match /notifications/{notificationId} {
      allow read: if isAuthenticated() && 
        isOwner(resource.data.userId);
      
      allow create: if isAuthenticated() && 
        hasPermission('canSendNotifications');
      
      allow update: if isAuthenticated() && 
        isOwner(resource.data.userId) &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['read', 'readAt']);
      
      allow delete: if isAuthenticated() && (
        isOwner(resource.data.userId) ||
        hasAnyRole(['admin', 'super_admin'])
      );
    }

    // ===== SMS PROVIDERS & TEMPLATES =====
    match /smsProviders/{providerId} {
      allow read, write: if isAuthenticated() && 
        hasRole('super_admin');
    }
    
    match /smsTemplates/{templateId} {
      allow read: if isAuthenticated() && 
        hasPermission('canSendNotifications');
      
      allow write: if isAuthenticated() && 
        hasAnyRole(['admin', 'super_admin']);
    }

    // ===== AUDIT LOGS =====
    match /auditLogs/{logId} {
      allow read: if isAuthenticated() && 
        hasRole('super_admin');
      
      allow write: if false; // Système seulement
    }

    // ===== REPORTS =====
    match /reports/{reportId} {
      allow read: if isAuthenticated() && (
        resource.data.generatedBy == request.auth.uid ||
        hasAnyRole(['admin', 'super_admin'])
      );
      
      allow create: if isAuthenticated() && 
        hasPermission('canViewReports');
      
      allow delete: if isAuthenticated() && (
        resource.data.generatedBy == request.auth.uid ||
        hasRole('super_admin')
      );
    }

    // ===== DEFAULT DENY =====
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## 🎨 Configuration Frontend

### ⚡ **vite.config.ts optimisé**
```typescript
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    // Résolution des modules
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '../types': path.resolve(__dirname, '../shared/types'),
        '../constants': path.resolve(__dirname, '../shared/constants'),
        '../utils': path.resolve(__dirname, '../shared/utils')
      }
    },

    // Variables d'environnement
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },

    // Configuration développement
    server: {
      port: 3000,
      open: true,
      proxy: {
        '/api': {
          target: env.API_URL || 'http://localhost:5001',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '/api/v1')
        }
      }
    },

    // Configuration build
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks pour optimiser le cache
            vendor: ['react', 'react-dom', 'react-router-dom'],
            firebase: [
              'firebase/app', 
              'firebase/auth', 
              'firebase/firestore', 
              'firebase/storage'
            ],
            charts: ['chart.js', 'chartjs-adapter-date-fns'],
            utils: ['lodash-es', 'date-fns', 'uuid']
          }
        }
      },
      // Optimisations
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production'
        }
      },
      // Limites de taille
      chunkSizeWarningLimit: 1000,
      assetsInlineLimit: 4096
    },

    // Plugins
    plugins: [
      // PWA Configuration
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
        manifest: {
          name: 'AttendanceX',
          short_name: 'AttendanceX',
          description: 'Système de gestion des présences moderne',
          theme_color: '#2563eb',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            {
              src: '/icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/icons/icon-512.png', 
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            // Cache API calls
            {
              urlPattern: /^https:\/\/.*\.firebaseapp\.com\/api\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 // 1 hour
                },
                cacheKeyWillBeUsed: async ({ request }) => {
                  return `${request.url}?v=${__APP_VERSION__}`;
                }
              }
            },
            // Cache images
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                }
              }
            }
          ]
        }
      })
    ],

    // Optimisations CSS
    css: {
      devSourcemap: true,
      postcss: {
        plugins: [
          require('tailwindcss'),
          require('autoprefixer'),
          ...(mode === 'production' ? [require('cssnano')] : [])
        ]
      }
    },

    // Optimisations des dépendances
    optimizeDeps: {
      include: [
        'firebase/app',
        'firebase/auth', 
        'firebase/firestore',
        'firebase/storage',
        'date-fns',
        'lodash-es'
      ]
    }
  };
});
```

### 🎨 **tailwind.config.ts personnalisé**
```typescript
import type { Config } from 'tailwindcss';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,html}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Couleurs personnalisées AttendanceX
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe', 
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',  // Couleur principale
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        success: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d'
        },
        warning: {
          50: '#fffbeb', 
          500: '#f59e0b',
          600: '#d97706'
        },
        error: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626'
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb', 
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712'
        }
      },

      // Typographie
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }]
      },

      // Spacing personnalisé
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem'
      },

      // Animations personnalisées
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-out': 'fadeOut 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-gentle': 'bounceGentle 1s ease-in-out infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(-5%)', animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)' },
          '50%': { transform: 'translateY(0)', animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)' }
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' }
        }
      },

      // Ombres personnalisées
      boxShadow: {
        'soft': '0 2px 15px 0 rgba(0, 0, 0, 0.08)',
        'medium': '0 4px 25px 0 rgba(0, 0, 0, 0.1)',
        'strong': '0 10px 40px 0 rgba(0, 0, 0, 0.15)',
        'glow': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-success': '0 0 20px rgba(34, 197, 94, 0.3)',
        'glow-error': '0 0 20px rgba(239, 68, 68, 0.3)'
      },

      // Gradients
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'hero-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f3f4f6' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='3'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"
      },

      // Transitions personnalisées
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'ease-out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)'
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
    
    // Plugin personnalisé pour les composants AttendanceX
    function({ addComponents, theme }) {
      addComponents({
        // Boutons personnalisés
        '.btn-primary': {
          backgroundColor: theme('colors.brand.500'),
          color: theme('colors.white'),
          padding: `${theme('spacing.2')} ${theme('spacing.4')}`,
          borderRadius: theme('borderRadius.lg'),
          fontWeight: theme('fontWeight.medium'),
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: theme('colors.brand.600'),
            transform: 'translateY(-1px)',
            boxShadow: theme('boxShadow.medium')
          },
          '&:active': {
            transform: 'translateY(0)'
          },
          '&:disabled': {
            backgroundColor: theme('colors.gray.400'),
            cursor: 'not-allowed',
            transform: 'none'
          }
        },

        '.btn-secondary': {
          backgroundColor: theme('colors.gray.100'),
          color: theme('colors.gray.900'),
          border: `1px solid ${theme('colors.gray.300')}`,
          padding: `${theme('spacing.2')} ${theme('spacing.4')}`,
          borderRadius: theme('borderRadius.lg'),
          fontWeight: theme('fontWeight.medium'),
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: theme('colors.gray.200'),
            borderColor: theme('colors.gray.400')
          }
        },

        // Cards personnalisées
        '.card': {
          backgroundColor: theme('colors.white'),
          borderRadius: theme('borderRadius.xl'),
          boxShadow: theme('boxShadow.soft'),
          padding: theme('spacing.6'),
          border: `1px solid ${theme('colors.gray.200')}`,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: theme('boxShadow.medium'),
            transform: 'translateY(-2px)'
          }
        },

        '.card-dark': {
          backgroundColor: theme('colors.gray.800'),
          borderColor: theme('colors.gray.700'),
          color: theme('colors.gray.100')
        },

        // Status badges
        '.badge-success': {
          backgroundColor: theme('colors.success.100'),
          color: theme('colors.success.700'),
          padding: `${theme('spacing.1')} ${theme('spacing.3')}`,
          borderRadius: theme('borderRadius.full'),
          fontSize: theme('fontSize.sm'),
          fontWeight: theme('fontWeight.medium')
        },

        '.badge-warning': {
          backgroundColor: theme('colors.warning.100'),
          color: theme('colors.warning.700'),
          padding: `${theme('spacing.1')} ${theme('spacing.3')}`,
          borderRadius: theme('borderRadius.full'),
          fontSize: theme('fontSize.sm'),
          fontWeight: theme('fontWeight.medium')
        },

        '.badge-error': {
          backgroundColor: theme('colors.error.100'),
          color: theme('colors.error.700'),
          padding: `${theme('spacing.1')} ${theme('spacing.3')}`,
          borderRadius: theme('borderRadius.full'),
          fontSize: theme('fontSize.sm'),
          fontWeight: theme('fontWeight.medium')
        }
      });
    }
  ]
} satisfies Config;
```

## 📱 Configuration des providers SMS

### 📞 **Configuration Twilio**
```typescript
// backend/functions/src/config/sms-providers.ts
export const twilioConfig = {
  accountSid: process.env.TWILIO_ACCOUNT_SID!,
  authToken: process.env.TWILIO_AUTH_TOKEN!,
  phoneNumber: process.env.TWILIO_PHONE_NUMBER!,
  
  // Configuration avancée
  settings: {
    statusCallback: `${process.env.API_URL}/webhooks/twilio/status`,
    maxPrice: '0.10', // Prix maximum par SMS en USD
    validityPeriod: 14400, // 4 heures en secondes
    provideFeedback: true,
    rateLimits: {
      maxPerSecond: 1,
      maxPerMinute: 60,
      maxPerHour: 1000,
      maxPerDay: 10000
    }
  },

  // Templates de messages
  templates: {
    eventReminder: "Rappel: {eventTitle} commence dans {timeUntil}. Lieu: {location}",
    attendanceConfirmation: "Présence confirmée pour {eventTitle} le {date}",
    eventCancellation: "ANNULATION: {eventTitle} prévu le {date} a été annulé"
  }
};

### 📱 **Configuration Vonage**
```typescript
export const vonageConfig = {
  apiKey: process.env.VONAGE_API_KEY!,
  apiSecret: process.env.VONAGE_API_SECRET!,
  brandName: process.env.VONAGE_BRAND_NAME || 'AttendanceX',
  
  settings: {
    webhookUrl: `${process.env.API_URL}/webhooks/vonage`,
    defaultTtl: 86400000, // 24 heures
    type: 'unicode', // Support émojis et caractères spéciaux
    rateLimits: {
      maxPerSecond: 1,
      maxPerMinute: 50,
      maxPerHour: 500,
      maxPerDay: 5000
    }
  },

  // Configuration par pays
  countrySettings: {
    'FR': { // France
      senderId: 'AttendanceX',
      maxLength: 160,
      allowUnicode: true
    },
    'US': { // États-Unis
      senderId: process.env.VONAGE_PHONE_NUMBER,
      maxLength: 160,
      allowUnicode: false
    }
  }
};
```

### ☁️ **Configuration AWS SNS**
```typescript
export const awsSnsConfig = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  region: process.env.AWS_REGION || 'eu-west-1',
  
  settings: {
    defaultSenderId: 'AttendanceX',
    maxPrice: '0.50', // USD
    smsType: 'Transactional',
    rateLimits: {
      maxPerSecond: 1,
      maxPerMinute: 20,
      maxPerHour: 200,
      maxPerDay: 2000
    }
  },

  // Configuration par type de message
  messageAttributes: {
    reminder: {
      'AWS.SNS.SMS.SMSType': 'Transactional',
      'AWS.SNS.SMS.MaxPrice': '0.10'
    },
    urgent: {
      'AWS.SNS.SMS.SMSType': 'Transactional',
      'AWS.SNS.SMS.MaxPrice': '0.20'
    }
  }
};
```

## 📊 Configuration du monitoring

### 📈 **Configuration Firebase Analytics**
```typescript
// frontend/src/config/analytics.ts
export const analyticsConfig = {
  // Événements personnalisés AttendanceX
  events: {
    LOGIN: 'login',
    LOGOUT: 'logout',
    EVENT_CREATED: 'event_created',
    ATTENDANCE_MARKED: 'attendance_marked',
    REPORT_GENERATED: 'report_generated',
    SMS_SENT: 'sms_sent',
    ERROR_OCCURRED: 'error_occurred'
  },

  // Paramètres personnalisés
  customParameters: {
    user_role: 'user_role',
    event_type: 'event_type',
    attendance_method: 'attendance_method',
    sms_provider: 'sms_provider'
  },

  // Configuration par environnement
  environments: {
    development: {
      enabled: false,
      debugMode: true
    },
    staging: {
      enabled: true,
      debugMode: true,
      sampleRate: 100 // 100% des événements
    },
    production: {
      enabled: true,
      debugMode: false,
      sampleRate: 10 // 10% des événements pour les performances
    }
  }
};
```

### 🚨 **Configuration des alertes**
```typescript
// backend/functions/src/config/monitoring.ts
export const alertsConfig = {
  // Seuils d'alerte
  thresholds: {
    errorRate: 0.05, // 5%
    responseTime: 2000, // 2 secondes
    memoryUsage: 0.9, // 90%
    failedLogins: 10, // 10 tentatives par minute
    smsFailures: 0.1, // 10% d'échecs SMS
    storageUsage: 0.8 // 80% de l'espace utilisé
  },

  // Canaux de notification
  channels: {
    slack: {
      enabled: true,
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      channel: '#alerts-attendancex',
      username: 'AttendanceX Monitor'
    },
    email: {
      enabled: true,
      recipients: ['admin@attendancex.com', 'dev@attendancex.com'],
      severity: ['critical', 'high']
    },
    sms: {
      enabled: true,
      recipients: ['+33612345678'],
      severity: ['critical'],
      provider: 'twilio'
    }
  },

  // Escalade automatique
  escalation: {
    critical: {
      immediate: ['slack', 'sms'],
      after5min: ['email'],
      after15min: ['phone_call']
    },
    high: {
      immediate: ['slack'],
      after10min: ['email']
    },
    medium: {
      immediate: ['slack']
    }
  }
};
```

## 🔧 Scripts de configuration automatique

### 🛠️ **Script d'initialisation**
```bash
#!/bin/bash
# scripts/setup.sh

set -e

echo "🚀 Configuration initiale d'AttendanceX"

# 1. Vérification des prérequis
check_requirements() {
    echo "📋 Vérification des prérequis..."
    
    # Node.js version
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js n'est pas installé"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo "❌ Node.js version 18+ requis (version actuelle: $NODE_VERSION)"
        exit 1
    fi
    
    # Firebase CLI
    if ! command -v firebase &> /dev/null; then
        echo "📦 Installation de Firebase CLI..."
        npm install -g firebase-tools@latest
    fi
    
    echo "✅ Prérequis validés"
}

# 2. Configuration Firebase
setup_firebase() {
    echo "🔥 Configuration Firebase..."
    
    # Connexion
    if ! firebase projects:list &> /dev/null; then
        echo "🔑 Connexion à Firebase..."
        firebase login
    fi
    
    # Sélection/création du projet
    read -p "📝 ID du projet Firebase (ou tapez ENTER pour créer): " PROJECT_ID
    
    if [ -z "$PROJECT_ID" ]; then
        read -p "📝 Nom du nouveau projet: " PROJECT_NAME
        PROJECT_ID=$(echo "$PROJECT_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
        
        echo "📦 Création du projet $PROJECT_ID..."
        firebase projects:create "$PROJECT_ID" --display-name "$PROJECT_NAME"
    fi
    
    firebase use "$PROJECT_ID"
    echo "✅ Projet Firebase configuré: $PROJECT_ID"
}

# 3. Configuration des variables d'environnement
setup_environment() {
    echo "⚙️ Configuration des variables d'environnement..."
    
    if [ ! -f .env ]; then
        cp .env.example .env
        echo "📝 Fichier .env créé à partir du template"
        echo "⚠️  Veuillez éditer .env avec vos clés API"
        
        # Génération de clés sécurisées
        JWT_SECRET=$(openssl rand -base64 32)
        ENCRYPTION_KEY=$(openssl rand -base64 32)
        SESSION_SECRET=$(openssl rand -base64 32)
        
        # Mise à jour automatique des secrets
        sed -i "s/your-super-secret-jwt-key-minimum-32-characters/$JWT_SECRET/" .env
        sed -i "s/your-encryption-key-must-be-32-characters/$ENCRYPTION_KEY/" .env
        sed -i "s/your-session-secret-key-for-cookies/$SESSION_SECRET/" .env
        
        echo "🔐 Clés de sécurité générées automatiquement"
    fi
    
    # Récupération config Firebase
    echo "🔑 Récupération de la configuration Firebase..."
    firebase setup:web > firebase-config.json
    
    echo "✅ Variables d'environnement configurées"
}

# 4. Installation des dépendances
install_dependencies() {
    echo "📦 Installation des dépendances..."
    
    # Root dependencies
    npm install
    
    # Backend dependencies
    cd backend/functions
    npm install
    cd ../..
    
    # Frontend dependencies
    cd frontend
    npm install
    cd ..
    
    echo "✅ Dépendances installées"
}

# 5. Configuration de la base de données
setup_database() {
    echo "💾 Configuration de la base de données..."
    
    # Déploiement des règles et index
    firebase deploy --only firestore:rules
    firebase deploy --only firestore:indexes
    firebase deploy --only storage:rules
    
    # Création des données initiales
    echo "🌱 Création des données initiales..."
    npm run seed:initial
    
    echo "✅ Base de données configurée"
}

# 6. Tests de configuration
test_setup() {
    echo "🧪 Tests de configuration..."
    
    # Test build
    npm run build
    
    # Test linting
    npm run lint
    
    # Test sécurité
    npm audit --audit-level high
    
    echo "✅ Tests de configuration réussis"
}

# Exécution des étapes
main() {
    check_requirements
    setup_firebase
    setup_environment
    install_dependencies
    setup_database
    test_setup
    
    echo ""
    echo "🎉 Configuration d'AttendanceX terminée avec succès!"
    echo ""
    echo "📚 Prochaines étapes:"
    echo "1. Éditer .env avec vos clés API (Twilio, SendGrid, etc.)"
    echo "2. Lancer les émulateurs: npm run dev"
    echo "3. Accéder à l'application: http://localhost:3000"
    echo ""
}

main "$@"
```

### 🔧 **Script de validation**
```bash
#!/bin/bash
# scripts/validate-config.sh

echo "🔍 Validation de la configuration AttendanceX"

# Validation des variables d'environnement
validate_env() {
    echo "📋 Validation des variables d'environnement..."
    
    REQUIRED_VARS=(
        "FIREBASE_API_KEY"
        "FIREBASE_AUTH_DOMAIN" 
        "FIREBASE_PROJECT_ID"
        "JWT_SECRET"
        "ENCRYPTION_KEY"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            echo "❌ Variable manquante: $var"
            exit 1
        fi
    done
    
    echo "✅ Variables d'environnement validées"
}

# Validation Firebase
validate_firebase() {
    echo "🔥 Validation Firebase..."
    
    # Test connexion
    if ! firebase projects:list &> /dev/null; then
        echo "❌ Impossible de se connecter à Firebase"
        exit 1
    fi
    
    # Test règles Firestore
    if ! firebase firestore:rules:validate firestore.rules; then
        echo "❌ Règles Firestore invalides"
        exit 1
    fi
    
    echo "✅ Configuration Firebase valide"
}

# Validation des providers SMS
validate_sms() {
    echo "📱 Validation des providers SMS..."
    
    if [ "$DEFAULT_SMS_PROVIDER" = "twilio" ]; then
        if [ -z "$TWILIO_ACCOUNT_SID" ] || [ -z "$TWILIO_AUTH_TOKEN" ]; then
            echo "❌ Configuration Twilio incomplète"
            exit 1
        fi
    fi
    
    echo "✅ Providers SMS validés"
}

# Validation sécurité
validate_security() {
    echo "🔒 Validation sécurité..."
    
    # Longueur des clés
    if [ ${#JWT_SECRET} -lt 32 ]; then
        echo "❌ JWT_SECRET trop court (minimum 32 caractères)"
        exit 1
    fi
    
    # Audit des dépendances
    if ! npm audit --audit-level high; then
        echo "❌ Vulnérabilités de sécurité détectées"
        exit 1
    fi
    
    echo "✅ Configuration sécurité validée"
}

# Exécution
validate_env
validate_firebase  
validate_sms
validate_security

echo "🎉 Configuration entièrement validée!"
```

---

## ✅ Checklist de configuration finale

### 🔧 **Configuration de base**
- [ ] Variables d'environnement configurées (`.env`)
- [ ] Projet Firebase créé et configuré
- [ ] Dépendances installées (backend + frontend)
- [ ] Règles Firestore et Storage déployées
- [ ] Index Firestore créés

### 🔐 **Sécurité**
- [ ] Clés de chiffrement générées (JWT, Encryption, Session)
- [ ] HTTPS forcé en production
- [ ] Headers de sécurité configurés
- [ ] 2FA activé pour les comptes admin
- [ ] Audit de sécurité passé

### 📱 **Providers externes**
- [ ] Provider SMS configuré (Twilio/Vonage/AWS)
- [ ] Provider Email configuré (SendGrid/Mailgun)
- [ ] Webhooks configurés pour les callbacks
- [ ] Rate limits configurés
- [ ] Tests d'envoi réussis

### 📊 **Monitoring**
- [ ] Firebase Analytics activé
- [ ] Alertes configurées (Slack/Email/SMS)
- [ ] Logs centralisés
- [ ] Dashboards opérationnels
- [ ] Health checks fonctionnels

### 🎨 **Frontend**
- [ ] TailwindCSS configuré avec thème personnalisé
- [ ] PWA configurée (manifeste + service worker)
- [ ] Build optimisé (code splitting, compression)
- [ ] Tests E2E configurés

---

**🎊 Félicitations ! AttendanceX est maintenant entièrement configuré !**

**📚 Lectures recommandées** : [README](README.md) | [Guide Déploiement](DEPLOYMENT.md) | [Guide Sécurité](SECURITY.md)# 🔧 Guide de Configuration - AttendanceX

> ⚙️ **Guide complet** pour configurer tous les aspects d'AttendanceX, de l'installation initiale aux optimisations avancées

## 🎯 Vue d'ensemble de la configuration

AttendanceX utilise une **configuration multi-niveaux** pour s'adapter à différents environnements et cas d'usage, avec des paramètres par défaut sécurisés et des options de personnalisation étendues.

### 🏗️ **Architecture de configuration**
```
┌─────────────────────────────────────────────────────────┐
│  🌍 Environment Variables (.env)                       │
├─────────────────────────────────────────────────────────┤
│  ⚙️ Firebase Configuration (firebase.json)             │
├─────────────────────────────────────────────────────────┤
│  🔒 Security Rules (firestore.rules, storage.rules)    │
├─────────────────────────────────────────────────────────┤
│  📊 Database Configuration (indexes, collections)      │
├─────────────────────────────────────────────────────────┤
│  🎨 Frontend Configuration (vite.config.ts, etc.)     │
├─────────────────────────────────────────────────────────┤
│  📱 Provider Configurations (SMS, Email)               │
└─────────────────────────────────────────────────────────┘
```

## 🔐 Variables d'environnement

### 📝 **Template de configuration complète**
```bash
# ===== FIREBASE CONFIGURATION =====
# Récupérer depuis Firebase Console > Project Settings > General > Your apps
GOOGLE_CLOUD_PROJECT=your-project-id
FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789012
FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# ===== APPLICATION CONFIGURATION =====
NODE_ENV=production                    # development | staging | production
APP_NAME=AttendanceX
APP_VERSION=1.0.0
API_VERSION=v1

# URLs par environnement
API_URL=https://your-project.web.app/api/v1
FRONTEND_URL=https://your-domain.com
ADMIN_URL=https://admin.your-domain.com

# Région Firebase Functions
FUNCTIONS_REGION=europe-west1          # us-central1 | europe-west1 | asia-northeast1

# ===== SECURITY CONFIGURATION =====
# Clés de chiffrement (générer avec: openssl rand -base64 32)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
ENCRYPTION_KEY=your-encryption-key-must-be-32-characters
SESSION_SECRET=your-session-secret-key-