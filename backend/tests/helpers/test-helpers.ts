// backend/tests/helpers/test-helpers.ts
import { collections } from '../../functions/src/config/firebase';
import { OrganizationSector } from '@attendance-x/shared';

interface TestUser {
  uid: string;
  email: string;
  token: string;
}

interface TestOrganization {
  id: string;
  name: string;
  sector: OrganizationSector;
  createdAt: Date;
}

/**
 * Générer un utilisateur de test avec un token d'authentification simulé
 */
export const generateTestUser = async (): Promise<TestUser> => {
  const uid = `test-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const email = `test-${uid}@example.com`;
  
  // Créer l'utilisateur dans Firestore
  await collections.users.doc(uid).set({
    email,
    displayName: `Test User ${uid}`,
    createdAt: new Date(),
    isActive: true,
    role: 'user',
    organizationId: null
  });

  // Simuler un token JWT (en réalité, ceci devrait être généré par Firebase Auth)
  const token = `test-token-${uid}`;

  return { uid, email, token };
};

/**
 * Générer une organisation de test
 */
export const generateTestOrganization = async (): Promise<TestOrganization> => {
  const id = `test-org-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const name = `Test Organization ${id}`;
  const sector: OrganizationSector = 'technology';
  const createdAt = new Date();

  // Créer l'organisation dans Firestore
  await collections.organizations.doc(id).set({
    name,
    displayName: name,
    sector,
    description: `Description for ${name}`,
    createdAt,
    updatedAt: createdAt,
    status: 'active',
    settings: {
      allowPublicEvents: false,
      requireApprovalForEvents: true,
      defaultEventDuration: 60,
      timezone: 'Europe/Paris'
    }
  });

  return { id, name, sector, createdAt };
};

/**
 * Nettoyer les données de test
 */
export const cleanupTestData = async (userId?: string, organizationId?: string): Promise<void> => {
  const promises: Promise<any>[] = [];

  if (userId) {
    promises.push(collections.users.doc(userId).delete());
  }

  if (organizationId) {
    promises.push(collections.organizations.doc(organizationId).delete());
  }

  await Promise.all(promises);
};

/**
 * Créer un utilisateur membre d'une organisation
 */
export const createUserWithOrganization = async (): Promise<{ user: TestUser; organization: TestOrganization }> => {
  const user = await generateTestUser();
  const organization = await generateTestOrganization();

  // Ajouter l'utilisateur à l'organisation
  await collections.users.doc(user.uid).update({
    organizationId: organization.id
  });

  return { user, organization };
};

/**
 * Simuler une erreur de base de données
 */
export const simulateDatabaseError = () => {
  // Cette fonction peut être utilisée pour simuler des erreurs de base de données
  // dans les tests en mockant les méthodes Firestore
  throw new Error('Simulated database error');
};

/**
 * Vérifier qu'un utilisateur appartient à une organisation
 */
export const verifyUserMembership = async (userId: string, organizationId: string): Promise<boolean> => {
  const userDoc = await collections.users.doc(userId).get();
  const userData = userDoc.data();
  
  return userData?.organizationId === organizationId;
};

/**
 * Vérifier qu'une organisation existe
 */
export const verifyOrganizationExists = async (organizationId: string): Promise<boolean> => {
  const orgDoc = await collections.organizations.doc(organizationId).get();
  return orgDoc.exists;
};

/**
 * Créer des données de test pour les scénarios complexes
 */
export const setupComplexTestScenario = async () => {
  // Créer plusieurs utilisateurs et organisations pour des tests complexes
  const users = await Promise.all([
    generateTestUser(),
    generateTestUser(),
    generateTestUser()
  ]);

  const organizations = await Promise.all([
    generateTestOrganization(),
    generateTestOrganization()
  ]);

  // Assigner des utilisateurs aux organisations
  await collections.users.doc(users[0].uid).update({
    organizationId: organizations[0].id
  });

  await collections.users.doc(users[1].uid).update({
    organizationId: organizations[0].id
  });

  // users[2] reste sans organisation

  return {
    users,
    organizations,
    cleanup: async () => {
      await Promise.all([
        ...users.map(user => collections.users.doc(user.uid).delete()),
        ...organizations.map(org => collections.organizations.doc(org.id).delete())
      ]);
    }
  };
};