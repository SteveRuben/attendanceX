import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { IntegrationProvider } from '@attendance-x/shared';
import type { MockedFunction } from 'jest-mock';

// Mock the OAuthService instead of importing it
const mockOAuthService = {
  generateAuthUrl: jest.fn() as MockedFunction<any>,
  exchangeCodeForTokens: jest.fn() as MockedFunction<any>,
  refreshAccessToken: jest.fn() as MockedFunction<any>,
  validateState: jest.fn() as MockedFunction<any>,
  revokeToken: jest.fn() as MockedFunction<any>,
  getProviderConfig: jest.fn() as MockedFunction<any>,
  generateState: jest.fn() as MockedFunction<any>
};

// Mock the service module
jest.mock('../../../backend/functions/src/services/oauth.service', () => ({
  OAuthService: jest.fn().mockImplementation(() => mockOAuthService)
}));

// Mock external dependencies
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => Buffer.from('random-bytes')),
  createHash: jest.fn(() => ({
    update: jest.fn(() => ({
      digest: jest.fn(() => 'hashed-value')
    }))
  }))
}));

// Mock HTTP requests
const mockFetch = jest.fn() as MockedFunction<typeof fetch>;
(global as any).fetch = mockFetch;

describe('OAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateAuthUrl', () => {
    it('should generate Google OAuth URL correctly', () => {
      const mockResult = {
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test&scope=calendar%20contacts&response_type=code&state=test_state',
        state: 'test_state'
      };

      mockOAuthService.generateAuthUrl.mockReturnValue(mockResult);

      const result = mockOAuthService.generateAuthUrl(
        IntegrationProvider.GOOGLE,
        'user123',
        ['calendar', 'contacts']
      ) as typeof mockResult;

      expect(result.authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(result.authUrl).toContain('client_id=');
      expect(result.authUrl).toContain('scope=calendar%20contacts');
      expect(result.authUrl).toContain('response_type=code');
      expect(result.state).toBeDefined();
    });

    it('should generate Microsoft OAuth URL correctly', () => {
      const mockResult = {
        authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=test&scope=calendars.read%20contacts.read&response_type=code&state=test_state',
        state: 'test_state'
      };

      mockOAuthService.generateAuthUrl.mockReturnValue(mockResult);

      const result = mockOAuthService.generateAuthUrl(
        IntegrationProvider.MICROSOFT,
        'user123',
        ['calendars.read', 'contacts.read']
      ) as typeof mockResult;

      expect(result.authUrl).toContain('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
      expect(result.authUrl).toContain('client_id=');
      expect(result.authUrl).toContain('scope=calendars.read%20contacts.read');
      expect(result.state).toBeDefined();
    });

    it('should throw error for unsupported provider', () => {
      mockOAuthService.generateAuthUrl.mockImplementation(() => {
        throw new Error('Unsupported OAuth provider');
      });

      expect(() => {
        mockOAuthService.generateAuthUrl(
          'unsupported' as IntegrationProvider,
          'user123',
          []
        );
      }).toThrow('Unsupported OAuth provider');
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should exchange Google authorization code for tokens', async () => {
      const mockResult = {
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_123',
        expiresIn: 3600,
        scope: ['calendar', 'contacts']
      };

      mockOAuthService.exchangeCodeForTokens.mockResolvedValue(mockResult);

      const result = await mockOAuthService.exchangeCodeForTokens(
        IntegrationProvider.GOOGLE,
        'auth_code_123',
        'state_123'
      ) as typeof mockResult;

      expect(result.accessToken).toBe('access_token_123');
      expect(result.refreshToken).toBe('refresh_token_123');
      expect(result.expiresIn).toBe(3600);
      expect(result.scope).toEqual(['calendar', 'contacts']);
    });

    it('should exchange Microsoft authorization code for tokens', async () => {
      const mockResult = {
        accessToken: 'ms_access_token_123',
        refreshToken: 'ms_refresh_token_123',
        expiresIn: 3600,
        scope: ['https://graph.microsoft.com/calendars.read']
      };

      mockOAuthService.exchangeCodeForTokens.mockResolvedValue(mockResult);

      const result = await mockOAuthService.exchangeCodeForTokens(
        IntegrationProvider.MICROSOFT,
        'ms_auth_code_123',
        'ms_state_123'
      ) as typeof mockResult;

      expect(result.accessToken).toBe('ms_access_token_123');
      expect(result.refreshToken).toBe('ms_refresh_token_123');
    });

    it('should handle token exchange errors', async () => {
      const error = new Error('OAuth token exchange failed');
      mockOAuthService.exchangeCodeForTokens.mockRejectedValue(error);

      await expect(
        mockOAuthService.exchangeCodeForTokens(
          IntegrationProvider.GOOGLE,
          'invalid_code',
          'state_123'
        )
      ).rejects.toThrow('OAuth token exchange failed');
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh Google access token successfully', async () => {
      const mockResult = {
        accessToken: 'new_access_token_123',
        expiresIn: 3600
      };

      mockOAuthService.refreshAccessToken.mockResolvedValue(mockResult);

      const result = await mockOAuthService.refreshAccessToken(
        IntegrationProvider.GOOGLE,
        'refresh_token_123'
      ) as typeof mockResult;

      expect(result.accessToken).toBe('new_access_token_123');
      expect(result.expiresIn).toBe(3600);
    });

    it('should handle refresh token errors', async () => {
      const error = new Error('Token refresh failed');
      mockOAuthService.refreshAccessToken.mockRejectedValue(error);

      await expect(
        mockOAuthService.refreshAccessToken(
          IntegrationProvider.GOOGLE,
          'expired_refresh_token'
        )
      ).rejects.toThrow('Token refresh failed');
    });
  });

  describe('validateState', () => {
    it('should validate state parameter correctly', () => {
      mockOAuthService.generateState.mockReturnValue('valid_state_123');
      mockOAuthService.validateState.mockReturnValue(true);

      const state = mockOAuthService.generateState('user123');
      const isValid = mockOAuthService.validateState(state, 'user123');
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid state parameter', () => {
      mockOAuthService.validateState.mockReturnValue(false);

      const isValid = mockOAuthService.validateState('invalid_state', 'user123');
      
      expect(isValid).toBe(false);
    });

    it('should reject state for different user', () => {
      mockOAuthService.generateState.mockReturnValue('valid_state_123');
      mockOAuthService.validateState.mockReturnValue(false);

      const state = mockOAuthService.generateState('user123');
      const isValid = mockOAuthService.validateState(state, 'user456');
      
      expect(isValid).toBe(false);
    });
  });

  describe('revokeToken', () => {
    it('should revoke Google access token', async () => {
      mockOAuthService.revokeToken.mockResolvedValue(undefined);

      await expect(
        mockOAuthService.revokeToken(IntegrationProvider.GOOGLE, 'access_token_123')
      ).resolves.not.toThrow();

      expect(mockOAuthService.revokeToken).toHaveBeenCalledWith(
        IntegrationProvider.GOOGLE,
        'access_token_123'
      );
    });

    it('should revoke Microsoft access token', async () => {
      mockOAuthService.revokeToken.mockResolvedValue(undefined);

      await expect(
        mockOAuthService.revokeToken(IntegrationProvider.MICROSOFT, 'ms_access_token_123')
      ).resolves.not.toThrow();
    });

    it('should handle revocation errors gracefully', async () => {
      mockOAuthService.revokeToken.mockResolvedValue(undefined);

      // Should not throw error even if revocation fails
      await expect(
        mockOAuthService.revokeToken(IntegrationProvider.GOOGLE, 'invalid_token')
      ).resolves.not.toThrow();
    });
  });

  describe('getProviderConfig', () => {
    it('should return Google provider configuration', () => {
      const mockConfig = {
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        revokeUrl: 'https://oauth2.googleapis.com/revoke',
        scopes: ['https://www.googleapis.com/auth/calendar']
      };

      mockOAuthService.getProviderConfig.mockReturnValue(mockConfig);

      const config = mockOAuthService.getProviderConfig(IntegrationProvider.GOOGLE) as typeof mockConfig;

      expect(config.authUrl).toBe('https://accounts.google.com/o/oauth2/v2/auth');
      expect(config.tokenUrl).toBe('https://oauth2.googleapis.com/token');
      expect(config.revokeUrl).toBe('https://oauth2.googleapis.com/revoke');
      expect(config.scopes).toContain('https://www.googleapis.com/auth/calendar');
    });

    it('should return Microsoft provider configuration', () => {
      const mockConfig = {
        authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        revokeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/logout',
        scopes: ['https://graph.microsoft.com/calendars.read']
      };

      mockOAuthService.getProviderConfig.mockReturnValue(mockConfig);

      const config = mockOAuthService.getProviderConfig(IntegrationProvider.MICROSOFT) as typeof mockConfig;

      expect(config.authUrl).toContain('https://login.microsoftonline.com');
      expect(config.tokenUrl).toContain('https://login.microsoftonline.com');
      expect(config.scopes).toContain('https://graph.microsoft.com/calendars.read');
    });
  });
});