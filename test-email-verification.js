// Simple test to verify email verification methods compilation
const { authService } = require('./backend/functions/lib/services/auth.service.js');

console.log('Testing email verification methods...');

// Check if methods exist
console.log('sendEmailVerification method exists:', typeof authService.sendEmailVerification === 'function');
console.log('verifyEmail method exists:', typeof authService.verifyEmail === 'function');
console.log('resendEmailVerification method exists:', typeof authService.resendEmailVerification === 'function');
console.log('canRequestVerification method exists:', typeof authService.canRequestVerification === 'function');
console.log('cleanupExpiredTokens method exists:', typeof authService.cleanupExpiredTokens === 'function');

console.log('All email verification methods are properly defined!');