/**
 * Routes publiques pour l'enregistrement des tenants
 * Endpoints accessibles sans authentification pour l'inscription
 */

import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { tenantRegistrationService } from '../../services/onboarding/tenant-registration.service';
import { asyncHandler } from '../../middleware/errorHandler';
import { rateLimit } from '../../middleware/rateLimit';

const router = Router();

// Rate limiting pour les endpoints publics
const registrationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 tentatives par IP
  message: 'Too many registration attempts, please try again later'
});

const verificationRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 10, // 10 tentatives par IP
  message: 'Too many verification attempts, please try again later'
});

/**
 * Enregistrer un nouveau tenant
 * POST /public/register
 */
router.post('/register', 
  registrationRateLimit,
  [
    // Validation des données d'entrée
    body('organizationName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Organization name must be between 2 and 100 characters'),
    
    body('adminEmail')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email address is required'),
    
    body('adminFirstName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name is required'),
    
    body('adminLastName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name is required'),
    
    body('adminPassword')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must be at least 8 characters with uppercase, lowercase and number'),
    
    body('selectedPlan')
      .isIn(['free', 'basic', 'pro', 'enterprise'])
      .withMessage('Invalid plan selection'),
    
    body('billingCycle')
      .isIn(['monthly', 'yearly'])
      .withMessage('Invalid billing cycle'),
    
    body('timezone')
      .isLength({ min: 1 })
      .withMessage('Timezone is required'),
    
    body('language')
      .isIn(['fr', 'en', 'es', 'de'])
      .withMessage('Invalid language'),
    
    body('currency')
      .isIn(['EUR', 'USD', 'GBP', 'CAD'])
      .withMessage('Invalid currency'),
    
    body('termsAccepted')
      .equals('true')
      .withMessage('Terms of service must be accepted'),
    
    body('privacyAccepted')
      .equals('true')
      .withMessage('Privacy policy must be accepted')
  ],
  asyncHandler(async (req, res) => {
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    try {
      const registrationData = {
        organizationName: req.body.organizationName,
        adminEmail: req.body.adminEmail,
        adminFirstName: req.body.adminFirstName,
        adminLastName: req.body.adminLastName,
        adminPassword: req.body.adminPassword,
        selectedPlan: req.body.selectedPlan,
        billingCycle: req.body.billingCycle,
        timezone: req.body.timezone,
        language: req.body.language,
        currency: req.body.currency,
        termsAccepted: req.body.termsAccepted === 'true',
        privacyAccepted: req.body.privacyAccepted === 'true',
        marketingOptIn: req.body.marketingOptIn === 'true'
      };

      const result = await tenantRegistrationService.registerTenant(registrationData);

      return res.status(201).json({
        success: true,
        data: {
          tenantId: result.tenantId,
          slug: result.slug,
          setupUrl: result.setupUrl,
          message: result.message
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      
      if (error instanceof Error && error.message.includes('Email address is already registered')) {
        return res.status(409).json({
          success: false,
          error: 'Email address is already registered',
          code: 'EMAIL_ALREADY_EXISTS'
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Registration failed. Please try again.',
        code: 'REGISTRATION_FAILED'
      });
    }
  })
);

/**
 * Vérifier l'email d'un tenant
 * POST /public/verify-email
 */
router.post('/verify-email',
  verificationRateLimit,
  [
    body('token')
      .isLength({ min: 32, max: 128 })
      .withMessage('Invalid verification token'),
    
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email address is required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    try {
      const result = await tenantRegistrationService.verifyEmail({
        token: req.body.token,
        email: req.body.email
      });

      return res.json({
        success: true,
        data: {
          tenantId: result.tenantId,
          setupUrl: result.setupUrl,
          message: 'Email verified successfully. You can now complete your setup.'
        }
      });

    } catch (error) {
      console.error('Email verification error:', error);
      
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification token',
        code: 'VERIFICATION_FAILED'
      });
    }
  })
);

/**
 * Renvoyer l'email de vérification
 * POST /public/resend-verification
 */
router.post('/resend-verification',
  verificationRateLimit,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email address is required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    try {
      // Trouver le tenant par email admin
      const userSnapshot = await collections.users
        .where('email', '==', req.body.email.toLowerCase())
        .where('role', '==', 'owner')
        .where('status', '==', 'pending_verification')
        .limit(1)
        .get();

      if (userSnapshot.empty) {
        return res.status(404).json({
          success: false,
          error: 'No pending verification found for this email',
          code: 'VERIFICATION_NOT_FOUND'
        });
      }

      const user = userSnapshot.docs[0].data();
      await tenantRegistrationService.resendVerificationEmail(user.tenantId);

      return res.json({
        success: true,
        message: 'Verification email sent successfully'
      });

    } catch (error) {
      console.error('Resend verification error:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Failed to resend verification email',
        code: 'RESEND_FAILED'
      });
    }
  })
);

/**
 * Vérifier la disponibilité d'un slug
 * GET /public/check-slug/:slug
 */
router.get('/check-slug/:slug',
  rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 20 // 20 vérifications par minute
  }),
  asyncHandler(async (req, res) => {
    let { slug } = req.params;
    
    // Ensure slug is a string
    if (Array.isArray(slug)) {
      slug = slug[0];
    }

    if (!slug || slug.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Slug must be at least 3 characters'
      });
    }

    try {
      const existingTenant = await collections.tenants
        .where('slug', '==', slug.toLowerCase())
        .limit(1)
        .get();

      const isAvailable = existingTenant.empty;

      return res.json({
        success: true,
        data: {
          slug: slug.toLowerCase(),
          available: isAvailable,
          suggestion: isAvailable ? null : `${slug}-${Math.floor(Math.random() * 1000)}`
        }
      });

    } catch (error) {
      console.error('Slug check error:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Failed to check slug availability'
      });
    }
  })
);

/**
 * Obtenir les plans d'abonnement disponibles
 * GET /public/plans
 */
router.get('/plans',
  rateLimit({
    windowMs: 1 * 60 * 1000,
    maxRequests: 60 // 60 requêtes par minute
  }),
  asyncHandler(async (req, res) => {
    try {
      // Retourner les plans publics (sans informations sensibles)
      const publicPlans = [
        {
          id: 'free',
          name: 'Free',
          description: 'Perfect to get started',
          price: {
            monthly: 0,
            yearly: 0
          },
          features: [
            'Up to 5 team members',
            '10 events per month',
            '100 MB storage',
            'Basic reporting',
            'Email support'
          ],
          limits: {
            users: 5,
            events: 10,
            storage: 100
          },
          popular: false
        },
        {
          id: 'basic',
          name: 'Basic',
          description: 'For small teams',
          price: {
            monthly: 29,
            yearly: 278 // 20% discount
          },
          features: [
            'Up to 25 team members',
            '100 events per month',
            '1 GB storage',
            'Advanced reporting',
            'Email support',
            'Mobile app access'
          ],
          limits: {
            users: 25,
            events: 100,
            storage: 1000
          },
          popular: true
        },
        {
          id: 'pro',
          name: 'Professional',
          description: 'For growing teams',
          price: {
            monthly: 99,
            yearly: 950 // 20% discount
          },
          features: [
            'Up to 100 team members',
            'Unlimited events',
            '10 GB storage',
            'Advanced analytics',
            'API access',
            'Priority support',
            'Custom integrations'
          ],
          limits: {
            users: 100,
            events: 999999,
            storage: 10000
          },
          popular: false
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          description: 'For large organizations',
          price: {
            monthly: 299,
            yearly: 2870 // 20% discount
          },
          features: [
            'Unlimited team members',
            'Unlimited events',
            '100 GB storage',
            'All features included',
            'Dedicated support',
            'Custom branding',
            'SSO & advanced security',
            'SLA guarantee'
          ],
          limits: {
            users: 999999,
            events: 999999,
            storage: 100000
          },
          popular: false
        }
      ];

      res.json({
        success: true,
        data: {
          plans: publicPlans,
          currency: 'EUR',
          billingCycles: ['monthly', 'yearly']
        }
      });

    } catch (error) {
      console.error('Error getting public plans:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get plans'
      });
    }
  })
);

// Import des collections nécessaires
import { collections } from '../../config/database';

export default router;