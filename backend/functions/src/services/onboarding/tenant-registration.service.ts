/**
 * Service d'enregistrement des tenants
 * Gère le processus complet d'inscription d'une nouvelle organisation
 */

import { collections } from '../../config/database';
import {
  TenantError,
  TenantErrorCode,
  TenantStatus,
  TenantRole,
  PlanType
} from '../../shared/types/tenant.types';
import { tenantService } from '../tenant/tenant.service';
import { stripePaymentService } from '../billing/stripe-payment.service';
import { emailService } from '../notification/email.service';
import { generateSlug } from '../../utils/slug-generator';
import { generateSecureToken } from '../../utils/token-generator';
import subscriptionLifecycleService, { BillingCycle } from '../subscription/subscription-lifecycle.service';
import PermissionService from '../auth/permission.service';

export interface TenantRegistrationRequest {
  // Informations de l'organisation
  organizationName: string;
  organizationSector: string;
  organizationSize: 'small' | 'medium' | 'large' | 'enterprise';

  // Informations de l'administrateur
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  adminPassword: string;

  // Informations d'abonnement
  selectedPlan: string;
  billingCycle: 'monthly' | 'yearly';

  // Préférences
  timezone: string;
  language: string;
  currency: string;

  // Consentements
  termsAccepted: boolean;
  privacyAccepted: boolean;
  marketingOptIn?: boolean;
}

export interface TenantRegistrationResponse {
  tenantId: string;
  slug: string;
  adminUserId: string;
  verificationToken: string;
  setupUrl: string;
  message: string;
}

export interface EmailVerificationRequest {
  token: string;
  email: string;
}

export interface OnboardingStatus {
  tenantId: string;
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  nextStep: string;
  isComplete: boolean;
}

export class TenantRegistrationService {

  /**
   * Enregistrer un nouveau tenant
   */
  async registerTenant(request: TenantRegistrationRequest): Promise<TenantRegistrationResponse> {
    try {
      // Validation des données
      await this.validateRegistrationRequest(request);

      // Vérifier que l'email n'existe pas déjà
      await this.checkEmailAvailability(request.adminEmail);

      // Générer un slug unique pour l'organisation
      const slug = await this.generateUniqueSlug(request.organizationName);

      // Créer le tenant
      const tenant = await tenantService.createTenant({
        name: request.organizationName,
        slug,
        planId: request.selectedPlan || 'free',
        settings: {
          timezone: request.timezone,
          locale: request.language,
          currency: request.currency
        },
        metadata: {
          organizationSize: request.organizationSize,
          sector: request.organizationSector,
          status: 'pending_verification' // En attente de vérification email
        },
        createdBy: 'system' // Will be updated with actual admin user ID later
      });

      // Créer l'utilisateur administrateur
      const adminUser = await this.createAdminUser(tenant.id, {
        email: request.adminEmail,
        firstName: request.adminFirstName,
        lastName: request.adminLastName,
        password: request.adminPassword
      });

      // Créer l'abonnement initial
      if (request.selectedPlan !== 'free') {
        await this.createInitialSubscription(tenant.id, {
          planId: request.selectedPlan,
          billingCycle: request.billingCycle,
          adminEmail: request.adminEmail
        });
      }

      // Générer le token de vérification
      const verificationToken = await this.generateVerificationToken(tenant.id, request.adminEmail);

      // Envoyer l'email de vérification
      await this.sendVerificationEmail(tenant, adminUser, verificationToken);

      // Créer le statut d'onboarding
      await this.initializeOnboardingStatus(tenant.id);

      // Enregistrer les consentements
      await this.recordConsents(tenant.id, adminUser.id, {
        termsAccepted: request.termsAccepted,
        privacyAccepted: request.privacyAccepted,
        marketingOptIn: request.marketingOptIn || false
      });

      const setupUrl = `${process.env.FRONTEND_URL}/onboarding/${tenant.slug}?token=${verificationToken}`;

      return {
        tenantId: tenant.id,
        slug: tenant.slug,
        adminUserId: adminUser.id,
        verificationToken,
        setupUrl,
        message: 'Tenant créé avec succès. Vérifiez votre email pour continuer.'
      };

    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error registering tenant:', error);
      throw new TenantError(
        'Failed to register tenant',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Vérifier l'email d'un tenant
   */
  async verifyEmail(request: EmailVerificationRequest): Promise<{ success: boolean; tenantId: string; setupUrl: string }> {
    try {
      // Vérifier le token
      const verification = await this.validateVerificationToken(request.token, request.email);

      if (!verification.isValid) {
        throw new TenantError(
          'Invalid or expired verification token',
          TenantErrorCode.TENANT_ACCESS_DENIED
        );
      }

      // Activer le tenant
      await tenantService.updateTenant(verification.tenantId, {
        status: TenantStatus.ACTIVE,
        metadata: {
          emailVerifiedAt: new Date()
        }
      });

      // Activer l'utilisateur administrateur
      await this.activateAdminUser(verification.tenantId, request.email);

      // Marquer le token comme utilisé
      await this.markTokenAsUsed(request.token);

      // Mettre à jour le statut d'onboarding
      await this.updateOnboardingStep(verification.tenantId, 'email_verified');

      const tenant = await tenantService.getTenant(verification.tenantId);
      const setupUrl = `${process.env.FRONTEND_URL}/onboarding/${tenant?.slug}/setup`;

      return {
        success: true,
        tenantId: verification.tenantId,
        setupUrl
      };

    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error verifying email:', error);
      throw new TenantError(
        'Failed to verify email',
        TenantErrorCode.TENANT_ACCESS_DENIED
      );
    }
  }

  /**
   * Obtenir le statut d'onboarding d'un tenant
   */
  async getOnboardingStatus(tenantId: string): Promise<OnboardingStatus> {
    try {
      const doc = await collections.onboarding_status.doc(tenantId).get();

      if (!doc.exists) {
        // Initialiser si n'existe pas
        return await this.initializeOnboardingStatus(tenantId);
      }

      const data = doc.data();
      return {
        tenantId,
        currentStep: data.currentStep,
        totalSteps: data.totalSteps,
        completedSteps: data.completedSteps || [],
        nextStep: data.nextStep,
        isComplete: data.isComplete || false
      };

    } catch (error) {
      console.error('Error getting onboarding status:', error);
      throw new TenantError(
        'Failed to get onboarding status',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Renvoyer l'email de vérification
   */
  async resendVerificationEmail(tenantId: string): Promise<void> {
    try {
      const tenant = await tenantService.getTenant(tenantId);
      if (!tenant) {
        throw new TenantError('Tenant not found', TenantErrorCode.TENANT_NOT_FOUND);
      }

      // Obtenir l'utilisateur admin
      const adminUser = await this.getAdminUser(tenantId);
      if (!adminUser) {
        throw new TenantError('Admin user not found', TenantErrorCode.TENANT_NOT_FOUND);
      }

      // Générer un nouveau token
      const verificationToken = await this.generateVerificationToken(tenantId, adminUser.email);

      // Renvoyer l'email
      await this.sendVerificationEmail(tenant, adminUser, verificationToken);

    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error resending verification email:', error);
      throw new TenantError(
        'Failed to resend verification email',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  // Méthodes privées

  private async validateRegistrationRequest(request: TenantRegistrationRequest): Promise<void> {
    const errors: string[] = [];

    // Validation des champs obligatoires
    if (!request.organizationName?.trim()) {
      errors.push('Organization name is required');
    }

    if (!request.adminEmail?.trim() || !this.isValidEmail(request.adminEmail)) {
      errors.push('Valid admin email is required');
    }

    if (!request.adminFirstName?.trim()) {
      errors.push('Admin first name is required');
    }

    if (!request.adminLastName?.trim()) {
      errors.push('Admin last name is required');
    }

    if (!request.adminPassword || request.adminPassword.length < 8) {
      errors.push('Password must be at least 8 characters');
    }

    if (!request.termsAccepted) {
      errors.push('Terms of service must be accepted');
    }

    if (!request.privacyAccepted) {
      errors.push('Privacy policy must be accepted');
    }

    if (errors.length > 0) {
      throw new TenantError(
        `Validation failed: ${errors.join(', ')}`,
        TenantErrorCode.TENANT_ACCESS_DENIED
      );
    }
  }

  private async checkEmailAvailability(email: string): Promise<void> {
    const existingUser = await collections.users
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (!existingUser.empty) {
      throw new TenantError(
        'Email address is already registered',
        TenantErrorCode.TENANT_ACCESS_DENIED
      );
    }
  }

  private async generateUniqueSlug(organizationName: string): Promise<string> {
    let baseSlug = generateSlug(organizationName);
    let slug = baseSlug;
    let counter = 1;

    while (await this.slugExists(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  private async slugExists(slug: string): Promise<boolean> {
    const existing = await collections.tenants
      .where('slug', '==', slug)
      .limit(1)
      .get();

    return !existing.empty;
  }

  private async createAdminUser(tenantId: string, userData: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
  }): Promise<any> {
    // TODO: Intégrer avec Firebase Auth pour créer l'utilisateur
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Obtenir le plan du tenant pour déterminer le rôle application
    const tenant = await tenantService.getTenant(tenantId);
    if (!tenant) {
      throw new TenantError('Tenant not found', TenantErrorCode.TENANT_NOT_FOUND);
    }

    // Déterminer le rôle application basé sur le plan (utiliser FREE par défaut pendant l'enregistrement)
    const applicationRole = PermissionService.getApplicationRoleForPlan(PlanType.FREE);
    const featurePermissions = PermissionService.getPermissionsForApplicationRole(applicationRole);

    const user = {
      id: userId,
      tenantId,
      email: userData.email.toLowerCase(),
      profile: {
        firstName: userData.firstName,
        lastName: userData.lastName
      },
      role: TenantRole.OWNER,
      applicationRole,
      permissions: ['*'], // Toutes les permissions tenant pour le propriétaire
      featurePermissions,
      status: 'pending_verification',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await collections.users.doc(userId).set(user);

    // Créer l'appartenance au tenant avec les deux types de rôles
    await collections.tenant_memberships.add({
      tenantId,
      userId,
      role: TenantRole.OWNER,
      applicationRole,
      permissions: ['*'],
      featurePermissions,
      joinedAt: new Date(),
      invitedBy: userId, // Auto-invitation
      isActive: false, // Sera activé après vérification email
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return user;
  }

  private async createInitialSubscription(tenantId: string, subscriptionData: {
    planId: string;
    billingCycle: 'monthly' | 'yearly';
    adminEmail: string;
  }): Promise<void> {
    try {
      // Créer le client Stripe
      await stripePaymentService.createStripeCustomer({
        tenantId,
        email: subscriptionData.adminEmail,
        name: `Tenant ${tenantId}`
      });

      // Créer l'abonnement (sera activé après vérification email)
      await subscriptionLifecycleService.createSubscription({
        tenantId,
        planId: subscriptionData.planId,
        billingCycle: subscriptionData.billingCycle === "monthly" ? BillingCycle.MONTHLY : BillingCycle.YEARLY,
        startTrial: true, // Période d'essai par défaut
        trialDays: 14
      });

    } catch (error) {
      console.error('Error creating initial subscription:', error);
      // Ne pas faire échouer l'enregistrement pour un problème de facturation
    }
  }

  private async generateVerificationToken(tenantId: string, email: string): Promise<string> {
    const token = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures

    await collections.email_verifications.add({
      token,
      tenantId,
      email: email.toLowerCase(),
      expiresAt,
      used: false,
      createdAt: new Date()
    });

    return token;
  }

  private async sendVerificationEmail(tenant: any, user: any, token: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}&email=${encodeURIComponent(user.email)}`;

    await emailService.sendEmail({
      to: user.email,
      subject: `Vérifiez votre email pour ${tenant.name}`,
      template: 'tenant_verification',
      data: {
        organizationName: tenant.name,
        adminName: `${user.profile.firstName} ${user.profile.lastName}`,
        verificationUrl,
        expiresIn: '24 heures'
      }
    });
  }

  private async initializeOnboardingStatus(tenantId: string): Promise<OnboardingStatus> {
    const onboardingSteps = [
      'email_verification',
      'organization_setup',
      'team_invitation',
      'demo_data_setup',
      'welcome_tour'
    ];

    const status: OnboardingStatus = {
      tenantId,
      currentStep: 1,
      totalSteps: onboardingSteps.length,
      completedSteps: [],
      nextStep: onboardingSteps[0],
      isComplete: false
    };

    await collections.onboarding_status.doc(tenantId).set({
      ...status,
      steps: onboardingSteps,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return status;
  }

  private async updateOnboardingStep(tenantId: string, completedStep: string): Promise<void> {
    const doc = await collections.onboarding_status.doc(tenantId).get();
    if (!doc.exists) return;

    const data = doc.data();
    const completedSteps = [...(data.completedSteps || []), completedStep];
    const currentStep = completedSteps.length + 1;
    const isComplete = currentStep > data.totalSteps;
    const nextStep = isComplete ? null : data.steps[currentStep - 1];

    await collections.onboarding_status.doc(tenantId).update({
      currentStep,
      completedSteps,
      nextStep,
      isComplete,
      updatedAt: new Date()
    });
  }

  private async validateVerificationToken(token: string, email: string): Promise<{ isValid: boolean; tenantId?: string }> {
    const snapshot = await collections.email_verifications
      .where('token', '==', token)
      .where('email', '==', email.toLowerCase())
      .where('used', '==', false)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { isValid: false };
    }

    const verification = snapshot.docs[0].data();
    const now = new Date();

    if (verification.expiresAt.toDate() < now) {
      return { isValid: false };
    }

    return {
      isValid: true,
      tenantId: verification.tenantId
    };
  }

  private async markTokenAsUsed(token: string): Promise<void> {
    const snapshot = await collections.email_verifications
      .where('token', '==', token)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      await snapshot.docs[0].ref.update({
        used: true,
        usedAt: new Date()
      });
    }
  }

  private async activateAdminUser(tenantId: string, email: string): Promise<void> {
    const userSnapshot = await collections.users
      .where('tenantId', '==', tenantId)
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (!userSnapshot.empty) {
      await userSnapshot.docs[0].ref.update({
        status: 'active',
        emailVerifiedAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Activer l'appartenance au tenant
    const membershipSnapshot = await collections.tenant_memberships
      .where('tenantId', '==', tenantId)
      .where('userId', '==', userSnapshot.docs[0].id)
      .limit(1)
      .get();

    if (!membershipSnapshot.empty) {
      await membershipSnapshot.docs[0].ref.update({
        status: 'active',
        activatedAt: new Date()
      });
    }
  }

  private async getAdminUser(tenantId: string): Promise<any> {
    const snapshot = await collections.users
      .where('tenantId', '==', tenantId)
      .where('role', '==', 'owner')
      .limit(1)
      .get();

    return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  }

  private async recordConsents(tenantId: string, userId: string, consents: {
    termsAccepted: boolean;
    privacyAccepted: boolean;
    marketingOptIn: boolean;
  }): Promise<void> {
    await collections.user_consents.add({
      tenantId,
      userId,
      ...consents,
      ipAddress: 'unknown', // TODO: Capturer l'IP réelle
      userAgent: 'unknown', // TODO: Capturer le user agent
      consentDate: new Date()
    });
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Ajouter les collections manquantes
declare module '../../config/database' {
  interface Collections {
    email_verifications: any;
    onboarding_status: any;
    user_consents: any;
  }
}

// Instance singleton
export const tenantRegistrationService = new TenantRegistrationService();
export default tenantRegistrationService;