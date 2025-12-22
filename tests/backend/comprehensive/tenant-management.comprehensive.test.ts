/**
 * Tests complets pour le système de gestion des tenants
 */

import request from 'supertest';
import { Express } from 'express';
import { setupTestApp, cleanupTestApp, createTestUser, createTestTenant, getAuthToken } from '../helpers/test-setup';
import { collections } from '../../../backend/functions/src/config/database';

describe('Tenant Management System - Comprehensive Tests', () => {
  let app: Express;
  let superAdminUser: any;
  let superAdminToken: string;
  let tenantOwner: any;
  let tenantOwnerToken: string;
  let testTenant: any;

  beforeAll(async () => {
    app = await setupTestApp();
    
    // Create super admin user
    superAdminUser = await createTestUser({ 
      role: 'super_admin',
      applicationRole: 'super_admin',
      permissions: {
        manage_tenants: true,
        view_all_tenants: true,
        create_tenants: true,
        delete_tenants: true
      }
    });
    superAdminToken = await getAuthToken(superAdminUser);

    // Create test tenant
    testTenant = await createTestTenant();
    
    // Create tenant owner
    tenantOwner = await createTestUser({ 
      tenantId: testTenant.id,
      role: 'owner',
      permissions: {
        manage_tenant_settings: true,
        view_tenant_analytics: true,
        manage_users: true
      }
    });
    tenantOwnerToken = await getAuthToken(tenantOwner);
  });

  afterAll(async () => {
    await cleanupTestApp();
  });

  describe('Tenant Creation', () => {
    it('should create tenant successfully with super admin permissions', async () => {
      const tenantData = {
        name: 'New Test Organization',
        slug: 'new-test-org',
        industry: 'technology',
        size: '11-50',
        description: 'A new test organization',
        settings: {
          timezone: 'Europe/Paris',
          locale: 'fr-FR',
          currency: 'EUR'
        }
      };

      const response = await request(app)
        .post('/v1/tenants')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(tenantData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tenant.name).toBe(tenantData.name);
      expect(response.body.data.tenant.slug).toBe(tenantData.slug);
      expect(response.body.data.tenant.status).toBe('active');
      expect(response.body.data.tenant.planId).toBe('free');
    });

    it('should reject tenant creation without super admin permissions', async () => {
      const tenantData = {
        name: 'Unauthorized Tenant',
        slug: 'unauthorized-tenant'
      };

      const response = await request(app)
        .post('/v1/tenants')
        .set('Authorization', `Bearer ${tenantOwnerToken}`)
        .send(tenantData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('permission');
    });

    it('should reject tenant creation with duplicate slug', async () => {
      const tenantData = {
        name: 'Duplicate Slug Tenant',
        slug: testTenant.slug
      };

      const response = await request(app)
        .post('/v1/tenants')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(tenantData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('exists');
    });

    it('should validate tenant data on creation', async () => {
      const invalidTenantData = {
        name: '', // Empty name
        slug: 'invalid slug with spaces'
      };

      const response = await request(app)
        .post('/v1/tenants')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(invalidTenantData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Tenant Retrieval', () => {
    it('should get all tenants with super admin permissions', async () => {
      const response = await request(app)
        .get('/v1/tenants')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .query({
          limit: 50,
          offset: 0,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.tenants)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should get specific tenant by ID', async () => {
      const response = await request(app)
        .get(`/v1/tenants/${testTenant.id}`)
        .set('Authorization', `Bearer ${tenantOwnerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testTenant.id);
      expect(response.body.data.name).toBe(testTenant.name);
    });

    it('should reject access to other tenant details', async () => {
      const otherTenant = await createTestTenant();

      const response = await request(app)
        .get(`/v1/tenants/${otherTenant.id}`)
        .set('Authorization', `Bearer ${tenantOwnerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('access');
    });

    it('should filter tenants by status', async () => {
      const response = await request(app)
        .get('/v1/tenants')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .query({
          status: 'active',
          limit: 50
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tenants.every((tenant: any) => tenant.status === 'active')).toBe(true);
    });

    it('should search tenants by name', async () => {
      const response = await request(app)
        .get('/v1/tenants')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .query({
          search: testTenant.name.substring(0, 5),
          limit: 50
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tenants.some((tenant: any) => 
        tenant.name.includes(testTenant.name.substring(0, 5))
      )).toBe(true);
    });
  });

  describe('Tenant Updates', () => {
    it('should update tenant settings with owner permissions', async () => {
      const updateData = {
        settings: {
          name: 'Updated Organization Name',
          description: 'Updated description',
          timezone: 'America/New_York',
          locale: 'en-US',
          currency: 'USD'
        }
      };

      const response = await request(app)
        .put(`/v1/tenants/${testTenant.id}/settings`)
        .set('Authorization', `Bearer ${tenantOwnerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.settings.name);
      expect(response.body.data.settings.timezone).toBe(updateData.settings.timezone);
    });

    it('should update tenant plan with super admin permissions', async () => {
      const planUpdate = {
        planId: 'professional',
        billingCycle: 'monthly'
      };

      const response = await request(app)
        .put(`/v1/tenants/${testTenant.id}/plan`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(planUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.planId).toBe(planUpdate.planId);
    });

    it('should reject plan update without super admin permissions', async () => {
      const planUpdate = {
        planId: 'enterprise'
      };

      const response = await request(app)
        .put(`/v1/tenants/${testTenant.id}/plan`)
        .set('Authorization', `Bearer ${tenantOwnerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(planUpdate)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('permission');
    });

    it('should update tenant status with super admin permissions', async () => {
      const statusUpdate = {
        status: 'suspended',
        reason: 'Policy violation'
      };

      const response = await request(app)
        .put(`/v1/tenants/${testTenant.id}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(statusUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(statusUpdate.status);

      // Restore active status
      await request(app)
        .put(`/v1/tenants/${testTenant.id}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'active' });
    });
  });

  describe('Tenant Onboarding', () => {
    it('should get onboarding status', async () => {
      const response = await request(app)
        .get(`/v1/tenants/${testTenant.id}/onboarding-status`)
        .set('Authorization', `Bearer ${tenantOwnerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.completed).toBeDefined();
      expect(response.body.data.steps).toBeDefined();
      expect(Array.isArray(response.body.data.steps)).toBe(true);
    });

    it('should complete onboarding step', async () => {
      const response = await request(app)
        .post(`/v1/tenants/${testTenant.id}/onboarding/steps/welcome/complete`)
        .set('Authorization', `Bearer ${tenantOwnerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should mark onboarding as complete', async () => {
      const response = await request(app)
        .post(`/v1/tenants/${testTenant.id}/onboarding/complete`)
        .set('Authorization', `Bearer ${tenantOwnerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Tenant Analytics', () => {
    it('should get tenant analytics with proper permissions', async () => {
      const response = await request(app)
        .get(`/v1/tenants/${testTenant.id}/analytics`)
        .set('Authorization', `Bearer ${tenantOwnerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .query({
          period: '30d',
          metrics: 'users,events,attendance'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.metrics).toBeDefined();
    });

    it('should get tenant usage statistics', async () => {
      const response = await request(app)
        .get(`/v1/tenants/${testTenant.id}/usage`)
        .set('Authorization', `Bearer ${tenantOwnerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.usage).toBeDefined();
      expect(response.body.data.limits).toBeDefined();
    });

    it('should reject analytics access without proper permissions', async () => {
      const regularUser = await createTestUser({ 
        tenantId: testTenant.id,
        role: 'user'
      });
      const regularToken = await getAuthToken(regularUser);

      const response = await request(app)
        .get(`/v1/tenants/${testTenant.id}/analytics`)
        .set('Authorization', `Bearer ${regularToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('permission');
    });
  });

  describe('Tenant Members Management', () => {
    it('should get tenant members', async () => {
      const response = await request(app)
        .get(`/v1/tenants/${testTenant.id}/members`)
        .set('Authorization', `Bearer ${tenantOwnerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .query({
          limit: 50,
          offset: 0
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.members)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should add member to tenant', async () => {
      const newUser = await createTestUser();
      
      const memberData = {
        userId: newUser.uid,
        role: 'user',
        permissions: ['view_events', 'create_attendance']
      };

      const response = await request(app)
        .post(`/v1/tenants/${testTenant.id}/members`)
        .set('Authorization', `Bearer ${tenantOwnerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(memberData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.membership.userId).toBe(newUser.uid);
      expect(response.body.data.membership.role).toBe(memberData.role);
    });

    it('should update member role', async () => {
      const members = await request(app)
        .get(`/v1/tenants/${testTenant.id}/members`)
        .set('Authorization', `Bearer ${tenantOwnerToken}`)
        .set('X-Tenant-ID', testTenant.id);

      const memberId = members.body.data.members[0]?.id;
      if (!memberId) return;

      const updateData = {
        role: 'manager',
        permissions: ['view_events', 'create_events', 'manage_users']
      };

      const response = await request(app)
        .put(`/v1/tenants/${testTenant.id}/members/${memberId}`)
        .set('Authorization', `Bearer ${tenantOwnerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe(updateData.role);
    });

    it('should remove member from tenant', async () => {
      const newUser = await createTestUser();
      
      // Add member first
      await request(app)
        .post(`/v1/tenants/${testTenant.id}/members`)
        .set('Authorization', `Bearer ${tenantOwnerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send({
          userId: newUser.uid,
          role: 'user'
        });

      // Get membership ID
      const members = await request(app)
        .get(`/v1/tenants/${testTenant.id}/members`)
        .set('Authorization', `Bearer ${tenantOwnerToken}`)
        .set('X-Tenant-ID', testTenant.id);

      const membership = members.body.data.members.find((m: any) => m.userId === newUser.uid);
      
      const response = await request(app)
        .delete(`/v1/tenants/${testTenant.id}/members/${membership.id}`)
        .set('Authorization', `Bearer ${tenantOwnerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Tenant Deletion', () => {
    it('should soft delete tenant with super admin permissions', async () => {
      const tenantToDelete = await createTestTenant();

      const response = await request(app)
        .delete(`/v1/tenants/${tenantToDelete.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ reason: 'Test deletion' })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify tenant is marked as deleted
      const deletedTenant = await request(app)
        .get(`/v1/tenants/${tenantToDelete.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(deletedTenant.body.data.status).toBe('deleted');
    });

    it('should reject tenant deletion without super admin permissions', async () => {
      const response = await request(app)
        .delete(`/v1/tenants/${testTenant.id}`)
        .set('Authorization', `Bearer ${tenantOwnerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('permission');
    });

    it('should permanently delete tenant with confirmation', async () => {
      const tenantToDelete = await createTestTenant();

      const response = await request(app)
        .delete(`/v1/tenants/${tenantToDelete.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ 
          reason: 'Test permanent deletion',
          permanent: true,
          confirmationText: tenantToDelete.name
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify tenant is completely removed
      const deletedTenant = await request(app)
        .get(`/v1/tenants/${tenantToDelete.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(404);

      expect(deletedTenant.body.success).toBe(false);
    });
  });

  describe('Tenant Limits and Features', () => {
    it('should check tenant feature availability', async () => {
      const response = await request(app)
        .get(`/v1/tenants/${testTenant.id}/features`)
        .set('Authorization', `Bearer ${tenantOwnerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.features).toBeDefined();
      expect(response.body.data.plan).toBeDefined();
    });

    it('should enforce usage limits', async () => {
      // This would test specific limits based on the tenant's plan
      const response = await request(app)
        .get(`/v1/tenants/${testTenant.id}/limits`)
        .set('Authorization', `Bearer ${tenantOwnerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.limits).toBeDefined();
      expect(response.body.data.usage).toBeDefined();
    });

    it('should handle feature access based on plan', async () => {
      // Test accessing a premium feature with a free plan
      const response = await request(app)
        .get(`/v1/tenants/${testTenant.id}/advanced-analytics`)
        .set('Authorization', `Bearer ${tenantOwnerToken}`)
        .set('X-Tenant-ID', testTenant.id);

      // Should either work or return feature not available based on plan
      expect([200, 403]).toContain(response.status);
      
      if (response.status === 403) {
        expect(response.body.error).toContain('feature');
      }
    });
  });

  describe('Tenant Context Middleware', () => {
    it('should inject tenant context correctly', async () => {
      const response = await request(app)
        .get(`/v1/tenants/${testTenant.id}`)
        .set('Authorization', `Bearer ${tenantOwnerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      // The middleware should have injected the tenant context
    });

    it('should reject requests without tenant context when required', async () => {
      const response = await request(app)
        .get(`/v1/tenants/${testTenant.id}`)
        .set('Authorization', `Bearer ${tenantOwnerToken}`)
        // Missing X-Tenant-ID header
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('tenant');
    });

    it('should validate tenant access permissions', async () => {
      const otherTenant = await createTestTenant();

      const response = await request(app)
        .get(`/v1/tenants/${otherTenant.id}`)
        .set('Authorization', `Bearer ${tenantOwnerToken}`)
        .set('X-Tenant-ID', otherTenant.id)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('access');
    });
  });
});