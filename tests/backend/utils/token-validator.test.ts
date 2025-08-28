import { TokenValidator } from '../../../backend/functions/src/utils/token-validator';
import { ERROR_CODES } from '@attendance-x/shared';

// Mock du logger Firebase
jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('TokenValidator', () => {
  // Mock valid JWT token structure (header.payload.signature)
  const validTokenStructure = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  
  describe('cleanToken', () => {
    it('should remove leading and trailing whitespace', () => {
      const token = '  ' + validTokenStructure + '  ';
      const cleaned = TokenValidator.cleanToken(token);
      expect(cleaned).toBe(validTokenStructure);
    });

    it('should remove zero-width characters', () => {
      const token = validTokenStructure + '\u200B\u200C\u200D\uFEFF';
      const cleaned = TokenValidator.cleanToken(token);
      expect(cleaned).toBe(validTokenStructure);
    });

    it('should remove control characters', () => {
      const token = validTokenStructure + '\u0000\u001F\u007F\u009F';
      const cleaned = TokenValidator.cleanToken(token);
      expect(cleaned).toBe(validTokenStructure);
    });

    it('should remove internal whitespace', () => {
      const parts = validTokenStructure.split('.');
      const tokenWithSpaces = parts[0] + ' ' + parts[1] + '\t' + parts[2];
      const cleaned = TokenValidator.cleanToken(tokenWithSpaces);
      expect(cleaned).toBe(validTokenStructure);
    });

    it('should remove newlines and tabs', () => {
      const parts = validTokenStructure.split('.');
      const tokenWithNewlines = parts[0] + '\n' + parts[1] + '\r' + parts[2];
      const cleaned = TokenValidator.cleanToken(tokenWithNewlines);
      expect(cleaned).toBe(validTokenStructure);
    });

    it('should handle empty string', () => {
      const cleaned = TokenValidator.cleanToken('');
      expect(cleaned).toBe('');
    });

    it('should handle null/undefined input', () => {
      expect(TokenValidator.cleanToken(null as any)).toBe('');
      expect(TokenValidator.cleanToken(undefined as any)).toBe('');
    });

    it('should handle non-string input', () => {
      expect(TokenValidator.cleanToken(123 as any)).toBe('');
      expect(TokenValidator.cleanToken({} as any)).toBe('');
    });
  });

  describe('validateTokenStructure', () => {
    it('should validate correct JWT structure', () => {
      const isValid = TokenValidator.validateTokenStructure(validTokenStructure);
      expect(isValid).toBe(true);
    });

    it('should reject token with wrong number of parts', () => {
      expect(TokenValidator.validateTokenStructure('part1.part2')).toBe(false);
      expect(TokenValidator.validateTokenStructure('part1.part2.part3.part4')).toBe(false);
      expect(TokenValidator.validateTokenStructure('singlepart')).toBe(false);
    });

    it('should reject token with empty parts', () => {
      expect(TokenValidator.validateTokenStructure('.part2.part3')).toBe(false);
      expect(TokenValidator.validateTokenStructure('part1..part3')).toBe(false);
      expect(TokenValidator.validateTokenStructure('part1.part2.')).toBe(false);
    });

    it('should reject token with invalid Base64 characters', () => {
      expect(TokenValidator.validateTokenStructure('part1@.part2.part3')).toBe(false);
      expect(TokenValidator.validateTokenStructure('part1.part2#.part3')).toBe(false);
      expect(TokenValidator.validateTokenStructure('part1.part2.part3$')).toBe(false);
    });

    it('should accept valid Base64 characters including URL-safe variants', () => {
      const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
      const token = `${validChars}.${validChars}.${validChars}`;
      expect(TokenValidator.validateTokenStructure(token)).toBe(true);
    });

    it('should handle empty string', () => {
      expect(TokenValidator.validateTokenStructure('')).toBe(false);
    });

    it('should handle null/undefined input', () => {
      expect(TokenValidator.validateTokenStructure(null as any)).toBe(false);
      expect(TokenValidator.validateTokenStructure(undefined as any)).toBe(false);
    });
  });

  describe('validateAndCleanToken', () => {
    it('should validate and clean a valid token', () => {
      const dirtyToken = '  ' + validTokenStructure + '\u200B  ';
      const result = TokenValidator.validateAndCleanToken(dirtyToken);
      
      expect(result.isValid).toBe(true);
      expect(result.cleanedToken).toBe(validTokenStructure);
      expect(result.details?.hasInvisibleChars).toBe(true);
      expect(result.details?.originalLength).toBeGreaterThan(result.details?.cleanedLength!);
    });

    it('should return error for missing token', () => {
      const result = TokenValidator.validateAndCleanToken('');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Token manquant ou invalide');
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_TOKEN);
    });

    it('should return error for null token', () => {
      const result = TokenValidator.validateAndCleanToken(null as any);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Token manquant ou invalide');
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_TOKEN);
    });

    it('should return error for malformed token structure', () => {
      const malformedToken = 'invalid.token';
      const result = TokenValidator.validateAndCleanToken(malformedToken);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Structure de token invalide');
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_TOKEN);
      expect(result.details?.structure?.partCount).toBe(2);
    });

    it('should detect invisible characters', () => {
      const tokenWithInvisible = validTokenStructure + '\u200B';
      const result = TokenValidator.validateAndCleanToken(tokenWithInvisible);
      
      expect(result.isValid).toBe(true);
      expect(result.details?.hasInvisibleChars).toBe(true);
      expect(result.details?.originalLength).toBe(validTokenStructure.length + 1);
      expect(result.details?.cleanedLength).toBe(validTokenStructure.length);
    });

    it('should provide detailed structure information for invalid tokens', () => {
      const invalidToken = 'part1.part2@invalid.part3';
      const result = TokenValidator.validateAndCleanToken(invalidToken);
      
      expect(result.isValid).toBe(false);
      expect(result.details?.structure?.partCount).toBe(3);
      expect(result.details?.structure?.hasDots).toBe(true);
      expect(result.details?.structure?.isBase64Like).toBe(false);
    });

    it('should include context in validation', () => {
      const context = {
        ip: '192.168.1.1',
        userAgent: 'test-agent',
        endpoint: '/api/test',
        userId: 'user123'
      };
      
      const result = TokenValidator.validateAndCleanToken(validTokenStructure, context);
      expect(result.isValid).toBe(true);
    });
  });

  describe('isValidToken', () => {
    it('should return true for valid token', () => {
      const isValid = TokenValidator.isValidToken(validTokenStructure);
      expect(isValid).toBe(true);
    });

    it('should return false for invalid token', () => {
      const isValid = TokenValidator.isValidToken('invalid.token');
      expect(isValid).toBe(false);
    });

    it('should return true for valid token with invisible characters', () => {
      const dirtyToken = '  ' + validTokenStructure + '\u200B  ';
      const isValid = TokenValidator.isValidToken(dirtyToken);
      expect(isValid).toBe(true);
    });
  });

  describe('getTokenInfo', () => {
    it('should provide detailed token information', () => {
      const dirtyToken = '  ' + validTokenStructure + '\u200B  ';
      const info = TokenValidator.getTokenInfo(dirtyToken);
      
      expect(info.length).toBeGreaterThan(validTokenStructure.length);
      expect(info.hasInvisibleChars).toBe(true);
      expect(info.structure.partCount).toBe(3);
      expect(info.structure.isValidStructure).toBe(true);
      expect(info.cleaned.length).toBe(validTokenStructure.length);
    });

    it('should handle malformed tokens', () => {
      const malformedToken = 'invalid.token';
      const info = TokenValidator.getTokenInfo(malformedToken);
      
      expect(info.structure.partCount).toBe(2);
      expect(info.structure.isValidStructure).toBe(false);
    });

    it('should truncate sensitive information', () => {
      const info = TokenValidator.getTokenInfo(validTokenStructure);
      
      // Vérifier que les parties sont tronquées pour la sécurité
      info.structure.parts.forEach(part => {
        expect(part).toMatch(/\.\.\.$/); // Se termine par ...
        expect(part.length).toBeLessThanOrEqual(13); // 10 chars + ...
      });
      
      expect(info.cleaned.token).toMatch(/\.\.\.$/); // Se termine par ...
    });
  });

  describe('Edge cases and security', () => {
    it('should handle extremely long tokens', () => {
      const longToken = 'a'.repeat(10000) + '.' + 'b'.repeat(10000) + '.' + 'c'.repeat(10000);
      const result = TokenValidator.validateAndCleanToken(longToken);
      
      expect(result.isValid).toBe(true);
      expect(result.cleanedToken).toBe(longToken);
    });

    it('should handle tokens with mixed invisible characters', () => {
      const mixedToken = validTokenStructure.split('').join('\u200B');
      const result = TokenValidator.validateAndCleanToken(mixedToken);
      
      expect(result.isValid).toBe(true);
      expect(result.cleanedToken).toBe(validTokenStructure);
      expect(result.details?.hasInvisibleChars).toBe(true);
    });

    it('should not expose sensitive data in logs', () => {
      // Test que les méthodes ne retournent pas de tokens complets
      const info = TokenValidator.getTokenInfo(validTokenStructure);
      
      expect(info.cleaned.token).not.toBe(validTokenStructure);
      expect(info.cleaned.token.length).toBeLessThan(validTokenStructure.length);
    });

    it('should handle special Unicode characters', () => {
      const unicodeToken = validTokenStructure + '🔒🚀💻';
      const cleaned = TokenValidator.cleanToken(unicodeToken);
      
      // Les emojis ne sont pas des caractères invisibles, donc ils restent
      expect(cleaned).toBe(unicodeToken);
      
      // Mais la validation de structure devrait échouer
      const result = TokenValidator.validateAndCleanToken(unicodeToken);
      expect(result.isValid).toBe(false);
    });
  });
});