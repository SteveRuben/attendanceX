import { OrganizationModel } from '../../models/organization.model';
import { OrganizationSector, OrganizationStatus } from '@attendance-x/shared';

describe('OrganizationModel', () => {
  describe('Validation', () => {
    it('should validate a valid organization', async () => {
      const org = new OrganizationModel({
        name: 'Test Organization',
        sector: OrganizationSector.TECHNOLOGY,
        status: OrganizationStatus.ACTIVE,
        ownerId: 'user123',
        memberCount: 1,
        settings: {
          general: {
            timezone: 'Europe/Paris',
            language: 'fr',
            dateFormat: 'DD/MM/YYYY',
            timeFormat: '24h'
          },
          features: {
            attendanceTracking: true,
            eventManagement: true,
            reportGeneration: true,
            integrations: true
          },
          branding: {
            primaryColor: '#007bff',
            logo: null,
            customDomain: null
          },
          security: {
            twoFactorRequired: false,
            passwordPolicy: {
              minLength: 8,
              requireUppercase: true,
              requireLowercase: true,
              requireNumbers: true,
              requireSpecialChars: false
            },
            sessionTimeout: 24,
            ipWhitelist: []
          },
          notifications: {
            emailNotifications: true,
            pushNotifications: true,
            smsNotifications: false,
            webhookUrl: null
          }
        }
      });

      const isValid = await org.validate();
      expect(isValid).toBe(true);
    });

    it('should fail validation for missing required fields', async () => {
      const org = new OrganizationModel({});

      await expect(org.validate()).rejects.toThrow('Missing required fields');
    });

    it('should fail validation for invalid sector', async () => {
      const org = new OrganizationModel({
        name: 'Test Organization',
        sector: 'INVALID_SECTOR' as OrganizationSector,
        status: OrganizationStatus.ACTIVE,
        ownerId: 'user123'
      });

      await expect(org.validate()).rejects.toThrow('sector must be one of');
    });

    it('should fail validation for name too short', async () => {
      const org = new OrganizationModel({
        name: 'AB',
        sector: OrganizationSector.TECHNOLOGY,
        status: OrganizationStatus.ACTIVE,
        ownerId: 'user123'
      });

      await expect(org.validate()).rejects.toThrow('Name must be between 3 and 100 characters');
    });

    it('should fail validation for name too long', async () => {
      const org = new OrganizationModel({
        name: 'A'.repeat(101),
        sector: OrganizationSector.TECHNOLOGY,
        status: OrganizationStatus.ACTIVE,
        ownerId: 'user123'
      });

      await expect(org.validate()).rejects.toThrow('Name must be between 3 and 100 characters');
    });
  });

  describe('Business Logic', () => {
    it('should add member correctly', () => {
      const org = new OrganizationModel({
        name: 'Test Organization',
        sector: OrganizationSector.TECHNOLOGY,
        status: OrganizationStatus.ACTIVE,
        ownerId: 'user123',
        memberCount: 1
      });

      org.addMember('user456', 'admin');
      expect(org.getData().memberCount).toBe(2);
    });

    it('should remove member correctly', () => {
      const org = new OrganizationModel({
        name: 'Test Organization',
        sector: OrganizationSector.TECHNOLOGY,
        status: OrganizationStatus.ACTIVE,
        ownerId: 'user123',
        memberCount: 2
      });

      org.removeMember('user456');
      expect(org.getData().memberCount).toBe(1);
    });

    it('should not allow member count to go below 1', () => {
      const org = new OrganizationModel({
        name: 'Test Organization',
        sector: OrganizationSector.TECHNOLOGY,
        status: OrganizationStatus.ACTIVE,
        ownerId: 'user123',
        memberCount: 1
      });

      expect(() => org.removeMember('user123')).toThrow('Cannot remove the last member');
    });

    it('should update settings correctly', () => {
      const org = new OrganizationModel({
        name: 'Test Organization',
        sector: OrganizationSector.TECHNOLOGY,
        status: OrganizationStatus.ACTIVE,
        ownerId: 'user123',
        memberCount: 1
      });

      org.updateSettings({
        general: {
          timezone: 'America/New_York',
          language: 'en'
        }
      });

      const settings = org.getData().settings;
      expect(settings?.general?.timezone).toBe('America/New_York');
      expect(settings?.general?.language).toBe('en');
    });
  });

  describe('Firestore Conversion', () => {
    it('should convert to Firestore format correctly', () => {
      const org = new OrganizationModel({
        name: 'Test Organization',
        sector: OrganizationSector.TECHNOLOGY,
        status: OrganizationStatus.ACTIVE,
        ownerId: 'user123',
        memberCount: 1,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02')
      });

      const firestoreData = org.toFirestore();
      
      expect(firestoreData.name).toBe('Test Organization');
      expect(firestoreData.sector).toBe(OrganizationSector.TECHNOLOGY);
      expect(firestoreData.status).toBe(OrganizationStatus.ACTIVE);
      expect(firestoreData.ownerId).toBe('user123');
      expect(firestoreData.memberCount).toBe(1);
      expect(firestoreData.id).toBeUndefined(); // ID should be excluded
    });

    it('should create from Firestore document correctly', () => {
      const mockDoc = {
        id: 'org123',
        exists: true,
        data: () => ({
          name: 'Test Organization',
          sector: OrganizationSector.TECHNOLOGY,
          status: OrganizationStatus.ACTIVE,
          ownerId: 'user123',
          memberCount: 1,
          createdAt: { toDate: () => new Date('2023-01-01') },
          updatedAt: { toDate: () => new Date('2023-01-02') }
        })
      } as any;

      const org = OrganizationModel.fromFirestore(mockDoc);
      
      expect(org).not.toBeNull();
      expect(org!.id).toBe('org123');
      expect(org!.getData().name).toBe('Test Organization');
      expect(org!.getData().sector).toBe(OrganizationSector.TECHNOLOGY);
    });

    it('should return null for non-existent document', () => {
      const mockDoc = {
        exists: false
      } as any;

      const org = OrganizationModel.fromFirestore(mockDoc);
      expect(org).toBeNull();
    });
  });
});