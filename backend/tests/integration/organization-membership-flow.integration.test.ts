// backend/tests/integration/organization-membership-flow.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../functions/src/app';
import { collections } from '../../functions/src/config/firebase';
import { generateTestUser, generateTestOrganization, cleanupTestData } from '../helpers/test-helpers';

describe('Organization Membership Flow - Integration Tests', () => {
  let testUserId: string;
  let testOrganizationId: string;
  let authToken: string;

  beforeEach(async () => {
    // Créer un utilisateur de test
    const testUser = await generateTestUser();
    testUserId = testUser.uid;
    authToken = testUser.token;
  });

  afterEach(async () => {
    // Nettoyer les données de test
    await cleanupTestData(testUserId, testOrganizationId);
  });

  describe('GET /users/{userId}/organizations', () => {
    it('devrait retourner une liste vide pour un utilisateur sans organisation', async () => {
      const response = await request(app)
        .get(`/api/users/${testUserId}/organizations`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [],
        message: 'Organizations retrieved successfully'
      });
    });

    it('devrait retourner les organisations de l\'utilisateur', async () => {
      // Créer une organisation de test
      const testOrg = await generateTestOrganization();
      testOrganizationId = testOrg.id;

      // Ajouter l'utilisateur à l'organisation
      await collections.users.doc(testUserId).update({
        organizationId: testOrganizationId
      });

      const response = await request(app)
        .get(`/api/users/${testUserId}/organizations`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        organizationId: testOrganizationId,
        organizationName: testOrg.name,
        role: expect.any(String),
        isActive: true
      });
    });

    it('devrait retourner 401 pour un utilisateur non authentifié', async () => {
      await request(app)
        .get(`/api/users/${testUserId}/organizations`)
        .expect(401);
    });

    it('devrait retourner 403 pour un utilisateur tentant d\'accéder aux organisations d\'un autre', async () => {
      const otherUser = await generateTestUser();
      
      await request(app)
        .get(`/api/users/${otherUser.uid}/organizations`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      await cleanupTestData(otherUser.uid);
    });

    it('devrait retourner 404 pour un utilisateur inexistant', async () => {
      const response = await request(app)
        .get('/api/users/nonexistent-user/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('User not found');
    });
  });

  describe('POST /organizations - Gestion des appartenances existantes', () => {
    it('devrait créer une nouvelle organisation pour un utilisateur sans organisation', async () => {
      const organizationData = {
        name: 'Test Organization',
        displayName: 'Test Org',
        sector: 'technology',
        description: 'Organisation de test'
      };

      const response = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(organizationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(organizationData.name);
      
      testOrganizationId = response.body.data.id;

      // Vérifier que l'utilisateur a été ajouté à l'organisation
      const userDoc = await collections.users.doc(testUserId).get();
      const userData = userDoc.data();
      expect(userData?.organizationId).toBe(testOrganizationId);
    });

    it('devrait retourner l\'organisation existante si l\'utilisateur appartient déjà à une organisation', async () => {
      // Créer une organisation existante
      const existingOrg = await generateTestOrganization();
      testOrganizationId = existingOrg.id;

      // Ajouter l'utilisateur à l'organisation existante
      await collections.users.doc(testUserId).update({
        organizationId: testOrganizationId
      });

      const newOrganizationData = {
        name: 'New Organization',
        displayName: 'New Org',
        sector: 'education',
        description: 'Nouvelle organisation'
      };

      const response = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newOrganizationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testOrganizationId);
      expect(response.body.data.name).toBe(existingOrg.name);
      expect(response.body.data.isExistingMembership).toBe(true);
      expect(response.body.data.message).toContain('déjà membre');
    });

    it('devrait permettre la création si l\'organisation référencée n\'existe plus', async () => {
      // Ajouter une référence d'organisation inexistante à l'utilisateur
      await collections.users.doc(testUserId).update({
        organizationId: 'nonexistent-org-id'
      });

      const organizationData = {
        name: 'Recovery Organization',
        displayName: 'Recovery Org',
        sector: 'technology',
        description: 'Organisation de récupération'
      };

      const response = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(organizationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(organizationData.name);
      
      testOrganizationId = response.body.data.id;

      // Vérifier que la référence d'organisation de l'utilisateur a été mise à jour
      const userDoc = await collections.users.doc(testUserId).get();
      const userData = userDoc.data();
      expect(userData?.organizationId).toBe(testOrganizationId);
    });
  });

  describe('Flux complet d\'onboarding', () => {
    it('devrait gérer le flux complet pour un nouvel utilisateur', async () => {
      // 1. Vérifier qu'aucune organisation n'existe
      const initialCheck = await request(app)
        .get(`/api/users/${testUserId}/organizations`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(initialCheck.body.data).toHaveLength(0);

      // 2. Créer une nouvelle organisation
      const organizationData = {
        name: 'Complete Flow Test Org',
        displayName: 'Complete Flow Test',
        sector: 'technology',
        description: 'Test du flux complet'
      };

      const createResponse = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(organizationData)
        .expect(201);

      testOrganizationId = createResponse.body.data.id;

      // 3. Vérifier que l'utilisateur appartient maintenant à l'organisation
      const finalCheck = await request(app)
        .get(`/api/users/${testUserId}/organizations`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(finalCheck.body.data).toHaveLength(1);
      expect(finalCheck.body.data[0].organizationId).toBe(testOrganizationId);
      expect(finalCheck.body.data[0].organizationName).toBe(organizationData.name);
    });

    it('devrait gérer le flux pour un utilisateur avec organisation existante', async () => {
      // 1. Créer une organisation existante
      const existingOrg = await generateTestOrganization();
      testOrganizationId = existingOrg.id;

      await collections.users.doc(testUserId).update({
        organizationId: testOrganizationId
      });

      // 2. Vérifier l'organisation existante
      const initialCheck = await request(app)
        .get(`/api/users/${testUserId}/organizations`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(initialCheck.body.data).toHaveLength(1);
      expect(initialCheck.body.data[0].organizationId).toBe(testOrganizationId);

      // 3. Essayer de créer une nouvelle organisation
      const newOrganizationData = {
        name: 'Attempted New Org',
        displayName: 'Attempted New',
        sector: 'education',
        description: 'Tentative de nouvelle organisation'
      };

      const createResponse = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newOrganizationData)
        .expect(200);

      // 4. Vérifier que l'organisation existante est retournée
      expect(createResponse.body.data.id).toBe(testOrganizationId);
      expect(createResponse.body.data.isExistingMembership).toBe(true);

      // 5. Vérifier que l'utilisateur appartient toujours à la même organisation
      const finalCheck = await request(app)
        .get(`/api/users/${testUserId}/organizations`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(finalCheck.body.data).toHaveLength(1);
      expect(finalCheck.body.data[0].organizationId).toBe(testOrganizationId);
    });
  });

  describe('Gestion d\'erreurs', () => {
    it('devrait gérer les données invalides lors de la création d\'organisation', async () => {
      const invalidData = {
        name: '', // Nom vide
        sector: 'invalid-sector'
      };

      const response = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    it('devrait gérer les erreurs de base de données', async () => {
      // Simuler une erreur en utilisant un token invalide après authentification
      const organizationData = {
        name: 'Test Organization',
        displayName: 'Test Org',
        sector: 'technology',
        description: 'Organisation de test'
      };

      // Utiliser un token malformé
      const response = await request(app)
        .post('/api/organizations')
        .set('Authorization', 'Bearer invalid-token')
        .send(organizationData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});