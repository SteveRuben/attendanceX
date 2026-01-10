/**
 * Utilitaires de configuration pour les tests
 */

import express, { Express } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { collections } from '../../../backend/functions/src/config/database';
import { authService } from '../../../backend/functions/src/services/auth/auth.service';
import routes from '../../../backend/functions/src/routes';
import { globalErrorHandler } from '../../../backend/functions/src/middleware/errorHandler';
import cors from 'cors';

// Test data storage
const testData = {
  users: new Map(),
  tenants: new Map(),
  tokens: new Map()
};

/**
 * Configure l'application Express pour les tests
 */
export async function setupTestApp(): Promise<Express> {
  const app = express();

  // Middleware de base
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Routes API
  app.use('/v1', routes);

  // Gestionnaire d'erreurs
  app.use(globalErrorHandler);

  return app;
}

/**
 * Nettoie les données de test
 */
export async function cleanupTestApp(): Promise<void> {
  try {
    // Nettoyer les utilisateurs de test
    for (const userId of testData.users.keys()) {
      try {
        await collections.users.doc(userId).delete();
      } catch (error) {
        console.warn(`Failed to delete test user ${userId}:`, error);
      }
    }

    // Nettoyer les tenants de test
    for (const tenantId of testData.tenants.keys()) {
      try {
        await collections.tenants.doc(tenantId).delete();
        
        // Nettoyer les memberships associés
        const memberships = await collections.tenant_memberships
          .where('tenantId', '==', tenantId)
          .get();
        
        for (const doc of memberships.docs) {
          await doc.ref.delete();
        }
      } catch (error) {
        console.warn(`Failed to delete test tenant ${tenantId}:`, error);
      }
    }

    // Nettoyer les invitations de test
    const invitations = await collections.user_invitations
      .where('tenantId', 'in', Array.from(testData.tenants.keys()))
      .get();
    
    for (const doc of invitations.docs) {
      try {
        await doc.ref.delete();
      } catch (error) {
        console.warn(`Failed to delete test invitation ${doc.id}:`, error);
      }
    }

    // Nettoyer les événements de test
    const events = await collections.events
      .where('tenantId', 'in', Array.from(testData.tenants.keys()))
      .get();
    
    for (const doc of events.docs) {
      try {
        await doc.ref.delete();
      } catch (error) {
        console.warn(`Failed to delete test event ${doc.id}:`, error);
      }
    }

    // Nettoyer les présences de test
    const attendances = await collections.attendances
      .where('tenantId', 'in', Array.from(testData.tenants.keys()))
      .get();
    
    for (const doc of attendances.docs) {
      try {
        await doc.ref.delete();
      } catch (error) {
        console.warn(`Failed to delete test attendance ${doc.id}:`, error);
      }
    }

    // Vider les caches
    testData.users.clear();
    testData.tenants.clear();
    testData.tokens.clear();

  } catch (error) {
    console.error('Error during test cleanup:', error);
  }
}

/**
 * Crée un utilisateur de test
 */
export async function createTestUser(options: {
  tenantId?: string;
  role?: string;
  applicationRole?: string;
  permissions?: Record<string, boolean>;
  email?: string;
  firstName?: string;
  lastName?: string;
} = {}): Promise<any> {
  const userId = uuidv4();
  const email = options.email || `test-${userId}@example.com`;
  
  const userData = {
    uid: userId,
    email: email,
    firstName: options.firstName || 'Test',
    lastName: options.lastName || 'User',
    displayName: `${options.firstName || 'Test'} ${options.lastName || 'User'}`,
    role: options.role || 'user',
    applicationRole: options.applicationRole || options.role || 'user',
    permissions: options.permissions || {},
    featurePermissions: [],
    status: 'active',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
    tenantId: options.tenantId || null
  };

  // Sauvegarder dans Firestore
  await collections.users.doc(userId).set(userData);

  // Si un tenant est spécifié, créer le membership
  if (options.tenantId) {
    const membershipId = uuidv4();
    const membershipData = {
      id: membershipId,
      userId: userId,
      tenantId: options.tenantId,
      role: options.role || 'user',
      permissions: options.permissions || {},
      isActive: true,
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await collections.tenant_memberships.doc(membershipId).set(membershipData);
  }

  // Stocker pour le nettoyage
  testData.users.set(userId, userData);

  return userData;
}

/**
 * Crée un tenant de test
 */
export async function createTestTenant(options: {
  name?: string;
  slug?: string;
  industry?: string;
  size?: string;
  planId?: string;
  status?: string;
} = {}): Promise<any> {
  const tenantId = uuidv4();
  const slug = options.slug || `test-tenant-${tenantId.substring(0, 8)}`;
  
  const tenantData = {
    id: tenantId,
    name: options.name || `Test Organization ${tenantId.substring(0, 8)}`,
    slug: slug,
    industry: options.industry || 'technology',
    size: options.size || '11-50',
    description: 'Test organization for automated testing',
    planId: options.planId || 'free',
    status: options.status || 'active',
    settings: {
      timezone: 'UTC',
      locale: 'en-US',
      currency: 'USD',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: 'HH:mm'
    },
    usage: {
      maxUsers: 0,
      maxEvents: 0,
      maxStorage: 0,
      apiCallsPerMonth: 0
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    onboardingCompleted: false,
    onboardingSteps: {
      welcome: false,
      organization_profile: false,
      settings: false,
      attendance_policy: false,
      user_invitations: false,
      completion: false
    }
  };

  // Sauvegarder dans Firestore
  await collections.tenants.doc(tenantId).set(tenantData);

  // Stocker pour le nettoyage
  testData.tenants.set(tenantId, tenantData);

  return tenantData;
}

/**
 * Génère un token d'authentification pour un utilisateur de test
 */
export async function getAuthToken(user: any): Promise<string> {
  try {
    // Vérifier si on a déjà un token en cache
    if (testData.tokens.has(user.uid)) {
      return testData.tokens.get(user.uid);
    }

    // Générer un nouveau token
    const token = await authService.generateAccessToken(user.uid);
    
    // Mettre en cache
    testData.tokens.set(user.uid, token);
    
    return token;
  } catch (error) {
    console.error('Error generating auth token:', error);
    throw error;
  }
}

/**
 * Crée une invitation de test
 */
export async function createTestInvitation(options: {
  tenantId: string;
  inviterId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  status?: string;
} = {} as any): Promise<any> {
  const invitationId = uuidv4();
  const email = options.email || `invitation-${invitationId}@example.com`;
  
  const invitationData = {
    id: invitationId,
    tenantId: options.tenantId,
    inviterId: options.inviterId,
    email: email,
    firstName: options.firstName || 'Invited',
    lastName: options.lastName || 'User',
    role: options.role || 'user',
    status: options.status || 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    sentAt: new Date()
  };

  // Sauvegarder dans Firestore
  await collections.user_invitations.doc(invitationId).set(invitationData);

  // Créer le token d'invitation
  const tokenId = uuidv4();
  const tokenData = {
    invitationId: invitationId,
    used: false,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  };

  await collections.invitation_tokens.doc(tokenId).set(tokenData);

  return { ...invitationData, token: tokenId };
}

/**
 * Crée un événement de test
 */
export async function createTestEvent(options: {
  tenantId: string;
  organizerId: string;
  title?: string;
  type?: string;
  startTime?: Date;
  endTime?: Date;
  status?: string;
} = {} as any): Promise<any> {
  const eventId = uuidv4();
  const startTime = options.startTime || new Date(Date.now() + 86400000); // Tomorrow
  const endTime = options.endTime || new Date(Date.now() + 90000000); // Tomorrow + 1 hour
  
  const eventData = {
    id: eventId,
    tenantId: options.tenantId,
    organizerId: options.organizerId,
    title: options.title || `Test Event ${eventId.substring(0, 8)}`,
    description: 'Test event for automated testing',
    type: options.type || 'meeting',
    status: options.status || 'scheduled',
    startTime: startTime,
    endTime: endTime,
    location: {
      type: 'physical',
      address: '123 Test Street, Test City',
      room: 'Test Room'
    },
    attendanceSettings: {
      requireCheckIn: true,
      allowLateCheckIn: true,
      graceMinutes: 15,
      trackLocation: false
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Sauvegarder dans Firestore
  await collections.events.doc(eventId).set(eventData);

  return eventData;
}

/**
 * Crée une présence de test
 */
export async function createTestAttendance(options: {
  eventId: string;
  userId: string;
  tenantId: string;
  status?: string;
  method?: string;
  checkInTime?: Date;
  checkOutTime?: Date;
} = {} as any): Promise<any> {
  const attendanceId = uuidv4();
  const checkInTime = options.checkInTime || new Date();
  
  const attendanceData = {
    id: attendanceId,
    eventId: options.eventId,
    userId: options.userId,
    tenantId: options.tenantId,
    status: options.status || 'present',
    method: options.method || 'manual',
    checkInTime: checkInTime,
    checkOutTime: options.checkOutTime || null,
    location: {
      latitude: 40.7128,
      longitude: -74.0060
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Sauvegarder dans Firestore
  await collections.attendances.doc(attendanceId).set(attendanceData);

  return attendanceData;
}

/**
 * Utilitaires pour les assertions de test
 */
export const testUtils = {
  /**
   * Vérifie qu'une réponse API a le format attendu
   */
  expectValidApiResponse(response: any, expectedStatus: number = 200) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();
    expect(typeof response.body.success).toBe('boolean');
    
    if (response.body.success) {
      expect(response.body.data).toBeDefined();
    } else {
      expect(response.body.error).toBeDefined();
    }
  },

  /**
   * Vérifie qu'une réponse paginée a le format attendu
   */
  expectValidPaginatedResponse(response: any) {
    this.expectValidApiResponse(response);
    expect(Array.isArray(response.body.data.items || response.body.data.results || response.body.data.events || response.body.data.users)).toBe(true);
    expect(response.body.data.pagination).toBeDefined();
    expect(typeof response.body.data.pagination.total).toBe('number');
    expect(typeof response.body.data.pagination.limit).toBe('number');
    expect(typeof response.body.data.pagination.offset).toBe('number');
  },

  /**
   * Vérifie qu'un objet a les propriétés requises
   */
  expectRequiredProperties(obj: any, properties: string[]) {
    for (const prop of properties) {
      expect(obj).toHaveProperty(prop);
      expect(obj[prop]).toBeDefined();
    }
  },

  /**
   * Génère des données de test aléatoires
   */
  generateRandomData: {
    email: () => `test-${uuidv4()}@example.com`,
    name: () => `Test User ${uuidv4().substring(0, 8)}`,
    slug: () => `test-${uuidv4().substring(0, 8)}`,
    title: () => `Test Title ${uuidv4().substring(0, 8)}`,
    description: () => `Test description generated at ${new Date().toISOString()}`
  }
};

/**
 * Délais d'attente pour les tests
 */
export const testTimeouts = {
  short: 5000,    // 5 secondes
  medium: 15000,  // 15 secondes
  long: 30000,    // 30 secondes
  veryLong: 60000 // 1 minute
};

/**
 * Configuration des données de test
 */
export const testConfig = {
  defaultTenant: {
    name: 'Default Test Organization',
    slug: 'default-test-org',
    industry: 'technology',
    size: '11-50'
  },
  defaultUser: {
    firstName: 'Test',
    lastName: 'User',
    role: 'user'
  },
  defaultEvent: {
    title: 'Default Test Event',
    type: 'meeting',
    duration: 3600000 // 1 hour in milliseconds
  }
};