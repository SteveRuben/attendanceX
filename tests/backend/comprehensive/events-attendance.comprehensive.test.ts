/**
 * Tests complets pour le système d'événements et de présence
 */

import request from 'supertest';
import { Express } from 'express';
import { setupTestApp, cleanupTestApp, createTestUser, createTestTenant, getAuthToken } from '../helpers/test-setup';
import { collections } from '../../../backend/functions/src/config/database';

describe('Events and Attendance System - Comprehensive Tests', () => {
  let app: Express;
  let testUser: any;
  let testTenant: any;
  let authToken: string;
  let organizerUser: any;
  let organizerToken: string;
  let testEvent: any;

  beforeAll(async () => {
    app = await setupTestApp();
    testTenant = await createTestTenant();
    
    // Create organizer user with proper permissions
    organizerUser = await createTestUser({ 
      tenantId: testTenant.id,
      role: 'organizer',
      permissions: {
        create_events: true,
        manage_events: true,
        view_all_events: true,
        manage_attendance: true
      }
    });
    organizerToken = await getAuthToken(organizerUser);

    // Create regular user
    testUser = await createTestUser({ 
      tenantId: testTenant.id,
      role: 'participant',
      permissions: {
        view_events: true,
        create_attendance: true
      }
    });
    authToken = await getAuthToken(testUser);
  });

  afterAll(async () => {
    await cleanupTestApp();
  });

  describe('Event Creation', () => {
    it('should create event successfully with organizer permissions', async () => {
      const eventData = {
        title: 'Team Meeting',
        description: 'Weekly team sync meeting',
        type: 'meeting',
        startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        endTime: new Date(Date.now() + 90000000).toISOString(), // Tomorrow + 1 hour
        location: {
          type: 'physical',
          address: '123 Office Street, City',
          room: 'Conference Room A'
        },
        attendanceSettings: {
          requireCheckIn: true,
          allowLateCheckIn: true,
          graceMinutes: 15,
          trackLocation: true
        },
        recurrence: {
          type: 'weekly',
          interval: 1,
          daysOfWeek: [1], // Monday
          endDate: new Date(Date.now() + 30 * 86400000).toISOString() // 30 days
        }
      };

      const response = await request(app)
        .post('/v1/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(eventData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.event.title).toBe(eventData.title);
      expect(response.body.data.event.organizerId).toBe(organizerUser.uid);
      expect(response.body.data.event.tenantId).toBe(testTenant.id);
      expect(response.body.data.event.status).toBe('scheduled');
      
      testEvent = response.body.data.event;
    });

    it('should reject event creation without proper permissions', async () => {
      const eventData = {
        title: 'Unauthorized Event',
        startTime: new Date(Date.now() + 86400000).toISOString(),
        endTime: new Date(Date.now() + 90000000).toISOString()
      };

      const response = await request(app)
        .post('/v1/events')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(eventData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('permission');
    });

    it('should validate event data on creation', async () => {
      const invalidEventData = {
        title: '', // Empty title
        startTime: 'invalid-date',
        endTime: new Date(Date.now() - 86400000).toISOString() // Past date
      };

      const response = await request(app)
        .post('/v1/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(invalidEventData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should create recurring events correctly', async () => {
      const recurringEventData = {
        title: 'Daily Standup',
        startTime: new Date(Date.now() + 86400000).toISOString(),
        endTime: new Date(Date.now() + 87300000).toISOString(), // +30 minutes
        recurrence: {
          type: 'daily',
          interval: 1,
          daysOfWeek: [1, 2, 3, 4, 5], // Weekdays
          endDate: new Date(Date.now() + 7 * 86400000).toISOString() // 1 week
        }
      };

      const response = await request(app)
        .post('/v1/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(recurringEventData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.event.recurrence).toBeDefined();
      expect(response.body.data.recurringInstances).toBeDefined();
      expect(response.body.data.recurringInstances.length).toBeGreaterThan(1);
    });
  });

  describe('Event Retrieval', () => {
    it('should get all events with proper permissions', async () => {
      const response = await request(app)
        .get('/v1/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .query({
          limit: 50,
          offset: 0,
          sortBy: 'startTime',
          sortOrder: 'asc'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.events)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should get specific event by ID', async () => {
      const response = await request(app)
        .get(`/v1/events/${testEvent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testEvent.id);
      expect(response.body.data.title).toBe(testEvent.title);
    });

    it('should filter events by date range', async () => {
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + 7 * 86400000).toISOString();

      const response = await request(app)
        .get('/v1/events')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .query({
          startDate,
          endDate,
          limit: 50
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events.every((event: any) => 
        new Date(event.startTime) >= new Date(startDate) &&
        new Date(event.startTime) <= new Date(endDate)
      )).toBe(true);
    });

    it('should filter events by type', async () => {
      const response = await request(app)
        .get('/v1/events')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .query({
          type: 'meeting',
          limit: 50
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events.every((event: any) => event.type === 'meeting')).toBe(true);
    });

    it('should get user-specific events', async () => {
      const response = await request(app)
        .get('/v1/events/my-events')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.events)).toBe(true);
    });
  });

  describe('Event Updates', () => {
    it('should update event with organizer permissions', async () => {
      const updateData = {
        title: 'Updated Team Meeting',
        description: 'Updated description',
        location: {
          type: 'virtual',
          meetingUrl: 'https://meet.example.com/room123'
        }
      };

      const response = await request(app)
        .put(`/v1/events/${testEvent.id}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.location.type).toBe('virtual');
    });

    it('should reject event update without proper permissions', async () => {
      const updateData = {
        title: 'Unauthorized Update'
      };

      const response = await request(app)
        .put(`/v1/events/${testEvent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('permission');
    });

    it('should update event status', async () => {
      const response = await request(app)
        .patch(`/v1/events/${testEvent.id}/status`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send({ status: 'in_progress' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('in_progress');
    });

    it('should cancel event', async () => {
      // Create a new event to cancel
      const eventToCancel = await request(app)
        .post('/v1/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send({
          title: 'Event to Cancel',
          startTime: new Date(Date.now() + 86400000).toISOString(),
          endTime: new Date(Date.now() + 90000000).toISOString()
        });

      const response = await request(app)
        .patch(`/v1/events/${eventToCancel.body.data.event.id}/cancel`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send({ reason: 'Test cancellation' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('cancelled');
    });
  });

  describe('Event Attendance', () => {
    let attendanceId: string;

    it('should check in to event successfully', async () => {
      const checkInData = {
        eventId: testEvent.id,
        location: {
          latitude: 40.7128,
          longitude: -74.0060
        },
        method: 'manual'
      };

      const response = await request(app)
        .post('/v1/attendances/check-in')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(checkInData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.attendance.eventId).toBe(testEvent.id);
      expect(response.body.data.attendance.userId).toBe(testUser.uid);
      expect(response.body.data.attendance.status).toBe('present');
      
      attendanceId = response.body.data.attendance.id;
    });

    it('should reject duplicate check-in', async () => {
      const checkInData = {
        eventId: testEvent.id,
        method: 'manual'
      };

      const response = await request(app)
        .post('/v1/attendances/check-in')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(checkInData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already');
    });

    it('should check out from event successfully', async () => {
      const checkOutData = {
        attendanceId: attendanceId,
        location: {
          latitude: 40.7128,
          longitude: -74.0060
        }
      };

      const response = await request(app)
        .post('/v1/attendances/check-out')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(checkOutData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.checkOutTime).toBeDefined();
    });

    it('should get attendance records for event', async () => {
      const response = await request(app)
        .get(`/v1/events/${testEvent.id}/attendances`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .query({
          limit: 50,
          offset: 0
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.attendances)).toBe(true);
      expect(response.body.data.attendances.length).toBeGreaterThan(0);
    });

    it('should get user attendance history', async () => {
      const response = await request(app)
        .get('/v1/attendances/my-history')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .query({
          limit: 50,
          startDate: new Date(Date.now() - 30 * 86400000).toISOString(),
          endDate: new Date().toISOString()
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.attendances)).toBe(true);
    });

    it('should mark attendance manually by organizer', async () => {
      const manualAttendanceData = {
        eventId: testEvent.id,
        userId: testUser.uid,
        status: 'present',
        checkInTime: new Date().toISOString(),
        notes: 'Manually marked present'
      };

      const response = await request(app)
        .post('/v1/attendances/manual-mark')
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(manualAttendanceData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.attendance.status).toBe('present');
      expect(response.body.data.attendance.markedBy).toBe(organizerUser.uid);
    });

    it('should update attendance status', async () => {
      const updateData = {
        status: 'late',
        notes: 'Arrived 10 minutes late'
      };

      const response = await request(app)
        .put(`/v1/attendances/${attendanceId}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('late');
    });
  });

  describe('QR Code Check-in', () => {
    let qrCode: string;

    it('should generate QR code for event', async () => {
      const response = await request(app)
        .post(`/v1/events/${testEvent.id}/qr-code`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send({
          expiresIn: 3600, // 1 hour
          allowMultipleScans: false
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.qrCode).toBeDefined();
      expect(response.body.data.qrCodeUrl).toBeDefined();
      
      qrCode = response.body.data.qrCode;
    });

    it('should check in using QR code', async () => {
      const response = await request(app)
        .post('/v1/attendances/qr-check-in')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send({
          qrCode: qrCode,
          location: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.attendance.method).toBe('qr_code');
    });

    it('should reject invalid QR code', async () => {
      const response = await request(app)
        .post('/v1/attendances/qr-check-in')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send({
          qrCode: 'invalid-qr-code'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid');
    });

    it('should reject expired QR code', async () => {
      // This would require creating an expired QR code
      const expiredQrCode = 'expired-qr-code';

      const response = await request(app)
        .post('/v1/attendances/qr-check-in')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send({
          qrCode: expiredQrCode
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('expired');
    });
  });

  describe('Attendance Analytics', () => {
    it('should get event attendance statistics', async () => {
      const response = await request(app)
        .get(`/v1/events/${testEvent.id}/stats`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalInvited).toBeDefined();
      expect(response.body.data.totalPresent).toBeDefined();
      expect(response.body.data.totalAbsent).toBeDefined();
      expect(response.body.data.attendanceRate).toBeDefined();
    });

    it('should get tenant attendance analytics', async () => {
      const response = await request(app)
        .get('/v1/attendances/analytics')
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .query({
          period: '30d',
          groupBy: 'day'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.analytics).toBeDefined();
      expect(Array.isArray(response.body.data.analytics)).toBe(true);
    });

    it('should get user attendance summary', async () => {
      const response = await request(app)
        .get('/v1/attendances/my-summary')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .query({
          period: '30d'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalEvents).toBeDefined();
      expect(response.body.data.attendedEvents).toBeDefined();
      expect(response.body.data.attendanceRate).toBeDefined();
    });
  });

  describe('Event Notifications', () => {
    it('should send event reminder notifications', async () => {
      const response = await request(app)
        .post(`/v1/events/${testEvent.id}/send-reminders`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send({
          reminderType: 'before_event',
          minutesBefore: 30,
          channels: ['email', 'push']
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notificationsSent).toBeDefined();
    });

    it('should send attendance notifications', async () => {
      const response = await request(app)
        .post(`/v1/events/${testEvent.id}/send-attendance-notifications`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send({
          notificationType: 'absence_alert',
          targetUsers: [testUser.uid]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Event Deletion', () => {
    it('should delete event with proper permissions', async () => {
      // Create a new event to delete
      const eventToDelete = await request(app)
        .post('/v1/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .send({
          title: 'Event to Delete',
          startTime: new Date(Date.now() + 86400000).toISOString(),
          endTime: new Date(Date.now() + 90000000).toISOString()
        });

      const response = await request(app)
        .delete(`/v1/events/${eventToDelete.body.data.event.id}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify event is deleted
      const deletedEvent = await request(app)
        .get(`/v1/events/${eventToDelete.body.data.event.id}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(404);

      expect(deletedEvent.body.success).toBe(false);
    });

    it('should reject event deletion without proper permissions', async () => {
      const response = await request(app)
        .delete(`/v1/events/${testEvent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('permission');
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
        role: 'organizer',
        permissions: {
          create_events: true,
          view_all_events: true
        }
      });
      otherToken = await getAuthToken(otherUser);
    });

    it('should not see events from other tenants', async () => {
      // Create event in other tenant
      await request(app)
        .post('/v1/events')
        .set('Authorization', `Bearer ${otherToken}`)
        .set('X-Tenant-ID', otherTenant.id)
        .send({
          title: 'Other Tenant Event',
          startTime: new Date(Date.now() + 86400000).toISOString(),
          endTime: new Date(Date.now() + 90000000).toISOString()
        });

      // Check first tenant only sees their events
      const response = await request(app)
        .get('/v1/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      const eventTitles = response.body.data.events.map((event: any) => event.title);
      expect(eventTitles).not.toContain('Other Tenant Event');
    });

    it('should reject access to other tenant events', async () => {
      const response = await request(app)
        .get(`/v1/events/${testEvent.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .set('X-Tenant-ID', otherTenant.id)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});