/**
 * Service d'envoi d'emails
 * Gère l'envoi d'emails avec templates et personnalisation
 */

export interface EmailRequest {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject?: string;
  template?: string;
  html?: string;
  text?: string;
  data?: Record<string, any>;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables: string[];
}

export class EmailService {

  /**
   * Envoyer un email
   */
  async sendEmail(request: EmailRequest): Promise<{ success: boolean; messageId?: string }> {
    try {
      let subject = request.subject || 'Notification';
      // @ts-ignore
      let html = request.html || '';
      // @ts-ignore
      let text = request.text || '';

      // Si un template est spécifié, l'utiliser
      if (request.template) {
        const template = await this.getTemplate(request.template);
        if (template) {
          const renderedContent = this.renderTemplate(template, request.data || {});
          subject = renderedContent.subject;
          html = renderedContent.html;
          text = renderedContent.text || '';
        }
      }

      console.log('Sending email:', {
        to: request.to,
        subject: subject,
        template: request.template
      });

      // TODO: Implémenter l'envoi réel avec SendGrid, Mailgun, etc.
      // Pour l'instant, on simule l'envoi
      
      // Simulation d'envoi réussi
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      return {
        success: true,
        messageId
      };

    } catch (error) {
      console.error('Error sending email:', error);
      return {
        success: false
      };
    }
  }

  /**
   * Obtenir un template d'email
   */
  private async getTemplate(templateId: string): Promise<EmailTemplate | null> {
    // Templates par défaut
    const defaultTemplates: Record<string, EmailTemplate> = {
      tenant_verification: {
        id: 'tenant_verification',
        name: 'Vérification de tenant',
        subject: 'Vérifiez votre email pour {{organizationName}}',
        htmlContent: `
          <h1>Bienvenue {{adminName}} !</h1>
          <p>Merci d'avoir créé votre organisation <strong>{{organizationName}}</strong>.</p>
          <p>Pour activer votre compte, veuillez cliquer sur le lien ci-dessous :</p>
          <p><a href="{{verificationUrl}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Vérifier mon email</a></p>
          <p>Ce lien expire dans {{expiresIn}}.</p>
          <p>Si vous n'avez pas créé ce compte, vous pouvez ignorer cet email.</p>
        `,
        textContent: `
          Bienvenue {{adminName}} !
          
          Merci d'avoir créé votre organisation {{organizationName}}.
          
          Pour activer votre compte, veuillez visiter : {{verificationUrl}}
          
          Ce lien expire dans {{expiresIn}}.
        `,
        variables: ['organizationName', 'adminName', 'verificationUrl', 'expiresIn']
      },
      
      welcome_onboarding: {
        id: 'welcome_onboarding',
        name: 'Bienvenue - Onboarding',
        subject: 'Bienvenue dans {{organizationName}} !',
        htmlContent: `
          <h1>Félicitations {{adminName}} !</h1>
          <p>Votre organisation <strong>{{organizationName}}</strong> est maintenant active.</p>
          <p>Voici les prochaines étapes pour bien commencer :</p>
          <ol>
            <li>Configurez les paramètres de votre organisation</li>
            <li>Invitez vos collaborateurs</li>
            <li>Créez vos premiers événements</li>
            <li>Explorez les fonctionnalités avancées</li>
          </ol>
          <p><a href="{{setupUrl}}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Commencer la configuration</a></p>
        `,
        variables: ['organizationName', 'adminName', 'setupUrl']
      },

      user_invitation: {
        id: 'user_invitation',
        name: 'Invitation utilisateur',
        subject: 'Vous êtes invité à rejoindre {{organizationName}}',
        htmlContent: `
          <h1>Invitation à rejoindre {{organizationName}}</h1>
          <p>Bonjour,</p>
          <p>{{inviterName}} vous invite à rejoindre l'organisation <strong>{{organizationName}}</strong> en tant que {{role}}.</p>
          <p><a href="{{invitationUrl}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accepter l'invitation</a></p>
          <p>Cette invitation expire dans {{expiresIn}}.</p>
        `,
        variables: ['organizationName', 'inviterName', 'role', 'invitationUrl', 'expiresIn']
      }
    };

    return defaultTemplates[templateId] || null;
  }

  /**
   * Rendre un template avec des données
   */
  private renderTemplate(template: EmailTemplate, data: Record<string, any>): {
    subject: string;
    html: string;
    text?: string;
  } {
    const renderString = (str: string, data: Record<string, any>): string => {
      return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key] || match;
      });
    };

    return {
      subject: renderString(template.subject, data),
      html: renderString(template.htmlContent, data),
      text: template.textContent ? renderString(template.textContent, data) : undefined
    };
  }

  /**
   * Envoyer un email de vérification
   */
  async sendVerificationEmail(to: string, data: {
    organizationName: string;
    adminName: string;
    verificationUrl: string;
    expiresIn: string;
  }): Promise<boolean> {
    const result = await this.sendEmail({
      to,
      template: 'tenant_verification',
      data
    });

    return result.success;
  }

  /**
   * Envoyer un email de bienvenue
   */
  async sendWelcomeEmail(to: string, data: {
    organizationName: string;
    adminName: string;
    setupUrl: string;
  }): Promise<boolean> {
    const result = await this.sendEmail({
      to,
      template: 'welcome_onboarding',
      data
    });

    return result.success;
  }

  /**
   * Envoyer un email d'invitation
   */
  async sendInvitationEmail(to: string, data: {
    organizationName: string;
    inviterName: string;
    role: string;
    invitationUrl: string;
    expiresIn: string;
  }): Promise<boolean> {
    const result = await this.sendEmail({
      to,
      template: 'user_invitation',
      data
    });

    return result.success;
  }
}

// Instance singleton
export const emailService = new EmailService();
export default emailService;