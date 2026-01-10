/**
 * Tests complets pour le système d'invitations utilisateurs
 */

import request from 'supertest';
import { Express } from 'express';
import { setupTestApp, cleanupTestApp, createTestUser, createTestTenant, getAuthToken } from '../helpers/test-setup';
import { collections } from '../../../backend/functions/src/config/database';

describe('User Invitations System - Comprehensive Tests', () => {
  let app: Express;
  let testUser: any;
  let testTenant: any;
  let authToken: string;
  let adminUser: any;
  let adminToken: string;

  beforeAll(async () => {
    app = await setupTestApp();
    testTenant = await createTestTenant();
    
    // Create admin user with proper permissions
    adminUser = await createTestUser({ 
      tenantId: testTenant.id,
      role: 'admin',
      permissions: {
        manage_users: true,
        view_all_users: true,
        invite_users: true
      }
    });
    adminToken = await getAuthToken(adminUser);

    // Create regular user
    testUser = await createTestUser({ 
      tenantId: testTenant.id,
      role: 'user'
    });
    authToken = await getAuthToken(testUser);
  });

  afterAll(async () => {
    await cleanupTestApp();
  });

  describe('Single User Invitation', () => {
    it('should send invitation successfully with admin permissions', async () => {
      const invitationData = {
        email: 'invite@test.com',
        firstName: 'Invited',
        lastName: 'User',
        role: 'user',
        department: 'Engineering',
        message: 'Welcome to our team!'
      };

      const response = await request(app)
        .post('/v1/user-invitations/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(invitationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.invitation.email).toBe(invitationData.email);
      expect(response.body.data.invitation.status).toBe('pending');
      expect(response.body.data.invitation.tenantId).toBe(testTenant.id);
    });

    it('should reject invitation without proper permissions', async () => {
      const invitationData = {
        email: 'noperm@test.com',
        firstName: 'No',
        lastName: 'Permission',
        role: 'user'
      };

      const response = await request(app)
        .post('/v1/user-invitations/invite')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(invitationData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('permission');
    });

    it('should reject invitation with invalid email', async () => {
      const invitationData = {
        email: 'invalid-email',
        firstName: 'Invalid',
        lastName: 'Email',
        role: 'user'
      };

      const response = await request(app)
        .post('/v1/user-invitations/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(invitationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('email');
    });

    it('should reject duplicate invitation', async () => {
      const invitationData = {
        email: 'duplicate@test.com',
        firstName: 'Duplicate',
        lastName: 'User',
        role: 'user'
      };

      // Send first invitation
      await request(app)
        .post('/v1/user-invitations/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(invitationData)
        .expect(201);

      // Try to send duplicate
      const response = await request(app)
        .post('/v1/user-invitations/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(invitationData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('exists');
    });

    it('should reject invitation to existing user', async () => {
      const invitationData = {
        email: testUser.email,
        firstName: 'Existing',
        lastName: 'User',
        role: 'user'
      };

      const response = await request(app)
        .post('/v1/user-invitations/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(invitationData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('exists');
    });
  });

  describe('Bulk User Invitations', () => {
    it('should send bulk invitations successfully', async () => {
      const bulkData = {
        invitations: [
          {
            email: 'bulk1@test.com',
            firstName: 'Bulk',
            lastName: 'User1',
            role: 'user'
          },
          {
            email: 'bulk2@test.com',
            firstName: 'Bulk',
            lastName: 'User2',
            role: 'manager'
          },
          {
            email: 'bulk3@test.com',
            firstName: 'Bulk',
            lastName: 'User3',
            role: 'user'
          }
        ],
        message: 'Welcome to our organization!',
        sendWelcomeEmail: true
      };

      const response = await request(app)
        .post('/v1/user-invitations/bulk-invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(bulkData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.total).toBe(3);
      expect(response.body.data.summary.successful).toBe(3);
      expect(response.body.data.summary.failed).toBe(0);
      expect(response.body.data.results).toHaveLength(3);
    });

    it('should handle partial failures in bulk invitations', async () => {
      const bulkData = {
        invitations: [
          {
            email: 'valid@test.com',
            firstName: 'Valid',
            lastName: 'User',
            role: 'user'
          },
          {
            email: 'invalid-email',
            firstName: 'Invalid',
            lastName: 'User',
            role: 'user'
          },
          {
            email: testUser.email, // Existing user
            firstName: 'Existing',
            lastName: 'User',
            role: 'user'
          }
        ]
      };

      const response = await request(app)
        .post('/v1/user-invitations/bulk-invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(bulkData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.total).toBe(3);
      expect(response.body.data.summary.successful).toBe(1);
      expect(response.body.data.summary.failed).toBe(2);
    });

    it('should reject bulk invitations exceeding limit', async () => {
      const invitations = Array.from({ length: 101 }, (_, i) => ({
        email: `bulk${i}@test.com`,
        firstName: 'Bulk',
        lastName: `User${i}`,
        role: 'user'
      }));

      const response = await request(app)
        .post('/v1/user-invitations/bulk-invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send({ invitations })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('limit');
    });
  });

  describe('CSV Import', () => {
    it('should import invitations from CSV successfully', async () => {
      const csvContent = `email,firstName,lastName,role,department
csv1@test.com,CSV,User1,user,Engineering
csv2@test.com,CSV,User2,manager,Marketing
csv3@test.com,CSV,User3,user,Sales`;

      const response = await request(app)
        .post('/v1/user-invitations/csv-import')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .attach('csvFile', Buffer.from(csvContent), 'invitations.csv')
        .field('defaultRole', 'user')
        .field('customMessage', 'Welcome from CSV import!')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.total).toBe(3);
      expect(response.body.data.summary.successful).toBe(3);
    });

    it('should reject CSV import without file', async () => {
      const response = await request(app)
        .post('/v1/user-invitations/csv-import')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('file');
    });

    it('should reject CSV with too many rows', async () => {
      const csvRows = Array.from({ length: 1001 }, (_, i) => 
        `csv${i}@test.com,CSV,User${i},user,Engineering`
      );
      const csvContent = `email,firstName,lastName,role,department\n${csvRows.join('\n')}`;

      const response = await request(app)
        .post('/v1/user-invitations/csv-import')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .attach('csvFile', Buffer.from(csvContent), 'large.csv')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('rows');
    });
  });

  describe('Get Invitations', () => {
    beforeEach(async () => {
      // Create some test invitations
      await request(app)
        .post('/v1/user-invitations/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send({
          email: 'list1@test.com',
          firstName: 'List',
          lastName: 'User1',
          role: 'user'
        });

      await request(app)
        .post('/v1/user-invitations/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send({
          email: 'list2@test.com',
          firstName: 'List',
          lastName: 'User2',
          role: 'manager'
        });
    });

    it('should get all invitations with proper permissions', async () => {
      const response = await request(app)
        .get('/v1/user-invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .query({
          limit: 50,
          offset: 0,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.invitations).toBeDefined();
      expect(Array.isArray(response.body.data.invitations)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should filter invitations by status', async () => {
      const response = await request(app)
        .get('/v1/user-invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .query({
          status: 'pending',
          limit: 50
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.invitations.every((inv: any) => inv.status === 'pending')).toBe(true);
    });

    it('should reject access without proper permissions', async () => {
      const response = await request(app)
        .get('/v1/user-invitations')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('permission');
    });

    it('should handle pagination correctly', async () => {
      const response = await request(app)
        .get('/v1/user-invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .query({
          limit: 1,
          offset: 0
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.invitations).toHaveLength(1);
      expect(response.body.data.pagination.hasMore).toBeDefined();
    });
  });

  describe('Invitation Statistics', () => {
    it('should get invitation statistics', async () => {
      const response = await request(app)
        .get('/v1/user-invitations/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBeDefined();
      expect(response.body.data.pending).toBeDefined();
      expect(response.body.data.accepted).toBeDefined();
      expect(response.body.data.declined).toBeDefined();
      expect(response.body.data.expired).toBeDefined();
    });

    it('should reject stats access without proper permissions', async () => {
      const response = await request(app)
        .get('/v1/user-invitations/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Invitation Management', () => {
    let invitationId: string;

    beforeEach(async () => {
      // Create a test invitation
      const response = await request(app)
        .post('/v1/user-invitations/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send({
          email: 'manage@test.com',
          firstName: 'Manage',
          lastName: 'User',
          role: 'user'
        });

      invitationId = response.body.data.invitation.id;
    });

    it('should resend invitation successfully', async () => {
      const response = await request(app)
        .post(`/v1/user-invitations/${invitationId}/resend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('resent');
    });

    it('should cancel invitation successfully', async () => {
      const response = await request(app)
        .delete(`/v1/user-invitations/${invitationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('cancelled');
    });

    it('should reject resend for non-existent invitation', async () => {
      const response = await request(app)
        .post('/v1/user-invitations/non-existent-id/resend')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should reject cancel for non-existent invitation', async () => {
      const response = await request(app)
        .delete('/v1/user-invitations/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('Public Invitation Routes', () => {
    let invitationToken: string;

    beforeEach(async () => {
      // Create invitation and get token
      const inviteResponse = await request(app)
        .post('/v1/user-invitations/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send({
          email: 'public@test.com',
          firstName: 'Public',
          lastName: 'User',
          role: 'user'
        });

      // Get the invitation token from database
      const invitationId = inviteResponse.body.data.invitation.id;
      const tokenDoc = await collections.invitation_tokens
        .where('invitationId', '==', invitationId)
        .limit(1)
        .get();
      
      invitationToken = tokenDoc.docs[0]?.id || 'test-token';
    });

    it('should validate invitation token', async () => {
      const response = await request(app)
        .get(`/public/invitations/validate/${invitationToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('public@test.com');
    });

    it('should reject invalid invitation token', async () => {
      const response = await request(app)
        .get('/public/invitations/validate/invalid-token')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid');
    });

    it('should accept invitation successfully', async () => {
      const acceptData = {
        token: invitationToken,
        password: 'AcceptedPassword123!',
        acceptTerms: true,
        marketingConsent: false
      };

      const response = await request(app)
        .post('/public/invitations/accept')
        .send(acceptData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.tenant).toBeDefined();
      expect(response.body.data.loginUrl).toBeDefined();
    });

    it('should decline invitation successfully', async () => {
      const declineData = {
        token: invitationToken,
        reason: 'Not interested at this time'
      };

      const response = await request(app)
        .post('/public/invitations/decline')
        .send(declineData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('declined');
    });
  });

  describe('Tenant Isolation', () => {
    let otherTenant: any;
    let otherUser: any;
    let otherToken: string;

    beforeEach(async () => {
      otherTenant = await createTestTenant();
      otherUser = await createTestUser({ 
        tenantId: otherTenant.id,
        role: 'admin',
        permissions: {
          manage_users: true,
          view_all_users: true
        }
      });
      otherToken = await getAuthToken(otherUser);
    });

    it('should not see invitations from other tenants', async () => {
      // Create invitation in first tenant
      await request(app)
        .post('/v1/user-invitations/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send({
          email: 'isolation1@test.com',
          firstName: 'Isolation',
          lastName: 'User1',
          role: 'user'
        });

      // Create invitation in second tenant
      await request(app)
        .post('/v1/user-invitations/invite')
        .set('Authorization', `Bearer ${otherToken}`)
        .set('X-Tenant-ID', otherTenant.id)
        .send({
          email: 'isolation2@test.com',
          firstName: 'Isolation',
          lastName: 'User2',
          role: 'user'
        });

      // Check first tenant only sees their invitations
      const response1 = await request(app)
        .get('/v1/user-invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      const emails1 = response1.body.data.invitations.map((inv: any) => inv.email);
      expect(emails1).toContain('isolation1@test.com');
      expect(emails1).not.toContain('isolation2@test.com');

      // Check second tenant only sees their invitations
      const response2 = await request(app)
        .get('/v1/user-invitations')
        .set('Authorization', `Bearer ${otherToken}`)
        .set('X-Tenant-ID', otherTenant.id)
        .expect(200);

      const emails2 = response2.body.data.invitations.map((inv: any) => inv.email);
      expect(emails2).toContain('isolation2@test.com');
      expect(emails2).not.toContain('isolation1@test.com');
    });

    it('should reject access to other tenant invitations', async () => {
      const response = await request(app)
        .get('/v1/user-invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', otherTenant.id)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('access');
    });
  });
});