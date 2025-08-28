// backend/tests/unit/user-organizations.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../functions/src/index';
import { collections } from '../../functions/src/config/database';
import { UserRole, UserStatus } from '@attendance-x/shared';

describe('GET /users/:id/organizations', () => {
  let testUserId: string;
  let testOrgId: string;
  let authToken: string;

  beforeEach(async () => {
    // Créer un utilisateur de test
    testUserId = 'test-user-' + Date.now();
    testOrgId = 'test-org-' + Date.now();

    // Créer une organisation de test
    await collections.organizations.doc(testOrgId).set({
      id: testOrgId,
      name: 'Test Organization',
      displayName: 'Test Organization',
      sector: 'technology',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Créer un utilisateur de test
    await collections.users.doc(testUserId).set({
      id: testUserId,
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      organizationId: testOrgId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Simuler un token d'authentification (à adapter selon votre système d'auth)
    authToken = 'Bearer test-token';
  });

  afterEach(async () => {
    // Nettoyer les données de test
    try {
      await collections.users.doc(testUserId).delete();
      await collections.organizations.doc(testOrgId).delete();
    } catch (error) {
      console.warn('Erreur lors du nettoyage des tests:', error);
    }
  });

  it('should return user organizations successfully', async () => {
    const response = await request(app)
      .get(`/api/v1/users/${testUserId}/organizations`)
      .set('Authorization', authToken)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.data).toHaveLength(1);
    
    const organization = response.body.data[0];
    expect(organization).toHaveProperty('organizationId', testOrgId);
    expect(organization).toHaveProperty('organizationName', 'Test Organization');
    expect(organization).toHaveProperty('role', UserRole.ADMIN);
    expect(organization).toHaveProperty('isActive', true);
    expect(organization).toHaveProperty('permissions');
    expect(organization.permissions).toBeInstanceOf(Array);
  });

  it('should return empty array for user without organization', async () => {
    // Créer un utilisateur sans organisation
    const userWithoutOrgId = 'test-user-no-org-' + Date.now();
    
    await collections.users.doc(userWithoutOrgId).set({
      id: userWithoutOrgId,
      email: 'noorg@example.com',
      firstName: 'No',
      lastName: 'Org',
      role: UserRole.GUEST,
      status: UserStatus.ACTIVE,
      // Pas d'organizationId
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app)
      .get(`/api/v1/users/${userWithoutOrgId}/organizations`)
      .set('Authorization', authToken)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.data).toHaveLength(0);

    // Nettoyer
    await collections.users.doc(userWithoutOrgId).delete();
  });

  it('should return 404 for non-existent user', async () => {
    const response = await request(app)
      .get('/api/v1/users/non-existent-user/organizations')
      .set('Authorization', authToken)
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('non trouvé');
  });

  it('should return 403 when user tries to access other user organizations without permission', async () => {
    // Créer un utilisateur normal (sans permission view_all_users)
    const normalUserId = 'normal-user-' + Date.now();
    
    await collections.users.doc(normalUserId).set({
      id: normalUserId,
      email: 'normal@example.com',
      firstName: 'Normal',
      lastName: 'User',
      role: UserRole.GUEST, // Rôle sans permission view_all_users
      status: UserStatus.ACTIVE,
      organizationId: testOrgId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Simuler l'authentification avec l'utilisateur normal
    const normalUserToken = 'Bearer normal-user-token';

    const response = await request(app)
      .get(`/api/v1/users/${testUserId}/organizations`) // Essayer d'accéder aux orgs d'un autre utilisateur
      .set('Authorization', normalUserToken)
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Accès refusé');

    // Nettoyer
    await collections.users.doc(normalUserId).delete();
  });
});