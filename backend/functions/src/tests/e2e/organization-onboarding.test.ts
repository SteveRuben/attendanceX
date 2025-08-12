import request from 'supertest';
import { app } from '../../app';
import { OrganizationSector } from '@attendance-x/shared';

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: {
    applicationDefault: jest.fn()
  },
  auth: () => ({
    verifyIdToken: jest.fn().mockResolvedValue({
      uid: 'test-user-123',
      email: 'test@example.com'
    })
  })
}));

// Mock Firestore
const mockFirestore = {
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    })),
    add: jest.fn(),
    where: jest.fn(() => ({
      get: jest.fn(),
      limit: jest.fn(() => ({
        get: jest.fn()
      }))
    }))
  }))
};

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockFirestore
}));

describe('Organization Onboarding E2E', () => {
  const authToken = 'mock-jwt-token';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/organizations', () => {
    it('should create organization successfully', async () => {
      // Mock user document
      const mockUserDoc = {
        exists: true,
        data: () => ({
          id: 'test-user-123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          organizationId: null
        })
      };

      // Mock organization creation
      const mockOrgDoc = { id: 'new-org-123' };

      mockFirestore.collection.mockImplementation((collectionName: string) => {
        if (collectionName === 'users') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockUserDoc),
              update: jest.fn().mockResolvedValue(undefined)
            })
          };
        }
        if (collectionName === 'organizations') {
          return {
            add: jest.fn().mockResolvedValue(mockOrgDoc)
          };
        }
        return {
          doc: () => ({ get: jest.fn(), set: jest.fn(), update: jest.fn() }),
          add: jest.fn(),
          where: () => ({ get: jest.fn() })
        };
      });

      const response = await request(app)
        .post('/api/v1/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Organization',
          description: 'A test organization',
          sector: OrganizationSector.TECHNOLOGY,
          website: 'https://test.com',
          address: {
            street: '123 Test Street',
            city: 'Test City',
            postalCode: '12345',
            country: 'Test Country'
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Organization');
      expect(response.body.data.sector).toBe(OrganizationSector.TECHNOLOGY);
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/v1/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'AB', // Too short
          sector: 'INVALID_SECTOR'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/organizations')
        .send({
          name: 'Test Organization',
          sector: OrganizationSector.TECHNOLOGY
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/organizations/:id/invitations', () => {
    it('should send invitation successfully', async () => {
      const organizationId = 'test-org-123';

      // Mock organization document
      const mockOrgDoc = {
        exists: true,
        data: () => ({
          id: organizationId,
          name: 'Test Organization',
          ownerId: 'test-user-123'
        })
      };

      // Mock queries
      const mockEmptyQuery = { empty: true, docs: [] };
      const mockInvitationDoc = { id: 'invitation-123' };

      mockFirestore.collection.mockImplementation((collectionName: string) => {
        if (collectionName === 'organizations') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockOrgDoc)
            })
          };
        }
        if (collectionName === 'users') {
          return {
            where: () => ({
              get: jest.fn().mockResolvedValue(mockEmptyQuery)
            })
          };
        }
        if (collectionName === 'user_invitations') {
          return {
            where: () => ({
              get: jest.fn().mockResolvedValue(mockEmptyQuery)
            }),
            add: jest.fn().mockResolvedValue(mockInvitationDoc)
          };
        }
        return {
          doc: () => ({ get: jest.fn(), set: jest.fn() }),
          add: jest.fn(),
          where: () => ({ get: jest.fn() })
        };
      });

      const response = await request(app)
        .post(`/api/v1/organizations/${organizationId}/invitations`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'newuser@example.com',
          role: 'member'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('newuser@example.com');
    });

    it('should return 404 for non-existent organization', async () => {
      const mockOrgDoc = { exists: false };

      mockFirestore.collection.mockImplementation((collectionName: string) => {
        if (collectionName === 'organizations') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockOrgDoc)
            })
          };
        }
        return {
          doc: () => ({ get: jest.fn() }),
          where: () => ({ get: jest.fn() })
        };
      });

      const response = await request(app)
        .post('/api/v1/organizations/nonexistent/invitations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'newuser@example.com',
          role: 'member'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/organizations/invitations/accept', () => {
    it('should accept invitation successfully', async () => {
      const invitationToken = 'valid-invitation-token';

      // Mock invitation document
      const mockInvitationDoc = {
        exists: true,
        data: () => ({
          id: 'invitation-123',
          organizationId: 'test-org-123',
          email: 'newuser@example.com',
          role: 'member',
          token: invitationToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
          status: 'pending'
        })
      };

      // Mock organization document
      const mockOrgDoc = {
        exists: true,
        data: () => ({
          id: 'test-org-123',
          name: 'Test Organization',
          memberCount: 1
        })
      };

      // Mock user document
      const mockUserDoc = {
        exists: true,
        data: () => ({
          id: 'test-user-123',
          email: 'newuser@example.com',
          organizationId: null
        })
      };

      mockFirestore.collection.mockImplementation((collectionName: string) => {
        if (collectionName === 'user_invitations') {
          return {
            where: () => ({
              limit: () => ({
                get: jest.fn().mockResolvedValue({
                  empty: false,
                  docs: [{ ...mockInvitationDoc, id: 'invitation-123' }]
                })
              })
            }),
            doc: () => ({
              update: jest.fn().mockResolvedValue(undefined)
            })
          };
        }
        if (collectionName === 'organizations') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockOrgDoc),
              update: jest.fn().mockResolvedValue(undefined)
            })
          };
        }
        if (collectionName === 'users') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockUserDoc),
              update: jest.fn().mockResolvedValue(undefined)
            })
          };
        }
        return {
          doc: () => ({ get: jest.fn(), update: jest.fn() }),
          where: () => ({ get: jest.fn() })
        };
      });

      const response = await request(app)
        .post('/api/v1/organizations/invitations/accept')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: invitationToken
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 for invalid token', async () => {
      const mockEmptyQuery = { empty: true, docs: [] };

      mockFirestore.collection.mockImplementation(() => ({
        where: () => ({
          limit: () => ({
            get: jest.fn().mockResolvedValue(mockEmptyQuery)
          })
        })
      }));

      const response = await request(app)
        .post('/api/v1/organizations/invitations/accept')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: 'invalid-token'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/organizations/:id', () => {
    it('should get organization details', async () => {
      const organizationId = 'test-org-123';

      const mockOrgDoc = {
        exists: true,
        id: organizationId,
        data: () => ({
          name: 'Test Organization',
          sector: OrganizationSector.TECHNOLOGY,
          memberCount: 5,
          status: 'active'
        })
      };

      mockFirestore.collection.mockImplementation(() => ({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockOrgDoc)
        })
      }));

      const response = await request(app)
        .get(`/api/v1/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Organization');
      expect(response.body.data.sector).toBe(OrganizationSector.TECHNOLOGY);
    });

    it('should return 404 for non-existent organization', async () => {
      const mockOrgDoc = { exists: false };

      mockFirestore.collection.mockImplementation(() => ({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockOrgDoc)
        })
      }));

      const response = await request(app)
        .get('/api/v1/organizations/nonexistent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});