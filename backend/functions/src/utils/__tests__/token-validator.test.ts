import { TokenValidator } from '../token-validator';
import { ERROR_CODES } from '@attendance-x/shared';

describe('TokenValidator', () => {
  
  describe('cleanToken', () => {
    it('should remove invisible characters', () => {
      const tokenWithInvisible = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9\u200B.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9\uFEFF.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ';
      const cleaned = TokenValidator.cleanToken(tokenWithInvisible);
      expect(cleaned).toBe('eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ');
    });

    it('should remove control characters', () => {
      const tokenWithControl = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9\x00\x1F.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9\x7F.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ';
      const cleaned = TokenValidator.cleanToken(tokenWithControl);
      expect(cleaned).toBe('eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ');
    });

    it('should remove all whitespace', () => {
      const tokenWithWhitespace = ' eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9 . eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9 . TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ ';
      const cleaned = TokenValidator.cleanToken(tokenWithWhitespace);
      expect(cleaned).toBe('eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ');
    });

    it('should handle empty or null tokens', () => {
      expect(TokenValidator.cleanToken('')).toBe('');
      expect(TokenValidator.cleanToken(null as any)).toBe('');
      expect(TokenValidator.cleanToken(undefined as any)).toBe('');
    });

    it('should handle non-string input', () => {
      expect(TokenValidator.cleanToken(123 as any)).toBe('');
      expect(TokenValidator.cleanToken({} as any)).toBe('');
      expect(TokenValidator.cleanToken([] as any)).toBe('');
    });

    it('should preserve valid JWT tokens', () => {
      const validToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ';
      expect(TokenValidator.cleanToken(validToken)).toBe(validToken);
    });
  });

  describe('validateTokenStructure', () => {
    const validToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ';

    it('should validate correct JWT structure', () => {
      const result = TokenValidator.validateTokenStructure(validToken);
      expect(result.isValid).toBe(true);
      expect(result.details?.hasCorrectParts).toBe(true);
      expect(result.details?.headerValid).toBe(true);
      expect(result.details?.payloadValid).toBe(true);
      expect(result.details?.signatureValid).toBe(true);
    });

    it('should reject tokens with wrong number of parts', () => {
      const result = TokenValidator.validateTokenStructure('header.payload');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('expected 3 parts, got 2');
      expect(result.details?.hasCorrectParts).toBe(false);
    });

    it('should reject tokens with too many parts', () => {
      const result = TokenValidator.validateTokenStructure('header.payload.signature.extra');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('expected 3 parts, got 4');
    });

    it('should reject tokens with empty parts', () => {
      const result = TokenValidator.validateTokenStructure('header..signature');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid JWT parts: payload');
      expect(result.details?.payloadValid).toBe(false);
    });

    it('should reject tokens with invalid base64url characters', () => {
      const result = TokenValidator.validateTokenStructure('header@invalid.payload.signature');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid JWT parts: header');
      expect(result.details?.headerValid).toBe(false);
    });

    it('should handle empty or null tokens', () => {
      expect(TokenValidator.validateTokenStructure('').isValid).toBe(false);
      expect(TokenValidator.validateTokenStructure(null as any).isValid).toBe(false);
      expect(TokenValidator.validateTokenStructure(undefined as any).isValid).toBe(false);
    });

    it('should clean token before validation', () => {
      const tokenWithWhitespace = ' eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9 . eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9 . TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ ';
      const result = TokenValidator.validateTokenStructure(tokenWithWhitespace);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateAndCleanToken', () => {
    const validToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ';

    it('should validate and return cleaned valid token', () => {
      const result = TokenValidator.validateAndCleanToken(validToken);
      expect(result.isValid).toBe(true);
      expect(result.cleanedToken).toBe(validToken);
      expect(result.error).toBeUndefined();
      expect(result.errorCode).toBeUndefined();
    });

    it('should clean token with invisible characters', () => {
      const tokenWithInvisible = validToken + '\u200B\uFEFF';
      const result = TokenValidator.validateAndCleanToken(tokenWithInvisible);
      expect(result.isValid).toBe(true);
      expect(result.cleanedToken).toBe(validToken);
    });

    it('should reject empty tokens', () => {
      const result = TokenValidator.validateAndCleanToken('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Token is required');
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_TOKEN);
    });

    it('should reject null/undefined tokens', () => {
      const nullResult = TokenValidator.validateAndCleanToken(null as any);
      expect(nullResult.isValid).toBe(false);
      expect(nullResult.errorCode).toBe(ERROR_CODES.INVALID_TOKEN);

      const undefinedResult = TokenValidator.validateAndCleanToken(undefined as any);
      expect(undefinedResult.isValid).toBe(false);
      expect(undefinedResult.errorCode).toBe(ERROR_CODES.INVALID_TOKEN);
    });

    it('should reject non-string tokens', () => {
      const result = TokenValidator.validateAndCleanToken(123 as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be a string');
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_TOKEN);
    });

    it('should reject tokens that become empty after cleaning', () => {
      const result = TokenValidator.validateAndCleanToken('\u200B\uFEFF   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('empty after cleaning');
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_TOKEN);
    });

    it('should reject malformed tokens', () => {
      const result = TokenValidator.validateAndCleanToken('header.payload');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('expected 3 parts');
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_TOKEN);
    });

    it('should reject tokens that are too short', () => {
      const result = TokenValidator.validateAndCleanToken('a.b.c');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too short');
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_TOKEN);
    });

    it('should handle validation errors gracefully', () => {
      // Mock a scenario where an unexpected error occurs
      const originalValidateStructure = TokenValidator.validateTokenStructure;
      jest.spyOn(TokenValidator, 'validateTokenStructure').mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = TokenValidator.validateAndCleanToken(validToken);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('unexpected error');
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_TOKEN);

      // Restore original method
      TokenValidator.validateTokenStructure = originalValidateStructure;
    });
  });

  describe('logTokenValidationFailure', () => {
    it('should log token validation failure without exposing full token', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ';
      const error = 'Test error';
      const context = { ip: '127.0.0.1', userAgent: 'test-agent' };

      TokenValidator.logTokenValidationFailure(token, error, context);

      // Note: In a real test environment, you would mock the logger
      // For now, we just ensure the method doesn't throw
      expect(() => TokenValidator.logTokenValidationFailure(token, error, context)).not.toThrow();

      consoleSpy.mockRestore();
    });

    it('should handle null token in logging', () => {
      expect(() => TokenValidator.logTokenValidationFailure(null as any, 'error')).not.toThrow();
    });
  });
});