import { AppointmentNotificationTemplate } from "@attendance-x/shared";

/**
 * Templates de notification pour les rendez-vous
 * Ces templates sont utilisés pour générer les messages de rappel, confirmation, etc.
 */

export const APPOINTMENT_EMAIL_TEMPLATES: AppointmentNotificationTemplate[] = [
  {
    id: "appointment_reminder_24h_email",
    type: "email",
    language: "fr",
    subject: "Rappel: Rendez-vous demain à {{startTime}}",
    content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #2c3e50; margin-top: 0;">Rappel de rendez-vous</h2>
        </div>
        
        <p>Bonjour {{clientFirstName}},</p>
        
        <p>Nous vous rappelons que vous avez un rendez-vous <strong>demain</strong> :</p>
        
        <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2196f3;">
          <h3 style="margin-top: 0; color: #1976d2;">Détails du rendez-vous</h3>
          <p><strong>📅 Date:</strong> {{appointmentDate}}</p>
          <p><strong>🕐 Heure:</strong> {{startTime}}</p>
          <p><strong>⏱️ Durée:</strong> {{duration}}</p>
          {{#if serviceName}}<p><strong>🔧 Service:</strong> {{serviceName}}</p>{{/if}}
          {{#if practitionerName}}<p><strong>👨‍⚕️ Praticien:</strong> {{practitionerName}}</p>{{/if}}
          {{#if notes}}<p><strong>📝 Notes:</strong> {{notes}}</p>{{/if}}
        </div>
        
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p style="margin: 0;"><strong>⚠️ Important:</strong> Si vous ne pouvez pas vous présenter, merci de nous prévenir au moins 24h à l'avance.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{confirmationUrl}}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            ✅ Confirmer ma présence
          </a>
          <br><br>
          <a href="{{rescheduleUrl}}" style="background-color: #ffc107; color: #212529; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">
            📅 Reporter le rendez-vous
          </a>
          <a href="{{cancelUrl}}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            ❌ Annuler
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
        
        <p style="color: #6c757d; font-size: 14px;">
          Cordialement,<br>
          <strong>{{organizationName}}</strong><br>
          {{#if organizationPhone}}📞 {{organizationPhone}}<br>{{/if}}
          {{#if organizationEmail}}✉️ {{organizationEmail}}{{/if}}
        </p>
      </div>
    `,
    variables: [
      "clientFirstName", "appointmentDate", "startTime", "duration", 
      "serviceName", "practitionerName", "notes", "organizationName",
      "organizationPhone", "organizationEmail", "confirmationUrl", 
      "rescheduleUrl", "cancelUrl"
    ]
  },
  
  {
    id: "appointment_reminder_2h_email",
    type: "email",
    language: "fr",
    subject: "Rappel: Rendez-vous dans 2h à {{startTime}}",
    content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
          <h2 style="color: #856404; margin-top: 0;">⏰ Rappel urgent - Rendez-vous dans 2h</h2>
        </div>
        
        <p>Bonjour {{clientFirstName}},</p>
        
        <p>Votre rendez-vous approche ! Vous avez rendez-vous <strong>dans 2 heures</strong> :</p>
        
        <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2196f3;">
          <p><strong>🕐 Heure:</strong> {{startTime}}</p>
          <p><strong>⏱️ Durée:</strong> {{duration}}</p>
          {{#if address}}<p><strong>📍 Adresse:</strong> {{address}}</p>{{/if}}
        </div>
        
        <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
          <p style="margin: 0;"><strong>💡 Conseil:</strong> Pensez à arriver 10 minutes en avance et à apporter les documents nécessaires.</p>
        </div>
        
        <p style="color: #6c757d; font-size: 14px;">
          À bientôt,<br>
          <strong>{{organizationName}}</strong>
        </p>
      </div>
    `,
    variables: [
      "clientFirstName", "startTime", "duration", "address", "organizationName"
    ]
  },

  {
    id: "appointment_confirmation_email",
    type: "email",
    language: "fr",
    subject: "Confirmation de votre rendez-vous du {{appointmentDate}}",
    content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #28a745;">
          <h2 style="color: #155724; margin-top: 0;">✅ Rendez-vous confirmé</h2>
        </div>
        
        <p>Bonjour {{clientFirstName}},</p>
        
        <p>Votre rendez-vous a été confirmé avec succès :</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #495057;">Détails du rendez-vous</h3>
          <p><strong>📅 Date:</strong> {{appointmentDate}}</p>
          <p><strong>🕐 Heure:</strong> {{startTime}}</p>
          <p><strong>⏱️ Durée:</strong> {{duration}}</p>
          {{#if serviceName}}<p><strong>🔧 Service:</strong> {{serviceName}}</p>{{/if}}
          {{#if practitionerName}}<p><strong>👨‍⚕️ Praticien:</strong> {{practitionerName}}</p>{{/if}}
          {{#if address}}<p><strong>📍 Adresse:</strong> {{address}}</p>{{/if}}
        </div>
        
        <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>📱 Rappels automatiques:</strong> Vous recevrez des rappels par email/SMS avant votre rendez-vous.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{calendarUrl}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            📅 Ajouter au calendrier
          </a>
        </div>
        
        <p style="color: #6c757d; font-size: 14px;">
          Merci de votre confiance,<br>
          <strong>{{organizationName}}</strong>
        </p>
      </div>
    `,
    variables: [
      "clientFirstName", "appointmentDate", "startTime", "duration",
      "serviceName", "practitionerName", "address", "organizationName", "calendarUrl"
    ]
  },

  {
    id: "appointment_cancellation_email",
    type: "email",
    language: "fr",
    subject: "Annulation de votre rendez-vous du {{appointmentDate}}",
    content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc3545;">
          <h2 style="color: #721c24; margin-top: 0;">❌ Rendez-vous annulé</h2>
        </div>
        
        <p>Bonjour {{clientFirstName}},</p>
        
        <p>Nous vous informons que votre rendez-vous a été annulé :</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>📅 Date:</strong> {{appointmentDate}}</p>
          <p><strong>🕐 Heure:</strong> {{startTime}}</p>
          {{#if reason}}<p><strong>📝 Raison:</strong> {{reason}}</p>{{/if}}
        </div>
        
        <div style="background-color: #cce5ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>💡 Nouveau rendez-vous:</strong> N'hésitez pas à reprendre rendez-vous à votre convenance.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{bookingUrl}}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            📅 Prendre un nouveau rendez-vous
          </a>
        </div>
        
        <p style="color: #6c757d; font-size: 14px;">
          Nous nous excusons pour la gêne occasionnée,<br>
          <strong>{{organizationName}}</strong>
        </p>
      </div>
    `,
    variables: [
      "clientFirstName", "appointmentDate", "startTime", "reason", 
      "organizationName", "bookingUrl"
    ]
  }
];

export const APPOINTMENT_SMS_TEMPLATES: AppointmentNotificationTemplate[] = [
  {
    id: "appointment_reminder_24h_sms",
    type: "sms",
    language: "fr",
    content: "Rappel: RDV demain {{appointmentDate}} à {{startTime}} ({{duration}}). Confirmez votre présence ou prévenez-nous en cas d'empêchement. {{organizationName}}",
    variables: ["appointmentDate", "startTime", "duration", "organizationName"]
  },
  
  {
    id: "appointment_reminder_2h_sms",
    type: "sms",
    language: "fr",
    content: "⏰ Rappel urgent: RDV dans 2h à {{startTime}} ({{duration}}). Pensez à arriver 10min en avance. {{organizationName}}",
    variables: ["startTime", "duration", "organizationName"]
  },
  
  {
    id: "appointment_confirmation_sms",
    type: "sms",
    language: "fr",
    content: "✅ RDV confirmé le {{appointmentDate}} à {{startTime}}. Vous recevrez des rappels automatiques. Merci! {{organizationName}}",
    variables: ["appointmentDate", "startTime", "organizationName"]
  },
  
  {
    id: "appointment_cancellation_sms",
    type: "sms",
    language: "fr",
    content: "❌ Votre RDV du {{appointmentDate}} à {{startTime}} est annulé. {{#if reason}}Raison: {{reason}}.{{/if}} Reprenez RDV: {{bookingUrl}} {{organizationName}}",
    variables: ["appointmentDate", "startTime", "reason", "bookingUrl", "organizationName"]
  }
];

/**
 * Fonction pour obtenir le template approprié selon le type et le canal
 */
export function getAppointmentTemplate(
  type: 'reminder_24h' | 'reminder_2h' | 'confirmation' | 'cancellation',
  channel: 'email' | 'sms',
  language: string = 'fr'
): AppointmentNotificationTemplate | null {
  const templateId = `appointment_${type}_${channel}`;
  
  if (channel === 'email') {
    return APPOINTMENT_EMAIL_TEMPLATES.find(t => t.id === templateId && t.language === language) || null;
  } else {
    return APPOINTMENT_SMS_TEMPLATES.find(t => t.id === templateId && t.language === language) || null;
  }
}

/**
 * Fonction pour traiter les variables dans un template
 */
export function processAppointmentTemplate(
  template: AppointmentNotificationTemplate,
  variables: Record<string, any>
): { subject?: string; content: string } {
  let processedContent = template.content;
  let processedSubject = template.subject;

  // Remplacer les variables simples {{variable}}
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    processedContent = processedContent.replace(regex, String(value || ''));
    if (processedSubject) {
      processedSubject = processedSubject.replace(regex, String(value || ''));
    }
  }

  // Remplacer les variables manquantes par une chaîne vide
  processedContent = processedContent.replace(/{{[^}]+}}/g, '');
  if (processedSubject) {
    processedSubject = processedSubject.replace(/{{[^}]+}}/g, '');
  }

  // Traiter les conditions {{#if variable}}...{{/if}}
  processedContent = processedContent.replace(/{{#if\s+(\w+)}}(.*?){{\/if}}/gs, (match, variable, content) => {
    return variables[variable] ? content : '';
  });

  if (processedSubject) {
    processedSubject = processedSubject.replace(/{{#if\s+(\w+)}}(.*?){{\/if}}/gs, (match, variable, content) => {
      return variables[variable] ? content : '';
    });
  }

  return {
    subject: processedSubject,
    content: processedContent
  };
}