/**
 * Service pour le wizard de configuration
 * Gère le processus d'onboarding multi-étapes
 */

import { collections } from '../../config/database';
import { TenantError, TenantErrorCode, TenantStatus } from '../../common/types';
import { tenantService } from '../tenant/tenant.service';
import { tenantUserService } from '../user/tenant-user.service';
import { EmailService } from '../notification';

export interface SetupWizardStep {
  id: 'welcome' | 'organization_profile' | 'settings' | 'attendance_policy' | 'user_invitations' | 'completion';
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
  order: number;
  url: string; // URL frontend pour cette étape
  data?: Record<string, any>;
}

export interface SetupWizardStatus {
  tenantId: string;
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  steps: SetupWizardStep[];
  isComplete: boolean;
  completedAt?: Date;
}

export interface OrganizationProfileData {
  name: string;
  description?: string;
  website?: string;
  industry: string;
  size: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  settings: {
    timezone: string;
    language: string;
    currency: string;
    dateFormat: string;
    timeFormat: string;
  };
}

export interface UserInvitationData {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions?: string[];
  department?: string;
}

export interface DemoDataOptions {
  generateUsers: boolean;
  generateEvents: boolean;
  generateAttendance: boolean;
  industry?: string;
  userCount?: number;
  eventCount?: number;
}

export class SetupWizardService {

  emailService = new EmailService();
  /**
   * Initialiser le wizard de configuration pour un tenant
   */
  async initializeSetupWizard(tenantId: string): Promise<SetupWizardStatus> {
    try {
      const steps: SetupWizardStep[] = [
        {
          id: 'welcome',
          title: 'Bienvenue',
          description: 'Introduction à votre nouvelle organisation',
          completed: false,
          required: true,
          order: 1,
          url: '/onboarding/welcome'
        },
        {
          id: 'organization_profile',
          title: 'Profil de l\'organisation',
          description: 'Configurez les informations de base de votre organisation',
          completed: false,
          required: true,
          order: 2,
          url: '/onboarding/organization'
        },
        {
          id: 'settings',
          title: 'Paramètres',
          description: 'Configurez le fuseau horaire, la langue et la devise',
          completed: false,
          required: true,
          order: 3,
          url: '/onboarding/settings'
        },
        {
          id: 'attendance_policy',
          title: 'Politique de présence',
          description: 'Définissez les horaires de travail et les règles de présence',
          completed: false,
          required: false,
          order: 4,
          url: '/onboarding/policy'
        },
        {
          id: 'user_invitations',
          title: 'Inviter des utilisateurs',
          description: 'Invitez vos premiers collaborateurs à rejoindre l\'organisation',
          completed: false,
          required: false,
          order: 5,
          url: '/onboarding/invite'
        },
        {
          id: 'completion',
          title: 'Finalisation',
          description: 'Votre organisation est prête à être utilisée !',
          completed: false,
          required: true,
          order: 6,
          url: '/onboarding/complete'
        }
      ];

      const wizardStatus: SetupWizardStatus = {
        tenantId,
        currentStep: 1,
        totalSteps: steps.length,
        completedSteps: [],
        steps,
        isComplete: false
      };

      await collections.setup_wizard_status.doc(tenantId).set({
        ...wizardStatus,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return wizardStatus;

    } catch (error) {
      console.error('Error initializing setup wizard:', error);
      throw new TenantError(
        'Failed to initialize setup wizard',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Obtenir le statut du wizard de configuration
   */
  async getSetupWizardStatus(tenantId: string): Promise<SetupWizardStatus> {
    try {
      const doc = await collections.setup_wizard_status.doc(tenantId).get();

      if (!doc.exists) {
        // Initialiser si n'existe pas
        return await this.initializeSetupWizard(tenantId);
      }

      const data = doc.data();
      return {
        tenantId,
        currentStep: data.currentStep,
        totalSteps: data.totalSteps,
        completedSteps: data.completedSteps || [],
        steps: data.steps || [],
        isComplete: data.isComplete || false,
        completedAt: data.completedAt?.toDate()
      };

    } catch (error) {
      console.error('Error getting setup wizard status:', error);
      throw new TenantError(
        'Failed to get setup wizard status',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Marquer une étape comme complétée
   */
  async completeStep(tenantId: string, stepId: string, stepData?: Record<string, any>): Promise<SetupWizardStatus> {
    try {
      const status = await this.getSetupWizardStatus(tenantId);

      // Trouver l'étape
      const stepIndex = status.steps.findIndex(step => step.id === stepId);
      if (stepIndex === -1) {
        throw new TenantError('Step not found', TenantErrorCode.TENANT_NOT_FOUND);
      }

      // Marquer l'étape comme complétée
      status.steps[stepIndex].completed = true;
      if (stepData) {
        status.steps[stepIndex].data = stepData;
      }

      // Ajouter à la liste des étapes complétées
      if (!status.completedSteps.includes(stepId)) {
        status.completedSteps.push(stepId);
      }

      // Calculer la prochaine étape
      const nextIncompleteStep = status.steps.find(step => !step.completed);
      status.currentStep = nextIncompleteStep ? nextIncompleteStep.order : status.totalSteps;

      // Vérifier si toutes les étapes requises sont complétées
      const requiredSteps = status.steps.filter(step => step.required);
      const completedRequiredSteps = requiredSteps.filter(step => step.completed);
      status.isComplete = completedRequiredSteps.length === requiredSteps.length;

      if (status.isComplete && !status.completedAt) {
        status.completedAt = new Date();
      }

      // Sauvegarder le statut
      await collections.setup_wizard_status.doc(tenantId).update({
        currentStep: status.currentStep,
        completedSteps: status.completedSteps,
        steps: status.steps,
        isComplete: status.isComplete,
        completedAt: status.completedAt,
        updatedAt: new Date()
      });

      // Traiter l'étape spécifique
      await this.processStepCompletion(tenantId, stepId, stepData);

      return status;

    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error completing step:', error);
      throw new TenantError(
        'Failed to complete step',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Configurer le profil de l'organisation
   */
  async setupOrganizationProfile(tenantId: string, profileData: OrganizationProfileData): Promise<void> {
    try {
      await tenantService.updateTenant(tenantId, {
        name: profileData.name,
        settings: {
          timezone: profileData.settings.timezone,
          locale: profileData.settings.language,
          currency: profileData.settings.currency
        },
        metadata: {
          description: profileData.description,
          website: profileData.website,
          industry: profileData.industry,
          size: profileData.size,
          address: profileData.address,
          dateFormat: profileData.settings.dateFormat,
          timeFormat: profileData.settings.timeFormat,
          setupCompleted: true
        }
      });

      // Marquer l'étape comme complétée
      await this.completeStep(tenantId, 'organization_profile', profileData);

    } catch (error) {
      console.error('Error setting up organization profile:', error);
      throw new TenantError(
        'Failed to setup organization profile',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Inviter des utilisateurs en lot
   */
  async inviteUsers(tenantId: string, invitations: UserInvitationData[], inviterId: string): Promise<{
    successful: number;
    failed: number;
    errors: string[];
  }> {
    try {
      let successful = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const invitation of invitations) {
        try {
          await this.inviteUser(tenantId, invitation, inviterId);
          successful++;
        } catch (error) {
          failed++;
          errors.push(`${invitation.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Marquer l'étape comme complétée si au moins une invitation a réussi
      if (successful > 0) {
        await this.completeStep(tenantId, 'user_invitations', {
          invitedCount: successful,
          failedCount: failed
        });
      }

      return { successful, failed, errors };

    } catch (error) {
      console.error('Error inviting users:', error);
      throw new TenantError(
        'Failed to invite users',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }


  /**
   * Finaliser la configuration
   */
  async completeSetup(tenantId: string, userId: string): Promise<void> {
    try {
      // Marquer le tenant comme configuré
      await tenantService.updateTenant(tenantId, {
        status: TenantStatus.ACTIVE,
        metadata: {
          setupCompletedAt: new Date(),
          setupCompletedBy: userId
        }
      });

      // Marquer l'étape finale comme complétée
      await this.completeStep(tenantId, 'completion', {
        completedBy: userId,
        completedAt: new Date()
      });

      // Envoyer un email de félicitations
      const tenant = await tenantService.getTenant(tenantId);
      const user = await tenantUserService.getUserById(userId, tenantId);

      if (tenant && user) {
        await this.emailService.sendWelcomeEmail(user.email, {
          organizationName: tenant.name,
          adminName: `${user.firstName} ${user.lastName}`,
          setupUrl: `${process.env.FRONTEND_URL}/dashboard`
        });
      }

    } catch (error) {
      console.error('Error completing setup:', error);
      throw new TenantError(
        'Failed to complete setup',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Obtenir les suggestions de configuration basées sur l'industrie
   */
  async getIndustrySuggestions(industry: string): Promise<{
    userRoles: string[];
    eventTypes: string[];
    departments: string[];
    settings: Record<string, any>;
  }> {
    const suggestions: Record<string, any> = {
      education: {
        userRoles: ['Enseignant', 'Étudiant', 'Administrateur', 'Personnel'],
        eventTypes: ['Cours', 'Examen', 'Conférence', 'Réunion', 'Formation'],
        departments: ['Administration', 'Enseignement', 'Recherche', 'Services'],
        settings: {
          timeFormat: '24h',
          weekStart: 'monday',
          defaultEventDuration: 120
        }
      },
      healthcare: {
        userRoles: ['Médecin', 'Infirmier', 'Administrateur', 'Technicien'],
        eventTypes: ['Consultation', 'Intervention', 'Formation', 'Réunion', 'Garde'],
        departments: ['Médecine', 'Chirurgie', 'Administration', 'Urgences'],
        settings: {
          timeFormat: '24h',
          weekStart: 'monday',
          defaultEventDuration: 60
        }
      },
      corporate: {
        userRoles: ['Manager', 'Employé', 'RH', 'Administrateur'],
        eventTypes: ['Réunion', 'Formation', 'Présentation', 'Entretien', 'Événement'],
        departments: ['RH', 'IT', 'Marketing', 'Ventes', 'Finance'],
        settings: {
          timeFormat: '24h',
          weekStart: 'monday',
          defaultEventDuration: 60
        }
      }
    };

    return suggestions[industry] || suggestions.corporate;
  }

  // Méthodes privées

  private async processStepCompletion(tenantId: string, stepId: string, stepData?: Record<string, any>): Promise<void> {
    try {
      switch (stepId) {
        case 'welcome':
          // Enregistrer la date de début de configuration
          await collections.tenant_analytics.doc(tenantId).set({
            tenantId,
            onboardingStarted: new Date(),
            onboardingStep: stepId,
            createdAt: new Date()
          }, { merge: true });
          break;

        case 'organization_profile':
          // Analyser les données du profil pour des suggestions
          if (stepData?.industry) {
            const suggestions = await this.getIndustrySuggestions(stepData.industry);
            await collections.tenant_suggestions.doc(tenantId).set(suggestions);
          }
          break;

        case 'settings':
          // Enregistrer que les paramètres ont été configurés
          await collections.tenant_analytics.doc(tenantId).set({
            settingsConfigured: true,
            settingsConfiguredAt: new Date()
          }, { merge: true });
          break;

        case 'attendance_policy':
          // Enregistrer que la politique de présence a été configurée
          await collections.tenant_analytics.doc(tenantId).set({
            attendancePolicyConfigured: true,
            attendancePolicyConfiguredAt: new Date()
          }, { merge: true });
          break;

        case 'user_invitations':
          // Enregistrer les statistiques d'invitation
          await collections.tenant_analytics.doc(tenantId).set({
            usersInvited: stepData?.invitedCount || 0,
            usersInvitedAt: new Date()
          }, { merge: true });
          break;

        case 'completion':
          // Enregistrer les métriques de fin d'onboarding
          await collections.tenant_analytics.doc(tenantId).set({
            onboardingCompleted: new Date(),
            onboardingDuration: Date.now() - (await this.getOnboardingStartTime(tenantId))
          }, { merge: true });
          break;
      }
    } catch (error) {
      console.error('Error processing step completion:', error);
      // Ne pas faire échouer la completion de l'étape pour des erreurs d'analytics
    }
  }

  private async inviteUser(tenantId: string, invitation: UserInvitationData, inviterId: string): Promise<void> {
    // Vérifier que l'email n'existe pas déjà dans ce tenant
    const existingUser = await collections.users
      .where('email', '==', invitation.email.toLowerCase())
      .limit(1)
      .get();

    // Vérifier si l'utilisateur existe déjà dans ce tenant spécifique
    if (!existingUser.empty) {
      const userData = existingUser.docs[0].data();
      // Vérifier les memberships du tenant pour cet utilisateur
      const membership = await collections.tenant_memberships
        .where('userId', '==',userData.id)
        .where('tenantId', '==', tenantId)
        .limit(1)
        .get();
      
      if (!membership.empty) {
        throw new Error('User already exists in this organization');
      }
    }

    // Créer l'invitation
    const invitationId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours

    await collections.user_invitations.doc(invitationId).set({
      tenantId,
      email: invitation.email.toLowerCase(),
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      role: invitation.role,
      permissions: invitation.permissions || [],
      department: invitation.department,
      invitedBy: inviterId,
      status: 'pending',
      createdAt: new Date(),
      expiresAt
    });

    // Envoyer l'email d'invitation
    const tenant = await tenantService.getTenant(tenantId);
    const inviter = await tenantUserService.getUserById(inviterId, tenantId);

    if (tenant && inviter) {
      const invitationUrl = `${process.env.FRONTEND_URL}/accept-invitation?token=${invitationId}`;

      console.log(`📧 Sending invitation email to ${invitation.email}`, {
        organizationName: tenant.name,
        inviterName: `${inviter.firstName} ${inviter.lastName}`,
        role: invitation.role,
        invitationUrl
      });

      await this.emailService.sendInvitationEmail(invitation.email, {
        organizationName: tenant.name,
        inviterName: `${inviter.firstName} ${inviter.lastName}`,
        role: invitation.role,
        invitationUrl,
        expiresIn: '7 jours'
      });

      console.log(`✅ Invitation email sent successfully to ${invitation.email}`);
    } else {
      console.error('❌ Cannot send invitation email: tenant or inviter not found', {
        tenantFound: !!tenant,
        inviterFound: !!inviter,
        tenantId,
        inviterId
      });
      throw new Error('Cannot send invitation email: tenant or inviter not found');
    }
  }



  private async getOnboardingStartTime(tenantId: string): Promise<number> {
    try {
      const doc = await collections.tenant_analytics.doc(tenantId).get();
      if (doc.exists) {
        const data = doc.data();
        return data.onboardingStarted?.toDate().getTime() || Date.now();
      }
      return Date.now();
    } catch (error) {
      return Date.now();
    }
  }

  /**
   * Generate demo data for a tenant
   */
  async generateDemoData(tenantId: string, options: any): Promise<void> {
    try {
      // TODO: Implement demo data generation logic
      // This could include creating sample events, users, etc.
      console.log(`Generating demo data for tenant ${tenantId} with options:`, options);
      
      // For now, just log the operation
      // In a real implementation, this would create sample data
      // based on the provided options
      
    } catch (error) {
      console.error('Error generating demo data:', error);
      throw error;
    }
  }
}

// Instance singleton
export const setupWizardService = new SetupWizardService();
export default setupWizardService;