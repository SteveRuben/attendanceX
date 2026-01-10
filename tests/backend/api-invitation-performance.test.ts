/**
 * Test de performance pour l'API d'invitation utilisateur
 * Teste spécifiquement l'endpoint qui pose problème dans le frontend
 */

import request from 'supertest';
import { Express } from 'express';
import { setupTestApp, cleanupTestApp, createTestUser, createTestTenant, getAuthToken } from './helpers/test-setup';

describe('Invitation API Performance Test', () => {
  let app: Express;
  let testTenant: any;
  let adminUser: any;
  let adminToken: string;

  beforeAll(async () => {
    console.log('🚀 Setting up test environment...');
    app = await setupTestApp();
    
    // Créer un tenant de test
    testTenant = await createTestTenant({
      name: 'Performance Test Org',
      slug: 'perf-test-org'
    });
    console.log('✅ Test tenant created:', testTenant.id);
    
    // Créer un utilisateur admin avec toutes les permissions
    adminUser = await createTestUser({ 
      tenantId: testTenant.id,
      role: 'admin',
      applicationRole: 'admin',
      permissions: {
        manage_users: true,
        view_all_users: true,
        invite_users: true
      },
      email: 'admin@perftest.com',
      firstName: 'Admin',
      lastName: 'User'
    });
    console.log('✅ Admin user created:', adminUser.uid);
    
    // Générer le token d'authentification
    adminToken = await getAuthToken(adminUser);
    console.log('✅ Auth token generated');
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up test environment...');
    await cleanupTestApp();
  });

  describe('Single Invitation Performance', () => {
    it('should send single invitation quickly (< 5 seconds)', async () => {
      const startTime = Date.now();
      
      const invitationData = {
        email: `perf-test-${Date.now()}@example.com`,
        firstName: 'Performance',
        lastName: 'Test',
        tenantRole: 'member', // Utiliser tenantRole au lieu de role
        department: 'Engineering',
        message: 'Welcome to our performance test!'
      };

      console.log('📤 Sending invitation request...');
      console.log('URL:', 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1/user-invitations/invite');
      console.log('Data:', invitationData);
      console.log('Headers:', {
        'Authorization': `Bearer ${adminToken.substring(0, 20)}...`,
        'X-Tenant-ID': testTenant.id
      });

      const response = await request(app)
        .post('/v1/user-invitations/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .set('Content-Type', 'application/json')
        .send(invitationData)
        .timeout(10000); // 10 secondes de timeout

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`⏱️  Request completed in ${duration}ms`);
      console.log('📥 Response status:', response.status);
      console.log('📥 Response body:', JSON.stringify(response.body, null, 2));

      // Vérifications
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.message).toContain('successfully');
      
      // Vérification de performance
      expect(duration).toBeLessThan(5000); // Moins de 5 secondes
      
      if (duration > 2000) {
        console.warn(`⚠️  Invitation took ${duration}ms - this might be too slow for frontend`);
      }
    }, 15000); // Timeout de 15 secondes pour le test

    it('should handle validation errors quickly', async () => {
      const startTime = Date.now();
      
      const invalidData = {
        email: 'invalid-email', // Email invalide
        firstName: '',          // Nom vide
        lastName: 'Test',
        tenantRole: 'invalid-role' // Rôle invalide
      };

      console.log('📤 Sending invalid invitation request...');

      const response = await request(app)
        .post('/v1/user-invitations/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .set('Content-Type', 'application/json')
        .send(invalidData)
        .timeout(5000);

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`⏱️  Validation error handled in ${duration}ms`);
      console.log('📥 Response status:', response.status);
      console.log('📥 Response body:', JSON.stringify(response.body, null, 2));

      // Les erreurs de validation doivent être rapides
      expect(duration).toBeLessThan(1000); // Moins d'1 seconde
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    }, 10000);

    it('should handle duplicate email quickly', async () => {
      const startTime = Date.now();
      
      const duplicateEmail = `duplicate-${Date.now()}@example.com`;
      
      const invitationData = {
        email: duplicateEmail,
        firstName: 'Duplicate',
        lastName: 'Test',
        tenantRole: 'member',
        department: 'Engineering'
      };

      // Première invitation (doit réussir)
      console.log('📤 Sending first invitation...');
      const firstResponse = await request(app)
        .post('/v1/user-invitations/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(invitationData)
        .timeout(10000);

      expect(firstResponse.status).toBe(201);
      console.log('✅ First invitation sent successfully');

      // Deuxième invitation (doit échouer rapidement)
      const duplicateStartTime = Date.now();
      console.log('📤 Sending duplicate invitation...');
      
      const duplicateResponse = await request(app)
        .post('/v1/user-invitations/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(invitationData)
        .timeout(5000);

      const duplicateEndTime = Date.now();
      const duplicateDuration = duplicateEndTime - duplicateStartTime;
      
      console.log(`⏱️  Duplicate check completed in ${duplicateDuration}ms`);
      console.log('📥 Duplicate response status:', duplicateResponse.status);
      console.log('📥 Duplicate response body:', JSON.stringify(duplicateResponse.body, null, 2));

      // La vérification de doublon doit être rapide
      expect(duplicateDuration).toBeLessThan(2000); // Moins de 2 secondes
      expect(duplicateResponse.status).toBe(409);
      expect(duplicateResponse.body.success).toBe(false);
      expect(duplicateResponse.body.error).toContain('exists');
    }, 20000);
  });

  describe('Bulk Invitation Performance', () => {
    it('should handle small bulk invitations (5 users) efficiently', async () => {
      const startTime = Date.now();
      
      const bulkData = {
        invitations: Array.from({ length: 5 }, (_, i) => ({
          email: `bulk-perf-${Date.now()}-${i}@example.com`,
          firstName: `Bulk${i}`,
          lastName: 'User',
          tenantRole: 'member',
          department: 'Engineering',
          isOnboardingInvitation: true // Mode onboarding pour optimisation
        })),
        customMessage: 'Welcome to our performance test!',
        sendWelcomeEmail: true
      };

      console.log('📤 Sending bulk invitation request (5 users)...');

      const response = await request(app)
        .post('/v1/user-invitations/bulk-invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(bulkData)
        .timeout(20000); // 20 secondes pour bulk

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`⏱️  Bulk invitation (5 users) completed in ${duration}ms`);
      console.log('📥 Response status:', response.status);
      console.log('📥 Response summary:', response.body.data?.summary);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.total).toBe(5);
      
      // Performance acceptable pour 5 utilisateurs
      expect(duration).toBeLessThan(15000); // Moins de 15 secondes
      
      if (duration > 10000) {
        console.warn(`⚠️  Bulk invitation took ${duration}ms - might be slow for onboarding`);
      }
    }, 25000);

    it('should timeout gracefully for large bulk requests', async () => {
      const startTime = Date.now();
      
      const largeBulkData = {
        invitations: Array.from({ length: 20 }, (_, i) => ({
          email: `large-bulk-${Date.now()}-${i}@example.com`,
          firstName: `Large${i}`,
          lastName: 'User',
          tenantRole: 'member',
          isOnboardingInvitation: true
        }))
      };

      console.log('📤 Sending large bulk invitation request (20 users)...');

      const response = await request(app)
        .post('/v1/user-invitations/bulk-invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(largeBulkData)
        .timeout(30000); // 30 secondes

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`⏱️  Large bulk invitation completed in ${duration}ms`);
      console.log('📥 Response status:', response.status);
      
      // Soit ça réussit, soit ça timeout gracieusement
      if (response.status === 408) {
        console.log('⏰ Request timed out as expected for large bulk');
        expect(response.body.code).toBe('REQUEST_TIMEOUT');
      } else {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    }, 35000);
  });

  describe('Email Service Performance', () => {
    it('should handle email sending without blocking the response', async () => {
      const startTime = Date.now();
      
      const invitationData = {
        email: `email-perf-${Date.now()}@example.com`,
        firstName: 'Email',
        lastName: 'Performance',
        tenantRole: 'member',
        isOnboardingInvitation: true // Mode express avec email asynchrone
      };

      console.log('📤 Testing email performance...');

      const response = await request(app)
        .post('/v1/user-invitations/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(invitationData)
        .timeout(8000);

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`⏱️  Email invitation completed in ${duration}ms`);
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      
      // L'envoi d'email ne doit pas bloquer la réponse
      expect(duration).toBeLessThan(3000); // Moins de 3 secondes
    }, 10000);
  });

  describe('Authentication & Authorization Performance', () => {
    it('should validate auth token quickly', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/v1/user-invitations/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .timeout(5000);

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`⏱️  Auth validation completed in ${duration}ms`);
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000); // Auth doit être très rapide
    }, 8000);

    it('should reject invalid auth quickly', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/v1/user-invitations/invite')
        .set('Authorization', 'Bearer invalid-token')
        .set('X-Tenant-ID', testTenant.id)
        .send({
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          tenantRole: 'member'
        })
        .timeout(3000);

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`⏱️  Invalid auth rejected in ${duration}ms`);
      
      expect(response.status).toBe(401);
      expect(duration).toBeLessThan(500); // Rejet d'auth doit être très rapide
    }, 5000);
  });
});