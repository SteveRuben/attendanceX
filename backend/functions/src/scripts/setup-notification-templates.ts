/**
 * Script pour initialiser les templates de notifications
 */

import { db } from '../config/database';
import { DEFAULT_PRESENCE_NOTIFICATION_TEMPLATES } from '../config/notification-templates';
import { logger } from 'firebase-functions';

export async function setupNotificationTemplates(): Promise<void> {
  try {
    logger.info('Setting up notification templates...');

    const batch = db.batch();
    const templatesCollection = db.collection('notification_templates');

    for (const template of DEFAULT_PRESENCE_NOTIFICATION_TEMPLATES) {
      const docRef = templatesCollection.doc(template.id);
      batch.set(docRef, {
        ...template,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      });
    }

    await batch.commit();

    logger.info(`Successfully set up ${DEFAULT_PRESENCE_NOTIFICATION_TEMPLATES.length} notification templates`);

  } catch (error) {
    logger.error('Failed to setup notification templates', { error });
    throw error;
  }
}

// Fonction pour mettre à jour un template existant
export async function updateNotificationTemplate(
  templateId: string,
  updates: Partial<{
    title: string;
    body: string;
    variables: string[];
    channel: string;
    priority: string;
    isActive: boolean;
  }>
): Promise<void> {
  try {
    const templateRef = db.collection('notification_templates').doc(templateId);
    
    await templateRef.update({
      ...updates,
      updatedAt: new Date()
    });

    logger.info('Notification template updated', { templateId, updates });

  } catch (error) {
    logger.error('Failed to update notification template', { error, templateId });
    throw error;
  }
}

// Fonction pour désactiver un template
export async function deactivateNotificationTemplate(templateId: string): Promise<void> {
  try {
    const templateRef = db.collection('notification_templates').doc(templateId);
    
    await templateRef.update({
      isActive: false,
      updatedAt: new Date()
    });

    logger.info('Notification template deactivated', { templateId });

  } catch (error) {
    logger.error('Failed to deactivate notification template', { error, templateId });
    throw error;
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  setupNotificationTemplates()
    .then(() => {
      console.log('Notification templates setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Notification templates setup failed:', error);
      process.exit(1);
    });
}