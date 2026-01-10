/**
 * Tests d'intégration complète de l'API
 */

import request from 'supertest';
import { Express } from 'express';
import { setupTestApp, cleanupTestApp, createTestUser, createTestTenant, getAuthToken } from '../helpers/test-setup';

describe('API Integration - Comprehensive Tests', () => {
  let app: Express;
  let testUser: any;
  let testTenant: any;
  let authToken: string;

  beforeAll(async () => {
    app = await setupTestApp();
    testTenant = await createTestTenant();
    testUser = await createTestUser({ 
      tenantId: testTenant.id,
      role: 'admin',
      permissions: {
        manage_users: true,
        view_all_users: true,
        create_events: true,
        manage_events: true,
        view_reports: true
      }
    });
    authToken = await getAuthToken(testUser);
  });

  afterAll(async () => {
    await cleanupTestApp();
  });

  describe('API Health and Status', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/v1/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.version).toBeDefined();
      expect(response.body.checks).toBeDefined();
    });

    it('should return API information', async () => {
      const response = await request(app)
        .get('/v1/api')
        .expect(200);

      expect(response.body.name).toBe('Attendance-X API');
      expect(response.body.version).toBeDefined();
      expect(response.body.endpoints).toBeDefined();
      expect(response.body.features).toBeDefined();
    });

    it('should return service status', async () => {
      const response = await request(app)
        .get('/v1/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.services).toBeDefined();
      expect(response.body.data.overall).toBeDefined();
    });
  });

  describe('Authentication Flow', () => {
    it('should complete full authentication flow', async () => {
      // 1. Register new user
      const registerData = {
        email: 'integration@test.com',
        password: 'IntegrationTest123!',
        firstName: 'Integration',
        lastName: 'Test',
        acceptTerms: true
      };

      const registerResponse = await request(app)
        .post('/v1/auth/register')
        .send(registerData)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      const { accessToken, refreshToken } = registerResponse.body.data;

      // 2. Use access token to access protected route
      const profileResponse = await request(app)
        .get('/v1/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.email).toBe(registerData.email);

      // 3. Refresh token
      const refreshResponse = await request(app)
        .post('/v1/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.data.accessToken).toBeDefined();

      // 4. Logout
      const logoutResponse = await request(app)
        .post('/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);

      // 5. Verify token is invalidated
      const invalidTokenResponse = await request(app)
        .get('/v1/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);

      expect(invalidTokenResponse.body.success).toBe(false);
    });
  });

  describe('Complete User Management Flow', () => {
    it('should complete full user management workflow', async () => {
      // 1. Create user invitation
      const invitationData = {
        email: 'workflow@test.com',
        firstName: 'Workflow',
        lastName: 'User',
        role: 'user',
        department: 'Engineering'
      };

      const inviteResponse = await request(app)
        .post('/v1/user-invitations/invite')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(invitationData)
        .expect(201);

      expect(inviteResponse.body.success).toBe(true);
      const invitationId = inviteResponse.body.data.invitation.id;

      // 2. Get invitations list
      const listResponse = await request(app)
        .get('/v1/user-invitations')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      expect(listResponse.body.success).toBe(true);
      expect(listResponse.body.data.invitations.some((inv: any) => inv.id === invitationId)).toBe(true);

      // 3. Resend invitation
      const resendResponse = await request(app)
        .post(`/v1/user-invitations/${invitationId}/resend`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      expect(resendResponse.body.success).toBe(true);

      // 4. Get invitation statistics
      const statsResponse = await request(app)
        .get('/v1/user-invitations/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      expect(statsResponse.body.success).toBe(true);
      expect(statsResponse.body.data.total).toBeGreaterThan(0);

      // 5. Cancel invitation
      const cancelResponse = await request(app)
        .delete(`/v1/user-invitations/${invitationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      expect(cancelResponse.body.success).toBe(true);
    });
  });

  describe('Complete Event and Attendance Flow', () => {
    it('should complete full event lifecycle', async () => {
      // 1. Create event
      const eventData = {
        title: 'Integration Test Event',
        description: 'Event for integration testing',
        type: 'meeting',
        startTime: new Date(Date.now() + 86400000).toISOString(),
        endTime: new Date(Date.now() + 90000000).toISOString(),
        location: {
          type: 'physical',
          address: '123 Test Street',
          room: 'Conference Room'
        },
        attendanceSettings: {
          requireCheckIn: true,
          allowLateCheckIn: true,
          graceMinutes: 15
        }
      };

      const createResponse = await request(app)
        .post('/v1/events')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(eventData)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      const eventId = createResponse.body.data.event.id;

      // 2. Get event details
      const getResponse = await request(app)
        .get(`/v1/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data.title).toBe(eventData.title);

      // 3. Update event
      const updateData = {
        title: 'Updated Integration Test Event',
        description: 'Updated description'
      };

      const updateResponse = await request(app)
        .put(`/v1/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.title).toBe(updateData.title);

      // 4. Generate QR code
      const qrResponse = await request(app)
        .post(`/v1/events/${eventId}/qr-code`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send({ expiresIn: 3600 })
        .expect(201);

      expect(qrResponse.body.success).toBe(true);
      expect(qrResponse.body.data.qrCode).toBeDefined();

      // 5. Check in to event
      const checkInResponse = await request(app)
        .post('/v1/attendances/check-in')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send({
          eventId: eventId,
          method: 'manual',
          location: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        })
        .expect(201);

      expect(checkInResponse.body.success).toBe(true);
      const attendanceId = checkInResponse.body.data.attendance.id;

      // 6. Get attendance records
      const attendanceResponse = await request(app)
        .get(`/v1/events/${eventId}/attendances`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      expect(attendanceResponse.body.success).toBe(true);
      expect(attendanceResponse.body.data.attendances.length).toBeGreaterThan(0);

      // 7. Check out
      const checkOutResponse = await request(app)
        .post('/v1/attendances/check-out')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send({ attendanceId })
        .expect(200);

      expect(checkOutResponse.body.success).toBe(true);

      // 8. Get event statistics
      const statsResponse = await request(app)
        .get(`/v1/events/${eventId}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      expect(statsResponse.body.success).toBe(true);
      expect(statsResponse.body.data.totalPresent).toBeGreaterThan(0);
    });
  });

  describe('Tenant Management Flow', () => {
    it('should complete tenant onboarding flow', async () => {
      // 1. Get onboarding status
      const statusResponse = await request(app)
        .get(`/v1/tenants/${testTenant.id}/onboarding-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.data.steps).toBeDefined();

      // 2. Complete welcome step
      const welcomeResponse = await request(app)
        .post(`/v1/tenants/${testTenant.id}/onboarding/steps/welcome/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      expect(welcomeResponse.body.success).toBe(true);

      // 3. Update tenant settings
      const settingsData = {
        settings: {
          name: 'Updated Test Organization',
          timezone: 'America/New_York',
          locale: 'en-US',
          currency: 'USD'
        }
      };

      const settingsResponse = await request(app)
        .put(`/v1/tenants/${testTenant.id}/settings`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(settingsData)
        .expect(200);

      expect(settingsResponse.body.success).toBe(true);

      // 4. Get tenant analytics
      const analyticsResponse = await request(app)
        .get(`/v1/tenants/${testTenant.id}/analytics`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .query({ period: '30d' })
        .expect(200);

      expect(analyticsResponse.body.success).toBe(true);

      // 5. Complete onboarding
      const completeResponse = await request(app)
        .post(`/v1/tenants/${testTenant.id}/onboarding/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      expect(completeResponse.body.success).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid authentication gracefully', async () => {
      const response = await request(app)
        .get('/v1/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle missing tenant context', async () => {
      const response = await request(app)
        .get('/v1/user-invitations')
        .set('Authorization', `Bearer ${authToken}`)
        // Missing X-Tenant-ID header
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('tenant');
    });

    it('should handle invalid tenant access', async () => {
      const otherTenant = await createTestTenant();

      const response = await request(app)
        .get('/v1/user-invitations')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', otherTenant.id)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('access');
    });

    it('should handle malformed request data', async () => {
      const response = await request(app)
        .post('/v1/events')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send({
          title: '', // Invalid empty title
          startTime: 'invalid-date',
          endTime: 'invalid-date'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle resource not found', async () => {
      const response = await request(app)
        .get('/v1/events/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should handle rate limiting', async () => {
      // Make multiple rapid requests to trigger rate limiting
      const promises = Array.from({ length: 20 }, () =>
        request(app)
          .post('/v1/auth/login')
          .send({
            email: 'nonexistent@test.com',
            password: 'wrongpassword'
          })
      );

      const responses = await Promise.all(promises);
      
      // At least one should be rate limited
      const rateLimited = responses.some(res => res.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('Data Consistency and Validation', () => {
    it('should maintain data consistency across operations', async () => {
      // Create event
      const eventResponse = await request(app)
        .post('/v1/events')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send({
          title: 'Consistency Test Event',
          startTime: new Date(Date.now() + 86400000).toISOString(),
          endTime: new Date(Date.now() + 90000000).toISOString()
        });

      const eventId = eventResponse.body.data.event.id;

      // Check in
      await request(app)
        .post('/v1/attendances/check-in')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send({ eventId, method: 'manual' });

      // Verify attendance exists in event stats
      const statsResponse = await request(app)
        .get(`/v1/events/${eventId}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id);

      expect(statsResponse.body.data.totalPresent).toBe(1);

      // Verify attendance exists in user history
      const historyResponse = await request(app)
        .get('/v1/attendances/my-history')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id);

      const userAttendances = historyResponse.body.data.attendances;
      expect(userAttendances.some((att: any) => att.eventId === eventId)).toBe(true);
    });

    it('should validate business rules', async () => {
      // Try to create event with end time before start time
      const response = await request(app)
        .post('/v1/events')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send({
          title: 'Invalid Event',
          startTime: new Date(Date.now() + 90000000).toISOString(),
          endTime: new Date(Date.now() + 86400000).toISOString() // Before start time
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should enforce tenant isolation', async () => {
      const otherTenant = await createTestTenant();
      const otherUser = await createTestUser({ 
        tenantId: otherTenant.id,
        role: 'admin',
        permissions: { view_all_events: true }
      });
      const otherToken = await getAuthToken(otherUser);

      // Create event in first tenant
      const eventResponse = await request(app)
        .post('/v1/events')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send({
          title: 'Isolation Test Event',
          startTime: new Date(Date.now() + 86400000).toISOString(),
          endTime: new Date(Date.now() + 90000000).toISOString()
        });

      const eventId = eventResponse.body.data.event.id;

      // Try to access from other tenant
      const accessResponse = await request(app)
        .get(`/v1/events/${eventId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .set('X-Tenant-ID', otherTenant.id)
        .expect(404);

      expect(accessResponse.body.success).toBe(false);

      // Verify other tenant can't see the event in their list
      const listResponse = await request(app)
        .get('/v1/events')
        .set('Authorization', `Bearer ${otherToken}`)
        .set('X-Tenant-ID', otherTenant.id);

      const eventTitles = listResponse.body.data.events.map((e: any) => e.title);
      expect(eventTitles).not.toContain('Isolation Test Event');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent requests efficiently', async () => {
      const startTime = Date.now();
      
      // Make 10 concurrent requests
      const promises = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post('/v1/user-invitations/invite')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-Tenant-ID', testTenant.id)
          .send({
            email: `concurrent${i}@test.com`,
            firstName: 'Concurrent',
            lastName: `User${i}`,
            role: 'user'
          })
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      
      // All should succeed
      expect(responses.every(res => res.status === 201)).toBe(true);
      
      // Should complete within reasonable time (adjust based on your requirements)
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds
    });

    it('should handle pagination correctly', async () => {
      // Create multiple invitations
      for (let i = 0; i < 15; i++) {
        await request(app)
          .post('/v1/user-invitations/invite')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-Tenant-ID', testTenant.id)
          .send({
            email: `pagination${i}@test.com`,
            firstName: 'Pagination',
            lastName: `User${i}`,
            role: 'user'
          });
      }

      // Test first page
      const page1Response = await request(app)
        .get('/v1/user-invitations')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .query({ limit: 10, offset: 0 });

      expect(page1Response.body.data.invitations).toHaveLength(10);
      expect(page1Response.body.data.pagination.hasMore).toBe(true);

      // Test second page
      const page2Response = await request(app)
        .get('/v1/user-invitations')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .query({ limit: 10, offset: 10 });

      expect(page2Response.body.data.invitations.length).toBeGreaterThan(0);
      
      // Verify no overlap
      const page1Emails = page1Response.body.data.invitations.map((inv: any) => inv.email);
      const page2Emails = page2Response.body.data.invitations.map((inv: any) => inv.email);
      const overlap = page1Emails.filter((email: string) => page2Emails.includes(email));
      expect(overlap).toHaveLength(0);
    });
  });
});