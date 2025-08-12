// tests/integration/event-attendance-flow.test.ts - Tests d'intégration complets

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../../backend/functions/src/app';

describe('Event Attendance Management - Integration Tests', () => {
  let authToken: string;
  let organizationId: string;
  let eventId: string;
  let userId: string;
  let qrCode: string;

  beforeAll(async () => {
    // Setup test environment
    authToken = await getTestAuthToken();
    organizationId = await createTestOrganization();
    userId = await createTestUser(organizationId);
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
  });

  describe('Complete Event Lifecycle', () => {
    it('should create event, generate QR, record attendance, and generate certificate', async () => {
      // 1. Create Event
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Integration Test Event',
          description: 'Test event for integration testing',
          startDateTime: new Date(Date.now() + 3600000).toISOString(),
          endDateTime: new Date(Date.now() + 7200000).toISOString(),
          location: 'Test Location',
          capacity: 100,
          participants: [userId],
          organizationId
        });

      expect(eventResponse.status).toBe(201);
      expect(eventResponse.body.success).toBe(true);
      eventId = eventResponse.body.data.id;

      // 2. Generate QR Code
      const qrResponse = await request(app)
        .post(`/api/events/${eventId}/qr-code`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          expirationMinutes: 60
        });

      expect(qrResponse.status).toBe(200);
      expect(qrResponse.body.success).toBe(true);
      qrCode = qrResponse.body.data.qrCode;

      // 3. Validate QR Code
      const qrValidationResponse = await request(app)
        .post('/api/qr/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          qrData: qrCode
        });

      expect(qrValidationResponse.status).toBe(200);
      expect(qrValidationResponse.body.success).toBe(true);
      expect(qrValidationResponse.body.data.eventId).toBe(eventId);

      // 4. Record Attendance via QR
      const attendanceResponse = await request(app)
        .post('/api/attendance/checkin')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          eventId,
          userId,
          method: 'qr_code',
          qrCodeData: qrCode,
          timestamp: new Date().toISOString()
        });

      expect(attendanceResponse.status).toBe(201);
      expect(attendanceResponse.body.success).toBe(true);
      expect(attendanceResponse.body.data.status).toBe('present');

      // 5. Get Event Statistics
      const statsResponse = await request(app)
        .get(`/api/events/${eventId}/stats`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(statsResponse.status).toBe(200);
      expect(statsResponse.body.data.presentCount).toBe(1);
      expect(statsResponse.body.data.attendanceRate).toBe(100);

      // 6. Generate Certificate
      const certificateResponse = await request(app)
        .post(`/api/certificates/attendance/${attendanceResponse.body.data.id}/generate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(certificateResponse.status).toBe(201);
      expect(certificateResponse.body.success).toBe(true);
      expect(certificateResponse.body.data.downloadUrl).toBeDefined();

      // 7. Validate Certificate
      const certificateId = certificateResponse.body.data.id;
      const validationResponse = await request(app)
        .get(`/api/certificates/validate/${certificateId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(validationResponse.status).toBe(200);
      expect(validationResponse.body.data.isValid).toBe(true);
    });
  });

  describe('Multi-Session Event Flow', () => {
    it('should handle session-based attendance tracking', async () => {
      // 1. Create Event with Sessions
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Multi-Session Event',
          startDateTime: new Date(Date.now() + 3600000).toISOString(),
          endDateTime: new Date(Date.now() + 10800000).toISOString(),
          participants: [userId],
          organizationId,
          hasSessions: true
        });

      eventId = eventResponse.body.data.id;

      // 2. Create Sessions
      const session1Response = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          eventId,
          title: 'Session 1',
          startTime: new Date(Date.now() + 3600000).toISOString(),
          endTime: new Date(Date.now() + 5400000).toISOString(),
          isRequired: true,
          order: 1
        });

      const session2Response = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          eventId,
          title: 'Session 2',
          startTime: new Date(Date.now() + 5400000).toISOString(),
          endTime: new Date(Date.now() + 7200000).toISOString(),
          isRequired: false,
          order: 2
        });

      const session1Id = session1Response.body.data.id;
      const session2Id = session2Response.body.data.id;

      // 3. Check-in to Session 1
      const session1CheckIn = await request(app)
        .post('/api/sessions/checkin')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: session1Id,
          userId,
          method: 'manual'
        });

      expect(session1CheckIn.status).toBe(201);
      expect(session1CheckIn.body.data.status).toBe('present');

      // 4. Check-out from Session 1
      const session1CheckOut = await request(app)
        .post('/api/sessions/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: session1Id,
          userId
        });

      expect(session1CheckOut.status).toBe(200);
      expect(session1CheckOut.body.data.duration).toBeGreaterThan(0);

      // 5. Skip Session 2 (no check-in)

      // 6. Calculate Partial Attendance
      const partialAttendanceResponse = await request(app)
        .get(`/api/attendance/partial/${userId}/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(partialAttendanceResponse.status).toBe(200);
      const partialData = partialAttendanceResponse.body.data;
      expect(partialData.totalSessions).toBe(2);
      expect(partialData.attendedSessions).toBe(1);
      expect(partialData.requiredSessions).toBe(1);
      expect(partialData.attendedRequiredSessions).toBe(1);
      expect(partialData.requiredAttendancePercentage).toBe(100);
    });
  });

  describe('Offline Sync Flow', () => {
    it('should handle offline attendance synchronization', async () => {
      // 1. Create Event
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Offline Sync Test Event',
          startDateTime: new Date().toISOString(),
          endDateTime: new Date(Date.now() + 3600000).toISOString(),
          participants: [userId],
          organizationId
        });

      eventId = eventResponse.body.data.id;

      // 2. Simulate Offline Attendance
      const offlineAttendanceData = {
        offlineId: `offline_${Date.now()}`,
        eventId,
        userId,
        method: 'manual',
        timestamp: new Date().toISOString(),
        deviceInfo: {
          userAgent: 'test-agent',
          platform: 'test-platform'
        }
      };

      // 3. Sync Offline Attendance
      const syncResponse = await request(app)
        .post('/api/attendance/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send(offlineAttendanceData);

      expect(syncResponse.status).toBe(201);
      expect(syncResponse.body.success).toBe(true);
      expect(syncResponse.body.data.method).toBe('manual');

      // 4. Verify Attendance was Recorded
      const attendanceResponse = await request(app)
        .get(`/api/events/${eventId}/attendances`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(attendanceResponse.status).toBe(200);
      const attendances = attendanceResponse.body.data;
      expect(attendances.length).toBe(1);
      expect(attendances[0].userId).toBe(userId);
    });
  });

  describe('Real-time Dashboard Flow', () => {
    it('should provide real-time attendance updates', async () => {
      // 1. Create Event
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Real-time Test Event',
          startDateTime: new Date().toISOString(),
          endDateTime: new Date(Date.now() + 3600000).toISOString(),
          participants: [userId],
          organizationId
        });

      eventId = eventResponse.body.data.id;

      // 2. Get Initial Stats
      const initialStatsResponse = await request(app)
        .get(`/api/events/${eventId}/realtime-stats`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(initialStatsResponse.status).toBe(200);
      expect(initialStatsResponse.body.data.presentCount).toBe(0);

      // 3. Record Attendance
      await request(app)
        .post('/api/attendance/checkin')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          eventId,
          userId,
          method: 'manual',
          timestamp: new Date().toISOString()
        });

      // 4. Get Updated Stats
      const updatedStatsResponse = await request(app)
        .get(`/api/events/${eventId}/realtime-stats`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(updatedStatsResponse.status).toBe(200);
      expect(updatedStatsResponse.body.data.presentCount).toBe(1);
      expect(updatedStatsResponse.body.data.attendanceRate).toBe(100);
    });
  });

  describe('Biometric Authentication Flow', () => {
    it('should handle biometric check-in', async () => {
      // 1. Create Event
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Biometric Test Event',
          startDateTime: new Date().toISOString(),
          endDateTime: new Date(Date.now() + 3600000).toISOString(),
          participants: [userId],
          organizationId
        });

      eventId = eventResponse.body.data.id;

      // 2. Enroll Biometric Data (simulation)
      const enrollmentResponse = await request(app)
        .post('/api/biometric/enroll')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId,
          biometricData: 'simulated_biometric_template',
          biometricType: 'fingerprint'
        });

      expect(enrollmentResponse.status).toBe(201);

      // 3. Biometric Check-in
      const biometricCheckInResponse = await request(app)
        .post('/api/attendance/checkin')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          eventId,
          userId,
          method: 'biometric',
          biometricData: 'simulated_biometric_scan',
          timestamp: new Date().toISOString()
        });

      expect(biometricCheckInResponse.status).toBe(201);
      expect(biometricCheckInResponse.body.data.method).toBe('biometric');
      expect(biometricCheckInResponse.body.data.status).toBe('present');
    });
  });

  describe('Analytics and Reporting Flow', () => {
    it('should generate comprehensive analytics', async () => {
      // 1. Create Multiple Events with Attendance
      const events = [];
      for (let i = 0; i < 3; i++) {
        const eventResponse = await request(app)
          .post('/api/events')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: `Analytics Test Event ${i + 1}`,
            startDateTime: new Date(Date.now() - (i * 86400000)).toISOString(), // Past events
            endDateTime: new Date(Date.now() - (i * 86400000) + 3600000).toISOString(),
            participants: [userId],
            organizationId
          });

        events.push(eventResponse.body.data.id);

        // Record attendance for each event
        await request(app)
          .post('/api/attendance/checkin')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            eventId: eventResponse.body.data.id,
            userId,
            method: 'manual',
            timestamp: new Date(Date.now() - (i * 86400000) + 1800000).toISOString()
          });
      }

      // 2. Get User Attendance Pattern
      const patternResponse = await request(app)
        .get(`/api/analytics/user-pattern/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ organizationId, periodMonths: 1 });

      expect(patternResponse.status).toBe(200);
      const pattern = patternResponse.body.data;
      expect(pattern.totalEvents).toBe(3);
      expect(pattern.attendedEvents).toBe(3);
      expect(pattern.attendanceRate).toBe(100);

      // 3. Get Organization Metrics
      const metricsResponse = await request(app)
        .get(`/api/analytics/organization-metrics/${organizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: new Date(Date.now() - 7 * 86400000).toISOString(),
          endDate: new Date().toISOString()
        });

      expect(metricsResponse.status).toBe(200);
      const metrics = metricsResponse.body.data;
      expect(metrics.totalEvents).toBe(3);
      expect(metrics.overallAttendanceRate).toBe(100);

      // 4. Generate Predictive Insights
      const insightsResponse = await request(app)
        .get(`/api/analytics/predictive-insights/${events[0]}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(insightsResponse.status).toBe(200);
      const insights = insightsResponse.body.data;
      expect(insights.predictedAttendance).toBeGreaterThan(0);
      expect(insights.confidenceLevel).toBeGreaterThan(0);
      expect(insights.recommendations).toBeDefined();
    });
  });

  describe('Load Testing', () => {
    it('should handle concurrent check-ins', async () => {
      // 1. Create Large Event
      const participants = Array.from({ length: 100 }, (_, i) => `user-${i}`);
      
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Load Test Event',
          startDateTime: new Date().toISOString(),
          endDateTime: new Date(Date.now() + 3600000).toISOString(),
          participants,
          organizationId,
          capacity: 100
        });

      eventId = eventResponse.body.data.id;

      // 2. Simulate Concurrent Check-ins
      const checkInPromises = participants.slice(0, 50).map(participantId =>
        request(app)
          .post('/api/attendance/checkin')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            eventId,
            userId: participantId,
            method: 'manual',
            timestamp: new Date().toISOString()
          })
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(checkInPromises);
      const endTime = Date.now();

      // 3. Verify Results
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const duration = endTime - startTime;

      expect(successful).toBeGreaterThan(45); // Allow for some failures
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      // 4. Verify Final Stats
      const statsResponse = await request(app)
        .get(`/api/events/${eventId}/stats`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(statsResponse.body.data.presentCount).toBe(successful);
    });
  });

  // Helper functions
  async function getTestAuthToken(): Promise<string> {
    // Implementation depends on your auth system
    return 'test-auth-token';
  }

  async function createTestOrganization(): Promise<string> {
    const response = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Organization',
        domain: 'test.com'
      });
    
    return response.body.data.id;
  }

  async function createTestUser(orgId: string): Promise<string> {
    const response = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test User',
        email: 'test@test.com',
        organizationId: orgId
      });
    
    return response.body.data.id;
  }

  async function cleanupTestData(): Promise<void> {
    // Clean up test data
    // Implementation depends on your database structure
  }
});