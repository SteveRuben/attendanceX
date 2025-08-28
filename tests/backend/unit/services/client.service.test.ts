// tests/backend/unit/services/client.service.test.ts
import { ClientService } from '../../../../backend/functions/src/services/client.service';
import { ClientModel } from '../../../../backend/functions/src/models/client.model';
import { 
  Client,
  REMINDER_METHODS,
  SUPPORTED_LANGUAGES
} from '@attendance-x/shared';
import { getFirestore } from 'firebase-admin/firestore';

// Mock Firebase
jest.mock('firebase-admin/firestore');
jest.mock('../../../../backend/functions/src/models/client.model');

// Mock static methods
const mockClientModelFromFirestore = jest.fn();
(ClientModel as any).fromFirestore = mockClientModelFromFirestore;

// Mock Firestore
const mockDoc = {
  get: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
};

const mockAdd = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();
const mockLimit = jest.fn();
const mockOffset = jest.fn();
const mockCount = jest.fn();

const mockCollection = {
  doc: jest.fn(() => mockDoc),
  add: mockAdd,
  where: mockWhere
};

const mockFirestore = {
  collection: jest.fn(() => mockCollection)
};

(getFirestore as jest.Mock).mockReturnValue(mockFirestore);

// Mock data
const mockClientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> = {
  organizationId: 'org-123',
  firstName: 'Jean',
  lastName: 'Dupont',
  email: 'jean.dupont@example.com',
  phone: '+33123456789',
  preferences: {
    reminderMethod: REMINDER_METHODS.EMAIL,
    language: SUPPORTED_LANGUAGES.FR,
    timezone: 'Europe/Paris'
  }
};

const mockClient: Client = {
  id: 'client-123',
  ...mockClientData,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
};

const mockClientModel = {
  data: mockClient,
  validate: jest.fn(),
  toFirestore: jest.fn(() => ({ ...mockClient })),
  updatePreferences: jest.fn(),
  anonymize: jest.fn(),
  exportData: jest.fn(() => ({ personalInfo: {}, preferences: {}, metadata: {} })),
  canBeDeleted: jest.fn(() => ({ canDelete: true, reasons: [] })),
  matchesSearch: jest.fn(() => true)
};

describe('ClientService', () => {
  let clientService: ClientService;

  beforeEach(() => {
    jest.clearAllMocks();
    clientService = new ClientService();
    
    // Reset mock implementations
    mockWhere.mockReturnValue({
      where: mockWhere,
      orderBy: mockOrderBy,
      limit: mockLimit,
      offset: mockOffset,
      get: jest.fn(),
      count: () => ({ get: mockCount })
    });
    
    mockOrderBy.mockReturnValue({
      orderBy: mockOrderBy,
      limit: mockLimit,
      offset: mockOffset,
      get: jest.fn()
    });
    
    mockLimit.mockReturnValue({
      limit: mockLimit,
      offset: mockOffset,
      get: jest.fn()
    });
    
    mockOffset.mockReturnValue({
      get: jest.fn()
    });
  });

  describe('createClient', () => {
    it('should create a new client successfully', async () => {
      // Mock no duplicate found
      mockWhere.mockReturnValueOnce({
        where: mockWhere,
        limit: mockLimit,
        get: jest.fn().mockResolvedValue({ empty: true })
      });
      
      mockWhere.mockReturnValueOnce({
        where: mockWhere,
        limit: mockLimit,
        get: jest.fn().mockResolvedValue({ empty: true })
      });

      // Mock client creation
      mockAdd.mockResolvedValue({ id: 'client-123' });
      mockDoc.get.mockResolvedValue({ exists: true, id: 'client-123', data: () => mockClient });
      mockClientModelFromFirestore.mockReturnValue(mockClientModel);
      
      // Mock ClientModel constructor and validation
      (ClientModel as any).mockImplementation(() => mockClientModel);

      const result = await clientService.createClient(mockClientData, 'user-123');

      expect(result).toBe(mockClientModel);
      expect(mockClientModel.validate).toHaveBeenCalled();
      expect(mockAdd).toHaveBeenCalled();
    });

    it('should throw error if duplicate email exists', async () => {
      // Mock duplicate email found
      mockWhere.mockReturnValueOnce({
        where: mockWhere,
        limit: mockLimit,
        get: jest.fn().mockResolvedValue({ 
          empty: false,
          docs: [{ id: 'existing-client' }]
        })
      });

      await expect(
        clientService.createClient(mockClientData, 'user-123')
      ).rejects.toThrow('Client already exists with email: jean.dupont@example.com');
    });

    it('should throw error if duplicate phone exists', async () => {
      // Mock no email duplicate but phone duplicate
      mockWhere.mockReturnValueOnce({
        where: mockWhere,
        limit: mockLimit,
        get: jest.fn().mockResolvedValue({ empty: true })
      });
      
      mockWhere.mockReturnValueOnce({
        where: mockWhere,
        limit: mockLimit,
        get: jest.fn().mockResolvedValue({ 
          empty: false,
          docs: [{ id: 'existing-client' }]
        })
      });

      await expect(
        clientService.createClient(mockClientData, 'user-123')
      ).rejects.toThrow('Client already exists with phone: +33123456789');
    });

    it('should throw error if validation fails', async () => {
      // Mock no duplicates
      mockWhere.mockReturnValue({
        where: mockWhere,
        limit: mockLimit,
        get: jest.fn().mockResolvedValue({ empty: true })
      });

      // Mock validation failure
      const mockInvalidClientModel = {
        ...mockClientModel,
        validate: jest.fn().mockRejectedValue(new Error('Invalid email format'))
      };
      
      (ClientModel as any).mockImplementation(() => mockInvalidClientModel);

      await expect(
        clientService.createClient(mockClientData, 'user-123')
      ).rejects.toThrow('Invalid email format');
    });
  });

  describe('updateClient', () => {
    it('should update client successfully', async () => {
      // Mock existing client
      mockDoc.get.mockResolvedValue({ exists: true, id: 'client-123', data: () => mockClient });
      mockClientModelFromFirestore.mockReturnValue(mockClientModel);

      // Mock no duplicates for updated data
      mockWhere.mockReturnValue({
        where: mockWhere,
        limit: mockLimit,
        get: jest.fn().mockResolvedValue({ empty: true })
      });

      // Mock updated client model
      const updatedClientModel = {
        ...mockClientModel,
        data: { ...mockClient, firstName: 'Pierre' }
      };
      (ClientModel as any).mockImplementation(() => updatedClientModel);

      const updates = { firstName: 'Pierre' };
      const result = await clientService.updateClient('client-123', updates, 'user-123');

      expect(result).toBe(mockClientModel);
      expect(mockDoc.update).toHaveBeenCalled();
    });

    it('should throw error if client not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });
      mockClientModelFromFirestore.mockReturnValue(null);

      await expect(
        clientService.updateClient('client-123', { firstName: 'Pierre' }, 'user-123')
      ).rejects.toThrow('Client not found');
    });

    it('should throw error if duplicate email in update', async () => {
      // Mock existing client
      mockDoc.get.mockResolvedValue({ exists: true, id: 'client-123', data: () => mockClient });
      mockClientModelFromFirestore.mockReturnValue(mockClientModel);

      // Mock duplicate email found
      mockWhere.mockReturnValueOnce({
        where: mockWhere,
        limit: mockLimit,
        get: jest.fn().mockResolvedValue({ 
          empty: false,
          docs: [{ id: 'other-client' }]
        })
      });

      const updates = { email: 'duplicate@example.com' };
      
      await expect(
        clientService.updateClient('client-123', updates, 'user-123')
      ).rejects.toThrow('Another client already exists with email: duplicate@example.com');
    });
  });

  describe('deleteClient', () => {
    it('should delete client successfully', async () => {
      mockDoc.get.mockResolvedValue({ exists: true, id: 'client-123', data: () => mockClient });
      mockClientModelFromFirestore.mockReturnValue(mockClientModel);

      await clientService.deleteClient('client-123', 'user-123');

      expect(mockDoc.delete).toHaveBeenCalled();
    });

    it('should throw error if client not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });
      mockClientModelFromFirestore.mockReturnValue(null);

      await expect(
        clientService.deleteClient('client-123', 'user-123')
      ).rejects.toThrow('Client not found');
    });

    it('should throw error if client cannot be deleted', async () => {
      const mockClientModelWithRestrictions = {
        ...mockClientModel,
        canBeDeleted: jest.fn(() => ({ 
          canDelete: false, 
          reasons: ['Has future appointments'] 
        }))
      };

      mockDoc.get.mockResolvedValue({ exists: true, id: 'client-123', data: () => mockClient });
      mockClientModelFromFirestore.mockReturnValue(mockClientModelWithRestrictions);

      await expect(
        clientService.deleteClient('client-123', 'user-123')
      ).rejects.toThrow('Cannot delete client: Has future appointments');
    });
  });

  describe('getClientById', () => {
    it('should return client if found', async () => {
      mockDoc.get.mockResolvedValue({ exists: true, id: 'client-123', data: () => mockClient });
      mockClientModelFromFirestore.mockReturnValue(mockClientModel);

      const result = await clientService.getClientById('client-123');

      expect(result).toBe(mockClientModel);
      expect(mockDoc.get).toHaveBeenCalled();
    });

    it('should return null if client not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });
      mockClientModelFromFirestore.mockReturnValue(null);

      const result = await clientService.getClientById('client-123');

      expect(result).toBeNull();
    });
  });

  describe('getClients', () => {
    it('should return clients with pagination', async () => {
      const mockSnapshot = {
        docs: [
          { id: 'client-1', data: () => mockClient },
          { id: 'client-2', data: () => mockClient }
        ]
      };

      const mockQuery = {
        orderBy: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot)
      };

      mockWhere.mockReturnValue(mockQuery);
      mockClientModelFromFirestore.mockReturnValue(mockClientModel);
      mockCount.mockResolvedValue({ data: () => ({ count: 10 }) });

      const result = await clientService.getClients('org-123', {
        limit: 5,
        offset: 0,
        sortBy: 'firstName',
        sortOrder: 'asc'
      });

      expect(result.clients).toHaveLength(2);
      expect(result.total).toBe(10);
      expect(mockQuery.orderBy).toHaveBeenCalledWith('firstName', 'asc');
      expect(mockQuery.limit).toHaveBeenCalledWith(5);
    });

    it('should filter clients by search query', async () => {
      const mockSnapshot = {
        docs: [
          { id: 'client-1', data: () => mockClient }
        ]
      };

      const mockQuery = {
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot)
      };

      mockWhere.mockReturnValue(mockQuery);
      mockClientModelFromFirestore.mockReturnValue(mockClientModel);
      mockCount.mockResolvedValue({ data: () => ({ count: 1 }) });

      const result = await clientService.getClients('org-123', {
        searchQuery: 'Jean'
      });

      expect(mockClientModel.matchesSearch).toHaveBeenCalledWith('Jean');
      expect(result.clients).toHaveLength(1);
    });
  });

  describe('findClientByContact', () => {
    it('should find client by email', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [{ id: 'client-123', data: () => mockClient }]
      };

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot)
      };

      mockWhere.mockReturnValue(mockQuery);
      mockClientModelFromFirestore.mockReturnValue(mockClientModel);

      const result = await clientService.findClientByContact('org-123', 'jean.dupont@example.com');

      expect(result).toBe(mockClientModel);
      expect(mockQuery.where).toHaveBeenCalledWith('email', '==', 'jean.dupont@example.com');
    });

    it('should find client by phone', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [{ id: 'client-123', data: () => mockClient }]
      };

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot)
      };

      mockWhere.mockReturnValue(mockQuery);
      mockClientModelFromFirestore.mockReturnValue(mockClientModel);

      const result = await clientService.findClientByContact('org-123', undefined, '+33123456789');

      expect(result).toBe(mockClientModel);
      expect(mockQuery.where).toHaveBeenCalledWith('phone', '==', '+33123456789');
    });

    it('should return null if no contact provided', async () => {
      const result = await clientService.findClientByContact('org-123');

      expect(result).toBeNull();
    });

    it('should return null if client not found', async () => {
      const mockSnapshot = { empty: true };

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot)
      };

      mockWhere.mockReturnValue(mockQuery);

      const result = await clientService.findClientByContact('org-123', 'notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('updateClientPreferences', () => {
    it('should update client preferences successfully', async () => {
      mockDoc.get.mockResolvedValue({ exists: true, id: 'client-123', data: () => mockClient });
      mockClientModelFromFirestore.mockReturnValue(mockClientModel);

      const newPreferences = { reminderMethod: REMINDER_METHODS.SMS };
      const result = await clientService.updateClientPreferences('client-123', newPreferences, 'user-123');

      expect(mockClientModel.updatePreferences).toHaveBeenCalledWith(newPreferences, 'user-123');
      expect(mockClientModel.validate).toHaveBeenCalled();
      expect(mockDoc.update).toHaveBeenCalled();
      expect(result).toBe(mockClientModel);
    });

    it('should throw error if client not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });
      mockClientModelFromFirestore.mockReturnValue(null);

      await expect(
        clientService.updateClientPreferences('client-123', {}, 'user-123')
      ).rejects.toThrow('Client not found');
    });
  });

  describe('anonymizeClient', () => {
    it('should anonymize client successfully', async () => {
      mockDoc.get.mockResolvedValue({ exists: true, id: 'client-123', data: () => mockClient });
      mockClientModelFromFirestore.mockReturnValue(mockClientModel);

      const result = await clientService.anonymizeClient('client-123', 'user-123');

      expect(mockClientModel.anonymize).toHaveBeenCalledWith('user-123');
      expect(mockDoc.update).toHaveBeenCalled();
      expect(result).toBe(mockClientModel);
    });

    it('should throw error if client not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });
      mockClientModelFromFirestore.mockReturnValue(null);

      await expect(
        clientService.anonymizeClient('client-123', 'user-123')
      ).rejects.toThrow('Client not found');
    });
  });

  describe('exportClientData', () => {
    it('should export client data successfully', async () => {
      mockDoc.get.mockResolvedValue({ exists: true, id: 'client-123', data: () => mockClient });
      mockClientModelFromFirestore.mockReturnValue(mockClientModel);

      const result = await clientService.exportClientData('client-123');

      expect(mockClientModel.exportData).toHaveBeenCalled();
      expect(result).toEqual({ personalInfo: {}, preferences: {}, metadata: {} });
    });

    it('should throw error if client not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });
      mockClientModelFromFirestore.mockReturnValue(null);

      await expect(
        clientService.exportClientData('client-123')
      ).rejects.toThrow('Client not found');
    });
  });

  describe('validateClientData', () => {
    it('should return valid for correct data', async () => {
      const mockValidClientModel = {
        validate: jest.fn().mockResolvedValue(true)
      };
      (ClientModel as any).mockImplementation(() => mockValidClientModel);

      const result = await clientService.validateClientData(mockClientData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid with errors for incorrect data', async () => {
      const mockInvalidClientModel = {
        validate: jest.fn().mockRejectedValue(new Error('Invalid email format'))
      };
      (ClientModel as any).mockImplementation(() => mockInvalidClientModel);

      const result = await clientService.validateClientData(mockClientData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });
  });

  describe('getClientStats', () => {
    it('should return client statistics', async () => {
      const mockClients = [
        { 
          data: { 
            ...mockClient, 
            createdAt: new Date(),
            preferences: { language: SUPPORTED_LANGUAGES.FR, reminderMethod: REMINDER_METHODS.EMAIL }
          }
        },
        { 
          data: { 
            ...mockClient, 
            id: 'client-2',
            createdAt: new Date('2023-01-01'),
            preferences: { language: SUPPORTED_LANGUAGES.EN, reminderMethod: REMINDER_METHODS.SMS }
          }
        }
      ];

      const mockSnapshot = {
        docs: mockClients.map((client, index) => ({ 
          id: `client-${index + 1}`, 
          data: () => client.data 
        }))
      };

      const mockQuery = {
        get: jest.fn().mockResolvedValue(mockSnapshot)
      };

      mockWhere.mockReturnValue(mockQuery);
      mockClientModelFromFirestore
        .mockReturnValueOnce(mockClients[0])
        .mockReturnValueOnce(mockClients[1]);

      const result = await clientService.getClientStats('org-123');

      expect(result.totalClients).toBe(2);
      expect(result.newClientsThisMonth).toBe(1);
      expect(result.clientsByLanguage).toEqual({
        [SUPPORTED_LANGUAGES.FR]: 1,
        [SUPPORTED_LANGUAGES.EN]: 1
      });
      expect(result.clientsByReminderMethod).toEqual({
        [REMINDER_METHODS.EMAIL]: 1,
        [REMINDER_METHODS.SMS]: 1
      });
    });
  });

  describe('importClients', () => {
    it('should import clients successfully', async () => {
      const clientsData = [mockClientData, { ...mockClientData, email: 'client2@example.com' }];

      // Mock successful creation for both clients
      mockWhere.mockReturnValue({
        where: mockWhere,
        limit: mockLimit,
        get: jest.fn().mockResolvedValue({ empty: true })
      });

      mockAdd.mockResolvedValue({ id: 'client-123' });
      mockDoc.get.mockResolvedValue({ exists: true, id: 'client-123', data: () => mockClient });
      mockClientModelFromFirestore.mockReturnValue(mockClientModel);
      (ClientModel as any).mockImplementation(() => mockClientModel);

      const result = await clientService.importClients('org-123', clientsData, 'user-123');

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
    });

    it('should handle import failures', async () => {
      const clientsData = [mockClientData];

      // Mock duplicate found (failure case)
      mockWhere.mockReturnValue({
        where: mockWhere,
        limit: mockLimit,
        get: jest.fn().mockResolvedValue({ 
          empty: false,
          docs: [{ id: 'existing-client' }]
        })
      });

      const result = await clientService.importClients('org-123', clientsData, 'user-123');

      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toContain('Client already exists');
    });
  });
});