/**
 * Service de migration pour centraliser l'authentification multi-tenant
 * Supprime les doublons et unifie les systèmes d'auth
 */

import { collections } from "../../config";
import { logger } from "firebase-functions";
import { tenantMembershipService, tenantService } from "../tenant";
import { TenantRole, TenantStatus } from "../../common/types";


export class AuthMigrationService {

    /**
     * Migrer les organisations existantes vers le système multi-tenant
     */
    async migrateOrganizationsToTenants(): Promise<{
        migrated: number;
        errors: string[];
    }> {
        const errors: string[] = [];
        let migrated = 0;

        try {
            logger.info("🔄 Début de la migration des organisations vers les tenants");

            // Récupérer toutes les organisations existantes
            const organizationsSnapshot = await collections.organizations.get();

            for (const orgDoc of organizationsSnapshot.docs) {
                try {
                    const orgData = orgDoc.data();

                    // Vérifier si un tenant existe déjà pour cette organisation
                    const existingTenant = await tenantService.getTenantBySlug(orgData.slug || orgData.name.toLowerCase().replace(/\s+/g, '-'));

                    if (existingTenant) {
                        logger.info(`⏭️ Tenant déjà existant pour l'organisation: ${orgData.name}`);
                        continue;
                    }

                    // Créer le tenant
                    const tenant = await tenantService.createTenant({
                        name: orgData.name,
                        slug: orgData.slug || orgData.name.toLowerCase().replace(/\s+/g, '-'),
                        planId: 'basic', // Plan par défaut
                        settings: {
                            timezone: orgData.settings?.timezone || 'Europe/Paris',
                            locale: orgData.settings?.locale || 'fr-FR',
                            currency: orgData.settings?.currency || 'EUR'
                        },
                        createdBy: orgData.createdBy || 'system'
                    });

                    // Migrer les membres de l'organisation
                    await this.migrateOrganizationMembers(orgDoc.id, tenant.id);

                    migrated++;
                    logger.info(`✅ Organisation migrée: ${orgData.name} -> Tenant: ${tenant.id}`);

                } catch (error) {
                    const errorMsg = `Erreur lors de la migration de l'organisation ${orgDoc.id}: ${error}`;
                    errors.push(errorMsg);
                    logger.error(errorMsg);
                }
            }

            logger.info(`🎉 Migration terminée: ${migrated} organisations migrées, ${errors.length} erreurs`);

            return { migrated, errors };

        } catch (error) {
            logger.error("❌ Erreur lors de la migration des organisations:", error);
            throw error;
        }
    }

    /**
     * Migrer les membres d'une organisation vers les memberships tenant
     */
    private async migrateOrganizationMembers(organizationId: string, tenantId: string): Promise<void> {
        try {
            // Récupérer les membres de l'organisation
            const membersSnapshot = await collections.organization_members
                .where('organizationId', '==', organizationId)
                .get();

            for (const memberDoc of membersSnapshot.docs) {
                try {
                    const memberData = memberDoc.data();

                    // Vérifier si le membership tenant existe déjà
                    const existingMembership = await tenantMembershipService.getMembershipByUser(
                        tenantId,
                        memberData.userId
                    );

                    if (existingMembership) {
                        logger.info(`⏭️ Membership déjà existant pour l'utilisateur: ${memberData.userId}`);
                        continue;
                    }

                    // Mapper le rôle d'organisation vers le rôle tenant
                    const tenantRole = this.mapOrganizationRoleToTenantRole(memberData.role);

                    // Créer le membership tenant
                    await tenantMembershipService.createMembership({
                        tenantId,
                        userId: memberData.userId,
                        role: tenantRole,
                        invitedBy: memberData.invitedBy || 'system',
                        permissions: [] // Les permissions par défaut seront appliquées
                    });

                    logger.info(`✅ Membre migré: ${memberData.userId} -> Tenant: ${tenantId}`);

                } catch (error) {
                    logger.error(`❌ Erreur lors de la migration du membre ${memberDoc.id}:`, error);
                }
            }

        } catch (error) {
            logger.error("❌ Erreur lors de la migration des membres:", error);
            throw error;
        }
    }

    /**
     * Mapper les rôles d'organisation vers les rôles tenant
     */
    private mapOrganizationRoleToTenantRole(orgRole: string): TenantRole {
        const roleMapping: Record<string, TenantRole> = {
            'owner': TenantRole.OWNER,
            'admin': TenantRole.ADMIN,
            'manager': TenantRole.MANAGER,
            'member': TenantRole.MEMBER,
            'participant': TenantRole.MEMBER,
            'viewer': TenantRole.VIEWER,
            'guest': TenantRole.VIEWER
        };

        return roleMapping[orgRole.toLowerCase()] || TenantRole.MEMBER;
    }

    /**
     * Nettoyer les doublons d'authentification
     */
    async cleanupAuthDuplicates(): Promise<{
        cleaned: number;
        errors: string[];
    }> {
        const errors: string[] = [];
        let cleaned = 0;

        try {
            logger.info("🧹 Début du nettoyage des doublons d'authentification");

            // Nettoyer les sessions dupliquées
            const sessionsSnapshot = await collections.user_sessions.get();
            const sessionsByUser: Record<string, any[]> = {};

            // Grouper les sessions par utilisateur
            sessionsSnapshot.docs.forEach(doc => {
                const sessionData = doc.data();
                if (!sessionsByUser[sessionData.userId]) {
                    sessionsByUser[sessionData.userId] = [];
                }
                sessionsByUser[sessionData.userId].push({ id: doc.id, ...sessionData });
            });

            // Supprimer les sessions en double (garder la plus récente)
            for (const [userId, sessions] of Object.entries(sessionsByUser)) {
                if (sessions.length > 1) {
                    // Trier par date de création (plus récent en premier)
                    sessions.sort((a, b) => b.createdAt?.toDate?.()?.getTime() - a.createdAt?.toDate?.()?.getTime());

                    // Supprimer toutes sauf la plus récente
                    for (let i = 1; i < sessions.length; i++) {
                        try {
                            await collections.user_sessions.doc(sessions[i].id).delete();
                            cleaned++;
                            logger.info(`🗑️ Session dupliquée supprimée pour l'utilisateur: ${userId}`);
                        } catch (error) {
                            errors.push(`Erreur lors de la suppression de la session ${sessions[i].id}: ${error}`);
                        }
                    }
                }
            }

            logger.info(`🎉 Nettoyage terminé: ${cleaned} doublons supprimés, ${errors.length} erreurs`);

            return { cleaned, errors };

        } catch (error) {
            logger.error("❌ Erreur lors du nettoyage des doublons:", error);
            throw error;
        }
    }

    /**
     * Valider l'intégrité du système multi-tenant
     */
    async validateMultiTenantIntegrity(): Promise<{
        valid: boolean;
        issues: string[];
        stats: {
            totalTenants: number;
            totalMemberships: number;
            orphanedMemberships: number;
            inactiveTenants: number;
        };
    }> {
        const issues: string[] = [];

        try {
            logger.info("🔍 Validation de l'intégrité du système multi-tenant");

            // Statistiques
            const tenantsSnapshot = await collections.tenants.get();
            const membershipsSnapshot = await collections.tenant_memberships.get();

            const stats = {
                totalTenants: tenantsSnapshot.size,
                totalMemberships: membershipsSnapshot.size,
                orphanedMemberships: 0,
                inactiveTenants: 0
            };

            // Vérifier les memberships orphelins
            for (const membershipDoc of membershipsSnapshot.docs) {
                const membershipData = membershipDoc.data();

                // Vérifier que le tenant existe
                const tenant = await tenantService.getTenant(membershipData.tenantId);
                if (!tenant) {
                    issues.push(`Membership orphelin trouvé: ${membershipDoc.id} (tenant: ${membershipData.tenantId})`);
                    stats.orphanedMemberships++;
                }

                // Vérifier que l'utilisateur existe
                const userDoc = await collections.users.doc(membershipData.userId).get();
                if (!userDoc.exists) {
                    issues.push(`Membership avec utilisateur inexistant: ${membershipDoc.id} (user: ${membershipData.userId})`);
                }
            }

            // Compter les tenants inactifs
            for (const tenantDoc of tenantsSnapshot.docs) {
                const tenantData = tenantDoc.data();
                if (tenantData.status !== TenantStatus.ACTIVE && tenantData.status !== TenantStatus.TRIAL) {
                    stats.inactiveTenants++;
                }
            }

            const valid = issues.length === 0;

            logger.info(`✅ Validation terminée: ${valid ? 'Système intègre' : `${issues.length} problèmes trouvés`}`);

            return { valid, issues, stats };

        } catch (error) {
            logger.error("❌ Erreur lors de la validation:", error);
            throw error;
        }
    }

    /**
     * Exécuter la migration complète
     */
    async runFullMigration(): Promise<{
        organizationsMigrated: number;
        duplicatesCleaned: number;
        errors: string[];
        integrity: any;
    }> {
        try {
            logger.info("🚀 Début de la migration complète du système multi-tenant");

            // 1. Migrer les organisations
            const orgMigration = await this.migrateOrganizationsToTenants();

            // 2. Nettoyer les doublons
            const cleanup = await this.cleanupAuthDuplicates();

            // 3. Valider l'intégrité
            const integrity = await this.validateMultiTenantIntegrity();

            const result = {
                organizationsMigrated: orgMigration.migrated,
                duplicatesCleaned: cleanup.cleaned,
                errors: [...orgMigration.errors, ...cleanup.errors],
                integrity
            };

            logger.info("🎉 Migration complète terminée:", result);

            return result;

        } catch (error) {
            logger.error("❌ Erreur lors de la migration complète:", error);
            throw error;
        }
    }
}

// Instance singleton
export const authMigrationService = new AuthMigrationService();
export default authMigrationService;