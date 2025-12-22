/**
 * Script de debug pour tester la fonction hasPermission
 * Usage: node debug-permissions.js
 */

const { authService } = require('./lib/services/auth/auth.service');

async function testPermissions() {
    console.log('🚀 Starting permission debug test...');
    
    // Test avec des données d'exemple
    const testCases = [
        {
            userId: 'test-user-123',
            permission: 'view_events',
            tenantId: 'test-tenant-456',
            description: 'Test basic permission with tenant'
        },
        {
            userId: 'test-user-123',
            permission: 'manage_users',
            tenantId: 'test-tenant-456',
            description: 'Test admin permission with tenant'
        },
        {
            userId: 'test-user-123',
            permission: 'view_events',
            tenantId: undefined,
            description: 'Test basic permission without tenant'
        }
    ];

    for (const testCase of testCases) {
        console.log(`\n📋 Testing: ${testCase.description}`);
        console.log(`   User: ${testCase.userId}`);
        console.log(`   Permission: ${testCase.permission}`);
        console.log(`   Tenant: ${testCase.tenantId || 'none'}`);
        
        try {
            const result = await authService.hasPermission(
                testCase.userId,
                testCase.permission,
                testCase.tenantId
            );
            
            console.log(`   ✅ Result: ${result}`);
        } catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
        }
        
        console.log('   ---');
    }
    
    console.log('\n🏁 Permission debug test completed');
}

// Exécuter le test
testPermissions().catch(console.error);