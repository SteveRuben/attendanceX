# Requirements Document - Email System Enhancements

## Introduction

Ce spec vise à améliorer le système d'email existant avec quatre améliorations majeures : configuration SendGrid pour volume élevé, mode développement avec logging, monitoring des providers, et UI améliorée pour la récupération d'erreurs. Ces améliorations rendront le système plus robuste, observable et convivial.

## Requirements

### Requirement 1 - Configuration SendGrid pour Volume Élevé

**User Story:** En tant qu'administrateur système, je veux configurer SendGrid comme provider principal d'email, afin de gérer un volume élevé d'emails avec une meilleure délivrabilité.

#### Acceptance Criteria

1. WHEN SendGrid API key is configured THEN it must be used as primary email provider
2. WHEN SendGrid is unavailable THEN system must automatically failover to SMTP
3. WHEN sending email via SendGrid THEN delivery status must be tracked
4. WHEN SendGrid rate limits are reached THEN appropriate errors must be returned
5. WHEN SendGrid webhooks are received THEN email status must be updated in database
6. WHEN domain is verified in SendGrid THEN SPF/DKIM records must be configured
7. WHEN testing SendGrid connection THEN validation endpoint must confirm configuration

### Requirement 2 - Mode Développement avec Email Logging

**User Story:** En tant que développeur, je veux tester les flux d'email localement sans envoyer de vrais emails, afin de développer et déboguer efficacement.

#### Acceptance Criteria

1. WHEN `NODE_ENV=development` AND no email provider configured THEN emails must be logged to console
2. WHEN in development mode THEN email HTML must be saved to local files
3. WHEN development email is logged THEN all variables (to, subject, body, links) must be visible
4. WHEN switching to production THEN no code changes should be required
5. WHEN development mode is active THEN clear indicator must appear in logs
6. WHEN testing email templates THEN preview URLs must be generated
7. WHEN rate limiting is tested THEN it must be configurable in development

### Requirement 3 - Monitoring des Email Providers

**User Story:** En tant qu'administrateur système, je veux monitorer la santé et performance des email providers, afin de détecter et résoudre proactivement les problèmes de délivrabilité.

#### Acceptance Criteria

1. WHEN an email is sent THEN provider used, status, and delivery time must be logged
2. WHEN email send fails THEN failure reason and provider must be recorded
3. WHEN checking system health THEN email provider status must be included
4. WHEN provider fails consistently THEN alert must be generated
5. WHEN viewing metrics THEN delivery rates per provider must be displayed
6. WHEN troubleshooting THEN full audit trail must be accessible via API
7. WHEN provider is disabled THEN reason and timestamp must be recorded

### Requirement 4 - UI de Récupération d'Erreurs Email

**User Story:** En tant qu'utilisateur dont l'email de vérification a échoué, je veux des instructions claires et des actions immédiates, afin de compléter mon inscription facilement.

#### Acceptance Criteria

1. WHEN registration succeeds but email fails THEN user must see both success and warning messages
2. WHEN email sending fails THEN "Resend Email" button must be immediately available
3. WHEN user clicks resend THEN loading state must be shown during operation
4. WHEN resend succeeds THEN success toast notification must appear
5. WHEN resend fails THEN error message must explain the issue and suggest alternatives
6. WHEN rate limit is reached THEN user must see countdown timer for next attempt
7. WHEN multiple resends fail THEN contact support option must be displayed

### Requirement 5 - API de Monitoring Email

**User Story:** En tant qu'administrateur système, je veux une API pour consulter les métriques et statuts d'email, afin de monitorer la santé du système.

#### Acceptance Criteria

1. WHEN calling GET /api/admin/email/stats THEN delivery metrics must be returned
2. WHEN calling GET /api/admin/email/providers THEN provider status must be returned
3. WHEN calling POST /api/admin/email/test THEN test email must be sent and status returned
4. WHEN calling GET /api/admin/email/logs THEN recent email logs must be returned with pagination
5. WHEN calling GET /api/admin/email/failures THEN failed emails must be returned with reasons
6. WHEN accessing admin endpoints THEN proper authentication and authorization must be enforced
7. WHEN querying metrics THEN date range filtering must be supported

### Requirement 6 - Configuration SendGrid Webhooks

**User Story:** En tant qu'administrateur système, je veux recevoir les webhooks SendGrid pour tracker les statuts d'email en temps réel, afin d'avoir une visibilité complète sur la délivrabilité.

#### Acceptance Criteria

1. WHEN SendGrid webhook is received THEN signature must be validated
2. WHEN email is delivered THEN notification status must be updated to DELIVERED
3. WHEN email bounces THEN notification status must be updated to FAILED with reason
4. WHEN email is opened THEN opened flag must be set with timestamp
5. WHEN email link is clicked THEN clicked flag must be set with timestamp
6. WHEN webhook processing fails THEN error must be logged and retried
7. WHEN webhook endpoint is called THEN it must respond within 3 seconds

### Requirement 7 - Frontend Email Status Tracking

**User Story:** En tant qu'utilisateur, je veux voir le statut de mes emails de vérification, afin de savoir si je dois attendre ou renvoyer l'email.

#### Acceptance Criteria

1. WHEN on registration success page THEN email status indicator must be visible
2. WHEN email is being sent THEN "Sending..." status must be shown
3. WHEN email is sent THEN "Email sent, check your inbox" must be shown
4. WHEN email fails THEN "Email failed to send" with resend button must be shown
5. WHEN checking email status THEN real-time updates must be reflected
6. WHEN email is delivered (via webhook) THEN "Email delivered" status must be shown
7. WHEN user hasn't received email THEN troubleshooting tips must be displayed

### Requirement 8 - Email Template Management

**User Story:** En tant qu'administrateur, je veux gérer les templates d'email via une interface, afin de personnaliser les communications sans déployer du code.

#### Acceptance Criteria

1. WHEN viewing email templates THEN list of all templates must be displayed
2. WHEN editing a template THEN preview must be shown in real-time
3. WHEN saving a template THEN validation must ensure all variables are valid
4. WHEN testing a template THEN test email must be sent to specified address
5. WHEN template uses variables THEN available variables must be documented
6. WHEN template is updated THEN version history must be maintained
7. WHEN reverting a template THEN previous version must be restored

## Non-Functional Requirements

### Performance
- Email sending must complete within 5 seconds
- Webhook processing must complete within 3 seconds
- Monitoring API must respond within 1 second
- Development mode file writing must not block email flow

### Security
- SendGrid API key must be stored securely in environment variables
- Webhook signatures must be validated
- Admin endpoints must require authentication and authorization
- Email logs must not expose sensitive user data

### Scalability
- System must handle 10,000 emails per hour with SendGrid
- Monitoring must support querying millions of email records
- Webhook endpoint must handle 100 requests per second
- Development mode must handle concurrent email logging

### Reliability
- Email failover must be automatic and transparent
- Failed emails must be retryable
- Webhook processing must be idempotent
- Monitoring must have 99.9% uptime

## Dependencies

- SendGrid account with API key
- SendGrid domain verification (SPF, DKIM)
- Firebase Functions for webhook endpoint
- Firestore for email logs and metrics
- Frontend toast notification system
- Admin authentication system

## Success Metrics

- Email delivery rate > 95%
- Average email send time < 3 seconds
- Webhook processing success rate > 99%
- Development mode adoption by all developers
- User satisfaction with error recovery UI
- Monitoring dashboard usage by ops team

## Out of Scope

- Email marketing campaigns (separate feature)
- Email A/B testing
- Advanced email analytics (open rates by device, location)
- Email template visual editor (WYSIWYG)
- Multi-language email templates
- Email scheduling and queuing
