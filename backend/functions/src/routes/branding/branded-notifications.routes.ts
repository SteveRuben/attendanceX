/**
 * Routes pour les notifications brandées
 */

import { Router } from 'express';
import { brandedNotificationService } from '../../services/notification/branded-notification.service';
import { tenantContextMiddleware } from '../../middleware/tenant-context.middleware';

const router = Router();

// Middleware pour toutes les routes de notifications
router.use(tenantContextMiddleware.injectTenantContext);
router.use(tenantContextMiddleware.validateTenantAccess);

/**
 * POST /api/branded-notifications/email
 * Envoyer un email brandé
 */
router.post('/email', async (req, res) => {
  try {
    const tenantId = req.tenantContext?.tenant.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const { templateName, recipientEmail, recipientName, variables, attachments } = req.body;

    if (!templateName || !recipientEmail) {
      return res.status(400).json({ error: 'Template name and recipient email are required' });
    }

    await brandedNotificationService.sendBrandedEmail({
      tenantId,
      templateName,
      recipientEmail,
      recipientName,
      variables,
      attachments
    });

    return res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending branded email:', error);
    return res.status(500).json({ error: 'Failed to send branded email' });
  }
});

/**
 * POST /api/branded-notifications/sms
 * Envoyer un SMS brandé
 */
router.post('/sms', async (req, res) => {
  try {
    const tenantId = req.tenantContext?.tenant.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const { templateName, phoneNumber, variables } = req.body;

    if (!templateName || !phoneNumber) {
      return res.status(400).json({ error: 'Template name and phone number are required' });
    }

    await brandedNotificationService.sendBrandedSMS({
      tenantId,
      templateName,
      phoneNumber,
      variables
    });

    return res.json({ success: true, message: 'SMS sent successfully' });
  } catch (error) {
    console.error('Error sending branded SMS:', error);
    return res.status(500).json({ error: 'Failed to send branded SMS' });
  }
});

/**
 * POST /api/branded-notifications/in-app
 * Créer une notification in-app brandée
 */
router.post('/in-app', async (req, res) => {
  try {
    const tenantId = req.tenantContext?.tenant.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const { userId, title, message, type, actionUrl, actionText } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({ error: 'User ID, title, and message are required' });
    }

    await brandedNotificationService.createInAppNotification({
      tenantId,
      userId,
      title,
      message,
      type: type || 'info',
      actionUrl,
      actionText
    });

    return res.json({ success: true, message: 'In-app notification created successfully' });
  } catch (error) {
    console.error('Error creating in-app notification:', error);
    return res.status(500).json({ error: 'Failed to create in-app notification' });
  }
});

/**
 * POST /api/branded-notifications/pdf-report
 * Générer un rapport PDF brandé
 */
router.post('/pdf-report', async (req, res) => {
  try {
    const tenantId = req.tenantContext?.tenant.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const { templateName, data, filename } = req.body;

    if (!templateName || !data || !filename) {
      return res.status(400).json({ error: 'Template name, data, and filename are required' });
    }

    const pdfBuffer = await brandedNotificationService.generateBrandedPDFReport({
      tenantId,
      templateName,
      data,
      filename
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return  res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating branded PDF report:', error);
    return  res.status(500).json({ error: 'Failed to generate branded PDF report' });
  }
});

/**
 * GET /api/branded-notifications/templates
 * Obtenir la liste des templates disponibles
 */
router.get('/templates', async (req, res) => {
  try {
    const templates = {
      email: [
        { name: 'welcome', description: 'Email de bienvenue' },
        { name: 'invitation', description: 'Invitation utilisateur' },
        { name: 'payment_failed', description: 'Échec de paiement' }
      ],
      sms: [
        { name: 'welcome', description: 'SMS de bienvenue' },
        { name: 'invitation', description: 'Invitation par SMS' },
        { name: 'payment_reminder', description: 'Rappel de paiement' },
        { name: 'security_alert', description: 'Alerte sécurité' }
      ],
      pdf: [
        { name: 'usage_report', description: 'Rapport d\'utilisation' },
        { name: 'invoice', description: 'Facture' }
      ]
    };

    res.json(templates);
  } catch (error) {
    console.error('Error getting notification templates:', error);
    res.status(500).json({ error: 'Failed to get notification templates' });
  }
});

export default router;