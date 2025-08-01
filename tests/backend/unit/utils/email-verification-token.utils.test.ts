import { EmailVerificationTokenUtils } from '../../../../backend/functions/src/utils/email-verification-token.utils';
import { EmailVerificationTokenModel } from '../../../../backend/functions/src/models/email-verification-token.model';
import { collections } from '../../../../backend/functions/src/config/database';
import { FieldValue } from 'firebase-admin/firestore';

// Mock the database collections
jest.mock('../../../../backend/functions/src/config/database', () => ({
  collections: {
    email_verification_tokens: {
      add: jest.fn(),
      where: jest.fn(),
      doc: jest.fn(),
      firestore: {
        batch: jest.fn()
      }
    }
  }
}));

describe('EmailVerificationTokenUtils', () => {
  let mockTokenModel: EmailVerificationTokenModel;
  let mockCollection: any;
  let mockQuery: any;
  let mockDoc: any;
  let mockBatch: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock token model
    const { model } = EmailVerificationTokenModel.createToken('test-user-id');
    mockTokenModel = model;

    // Setup mock collection
    mockCollection = collections.email_verification_tokens as any;
    
    // Setup mock query chain
    mockQuery = {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      get: jest.fn()
    };
    
    mockCollection.where.mockReturnValue(mockQuery);
    
    // Setup mock document
    mockDoc = {
      update: jest.fn(),
      delete: jest.fn()
    };
    
    mockCollection.doc.mockReturnValue(mockDoc);
    
    // Setup mock batch
    mockBatch = {
      update: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn()
    };
    
    mockCollection.firestore.batch.mockReturnValue(mockBatch);
  });

  describe('saveToken', () => {
    it('should save token and return document ID', async () => {
      const mockDocRef = { id: 'generated-id' };
      mockCollection.add.mockResolvedValue(mockDocRef);
      
      // Mock validate method
      jest.spyOn(mockTokenModel, 'validate').mockResolvedValue(true);
      jest.spyOn(mockTokenModel, 'toFirestore').mockReturnValue({});
      jest.spyOn(mockTokenModel, 'update').mockImplementation(() => {});

      const result = await EmailVerificationTokenUtils.saveToken(mockTokenModel);

      expect(result).toBe('generated-id');
      expect(mockTokenModel.validate).toHaveBeenCalled();
      expect(mockCollection.add).toHaveBeenCalled();
      expect(mockTokenModel.update).toHaveBeenCalledWith({ id: 'generated-id' });
    });

    it('should throw error if validation fails', async () => {
      jest.spyOn(mockTokenModel, 'validate').mockRejectedValue(new Error('Validation failed'));

      await expect(EmailVerificationTokenUtils.saveToken(mockTokenModel))
        .rejects.toThrow('Failed to save email verification token: Validation failed');
    });

    it('should throw error if database save fails', async () => {
      jest.spyOn(mockTokenModel, 'validate').mockResolvedValue(true);
      mockCollection.add.mockRejectedValue(new Error('Database error'));

      await expect(EmailVerificationTokenUtils.saveToken(mockTokenModel))
        .rejects.toThrow('Failed to save email verification token: Database error');
    });
  });

  describe('getTokenByHash', () => {
    it('should return token model when found', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [{
          id: 'doc-id',
          exists: true,
          data: () => ({ userId: 'test-user' })
        }]
      };
      
      mockQuery.get.mockResolvedValue(mockSnapshot);
      jest.spyOn(EmailVerificationTokenModel, 'fromFirestore').mockReturnValue(mockTokenModel);

      const result = await EmailVerificationTokenUtils.getTokenByHash('test-hash');

      expect(result).toBe(mockTokenModel);
      expect(mockCollection.where).toHaveBeenCalledWith('hashedToken', '==', 'test-hash');
      expect(mockQuery.limit).toHaveBeenCalledWith(1);
    });

    it('should return null when token not found', async () => {
      const mockSnapshot = { empty: true };
      mockQuery.get.mockResolvedValue(mockSnapshot);

      const result = await EmailVerificationTokenUtils.getTokenByHash('non-existent-hash');

      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      mockQuery.get.mockRejectedValue(new Error('Database error'));

      await expect(EmailVerificationTokenUtils.getTokenByHash('test-hash'))
        .rejects.toThrow('Failed to retrieve token by hash: Database error');
    });
  });

  describe('getActiveTokensForUser', () => {
    it('should return active tokens for user', async () => {
      const mockSnapshot = {
        docs: [
          { id: 'doc1', exists: true, data: () => ({ userId: 'test-user' }) },
          { id: 'doc2', exists: true, data: () => ({ userId: 'test-user' }) }
        ]
      };
      
      mockQuery.get.mockResolvedValue(mockSnapshot);
      jest.spyOn(EmailVerificationTokenModel, 'fromFirestore')
        .mockReturnValueOnce(mockTokenModel)
        .mockReturnValueOnce(mockTokenModel);

      const result = await EmailVerificationTokenUtils.getActiveTokensForUser('test-user');

      expect(result).toHaveLength(2);
      expect(mockCollection.where).toHaveBeenCalledWith('userId', '==', 'test-user');
      expect(mockQuery.where).toHaveBeenCalledWith('isUsed', '==', false);
      expect(mockQuery.where).toHaveBeenCalledWith('expiresAt', '>', expect.any(Date));
    });

    it('should return empty array when no active tokens found', async () => {
      const mockSnapshot = { docs: [] };
      mockQuery.get.mockResolvedValue(mockSnapshot);

      const result = await EmailVerificationTokenUtils.getActiveTokensForUser('test-user');

      expect(result).toHaveLength(0);
    });
  });

  describe('invalidateAllTokensForUser', () => {
    it('should invalidate all active tokens for user', async () => {
      const mockTokens = [
        { id: 'token1', getTokenData: () => ({ id: 'token1' }) },
        { id: 'token2', getTokenData: () => ({ id: 'token2' }) }
      ];
      
      jest.spyOn(EmailVerificationTokenUtils, 'getActiveTokensForUser')
        .mockResolvedValue(mockTokens as any);

      const result = await EmailVerificationTokenUtils.invalidateAllTokensForUser('test-user');

      expect(result).toBe(2);
      expect(mockBatch.update).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should return 0 when no active tokens found', async () => {
      jest.spyOn(EmailVerificationTokenUtils, 'getActiveTokensForUser')
        .mockResolvedValue([]);

      const result = await EmailVerificationTokenUtils.invalidateAllTokensForUser('test-user');

      expect(result).toBe(0);
      expect(mockBatch.commit).not.toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete expired tokens', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          { ref: 'ref1' },
          { ref: 'ref2' },
          { ref: 'ref3' }
        ]
      };
      
      mockQuery.get.mockResolvedValue(mockSnapshot);

      const result = await EmailVerificationTokenUtils.cleanupExpiredTokens();

      expect(result).toBe(3);
      expect(mockCollection.where).toHaveBeenCalledWith('expiresAt', '<=', expect.any(Date));
      expect(mockBatch.delete).toHaveBeenCalledTimes(3);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should return 0 when no expired tokens found', async () => {
      const mockSnapshot = { empty: true };
      mockQuery.get.mockResolvedValue(mockSnapshot);

      const result = await EmailVerificationTokenUtils.cleanupExpiredTokens();

      expect(result).toBe(0);
      expect(mockBatch.commit).not.toHaveBeenCalled();
    });
  });

  describe('cleanupUsedTokens', () => {
    it('should delete used tokens older than specified days', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          { ref: 'ref1' },
          { ref: 'ref2' }
        ]
      };
      
      mockQuery.get.mockResolvedValue(mockSnapshot);

      const result = await EmailVerificationTokenUtils.cleanupUsedTokens(7);

      expect(result).toBe(2);
      expect(mockCollection.where).toHaveBeenCalledWith('isUsed', '==', true);
      expect(mockQuery.where).toHaveBeenCalledWith('usedAt', '<=', expect.any(Date));
      expect(mockBatch.delete).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });

  describe('countTokensForUserInPeriod', () => {
    it('should count tokens created in specified period', async () => {
      const mockSnapshot = { size: 3 };
      mockQuery.get.mockResolvedValue(mockSnapshot);

      const result = await EmailVerificationTokenUtils.countTokensForUserInPeriod('test-user', 2);

      expect(result).toBe(3);
      expect(mockCollection.where).toHaveBeenCalledWith('userId', '==', 'test-user');
      expect(mockQuery.where).toHaveBeenCalledWith('createdAt', '>=', expect.any(Date));
    });
  });

  describe('canUserRequestToken', () => {
    it('should allow token request when under limit', async () => {
      jest.spyOn(EmailVerificationTokenUtils, 'countTokensForUserInPeriod')
        .mockResolvedValue(2);

      const result = await EmailVerificationTokenUtils.canUserRequestToken('test-user', 3);

      expect(result.canRequest).toBe(true);
      expect(result.tokensInLastHour).toBe(2);
      expect(result.nextRequestAllowedAt).toBeUndefined();
    });

    it('should deny token request when over limit', async () => {
      jest.spyOn(EmailVerificationTokenUtils, 'countTokensForUserInPeriod')
        .mockResolvedValue(3);
      
      const mockSnapshot = {
        empty: false,
        docs: [{
          data: () => ({
            createdAt: { toDate: () => new Date(Date.now() - 30 * 60 * 1000) } // 30 minutes ago
          })
        }]
      };
      mockQuery.get.mockResolvedValue(mockSnapshot);

      const result = await EmailVerificationTokenUtils.canUserRequestToken('test-user', 3);

      expect(result.canRequest).toBe(false);
      expect(result.tokensInLastHour).toBe(3);
      expect(result.nextRequestAllowedAt).toBeInstanceOf(Date);
    });
  });

  describe('getTokenStatsForUser', () => {
    it('should return comprehensive token statistics', async () => {
      const mockTokens = [
        { getTokenData: () => ({ isUsed: false, expiresAt: new Date(Date.now() + 1000), createdAt: new Date() }) },
        { getTokenData: () => ({ isUsed: true, expiresAt: new Date(), createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) }) },
        { getTokenData: () => ({ isUsed: false, expiresAt: new Date(Date.now() - 1000), createdAt: new Date() }) }
      ];
      
      jest.spyOn(EmailVerificationTokenUtils, 'getAllTokensForUser')
        .mockResolvedValue(mockTokens as any);

      const result = await EmailVerificationTokenUtils.getTokenStatsForUser('test-user');

      expect(result.total).toBe(3);
      expect(result.active).toBe(1);
      expect(result.used).toBe(1);
      expect(result.expired).toBe(1);
      expect(result.recentCount).toBe(2);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockQuery.get.mockRejectedValue(new Error('Connection failed'));

      await expect(EmailVerificationTokenUtils.getActiveTokensForUser('test-user'))
        .rejects.toThrow('Failed to retrieve active tokens for user: Connection failed');
    });

    it('should handle batch operation failures', async () => {
      jest.spyOn(EmailVerificationTokenUtils, 'getActiveTokensForUser')
        .mockResolvedValue([{ id: 'token1' }] as any);
      mockBatch.commit.mockRejectedValue(new Error('Batch failed'));

      await expect(EmailVerificationTokenUtils.invalidateAllTokensForUser('test-user'))
        .rejects.toThrow('Failed to invalidate tokens for user: Batch failed');
    });
  });
});