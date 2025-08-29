#!/usr/bin/env node

/**
 * Script pour tester rapidement les permissions du owner
 * Usage: node scripts/test-owner-permissions.js
 */

const { UserModel } = require('../backend/functions/src/models/user.model');
const { PermissionService } = require('../backend/functions/src/services/permission.service');
const { OrganizationRole, UserRole, UserStatus } = require('@attendance-x/shared');

console.log('🔐 Test des permissions du Owner\n');

// Créer un utilisateur owner
const ownerUser = new UserModel({
  id: 'test-owner',
  email: 'owner@test.com',
  name: 'Test Owner',
  role: UserRole.ADMIN,
  status: UserStatus.ACTIVE,
  organizationId: 'test-org',
  organizationRole: OrganizationRole.OWNER,
  isActive: true,
  organizationPermissions: []
});

// Créer un utilisateur admin pour comparaison
const adminUser = new UserModel({
  id: 'test-admin',
  email: 'admin@test.com',
  name: 'Test Admin',
  role: UserRole.ADMIN,
  status: UserStatus.ACTIVE,
  organizationId: 'test-org',
  organizationRole: OrganizationRole.ADMIN,
  isActive: true,
  organizationPermissions: ['VIEW_ORGANIZATION', 'MANAGE_MEMBERS']
});

console.log('👑 Vérifications Owner:');
console.log(`- Est Owner: ${ownerUser.isOrganizationOwner()}`);
console.log(`- Accès illimité: ${ownerUser.hasUnlimitedAccess()}`);
console.log(`- Peut gérer l'admin: ${PermissionService.canManageUser(ownerUser, adminUser)}`);
console.log(`- Peut assigner le rôle Owner: ${PermissionService.canAssignRole(ownerUser, OrganizationRole.OWNER)}`);

console.log('\n🔍 Test de quelques permissions critiques:');
const criticalPermissions = [
  'DELETE_ORGANIZATION',
  'MANAGE_BILLING',
  'REMOVE_MEMBERS',
  'VIEW_DETAILED_ANALYTICS'
];

criticalPermissions.forEach(permission => {
  const ownerHas = PermissionService.hasPermission(ownerUser, permission);
  const adminHas = PermissionService.hasPermission(adminUser, permission);
  console.log(`- ${permission}:`);
  console.log(`  Owner: ${ownerHas ? '✅' : '❌'}`);
  console.log(`  Admin: ${adminHas ? '✅' : '❌'}`);
});

console.log('\n📊 Résumé des permissions:');
const ownerSummary = PermissionService.getPermissionSummary(ownerUser);
const adminSummary = PermissionService.getPermissionSummary(adminUser);

console.log(`Owner - Permissions: ${ownerSummary.permissions.length}`);
console.log(`Admin - Permissions: ${adminSummary.permissions.length}`);

console.log('\n✅ Test terminé !');

// Vérifier que le owner a bien plus de permissions que l'admin
if (ownerSummary.permissions.length > adminSummary.permissions.length) {
  console.log('🎉 Le owner a bien plus de permissions que l\'admin');
} else {
  console.log('⚠️  Problème: le owner n\'a pas plus de permissions que l\'admin');
}

// Vérifier que le owner peut tout faire
const allPermissions = [
  'DELETE_ORGANIZATION',
  'MANAGE_BILLING',
  'REMOVE_MEMBERS',
  'CREATE_TEAMS',
  'MANAGE_EVENTS'
];

const ownerCanDoEverything = allPermissions.every(permission => 
  PermissionService.hasPermission(ownerUser, permission)
);

if (ownerCanDoEverything) {
  console.log('🎉 Le owner peut effectuer toutes les actions testées');
} else {
  console.log('⚠️  Problème: le owner ne peut pas effectuer certaines actions');
}