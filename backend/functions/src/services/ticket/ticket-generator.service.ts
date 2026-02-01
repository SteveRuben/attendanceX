import { EventTicket, TicketTemplate, TicketEmailOptions } from "../../common/types/ticket.types";
import { logger } from "firebase-functions";
import { ValidationError } from "../../utils/common/errors";
import { ticketService } from "./ticket.service";
import { EmailService } from "../notification/EmailService";

// Interface pour les données du template
interface TicketTemplateData {
  ticket: EventTicket;
  qrCodeDataUrl: string;
  barcodeDataUrl?: string;
  organizationLogo?: string;
  customFields?: Record<string, any>;
}

export class TicketGeneratorService {
  private readonly emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Générer un billet PDF à partir d'un template
   */
  async generateTicketPDF(
    ticket: EventTicket,
    template?: TicketTemplate
  ): Promise<{ pdfBuffer: Buffer; filename: string }> {
    try {
      // Utiliser le template par défaut si aucun n'est fourni
      const ticketTemplate = template || this.getDefaultTemplate();
      
      // Générer les codes QR et barcode
      const qrCodeDataUrl = await this.generateQRCodeImage(ticket.qrCode);
      const barcodeDataUrl = ticketTemplate.includeBarcode ? 
        await this.generateBarcodeImage(ticket.barcode || ticket.ticketNumber) : undefined;

      // Préparer les données du template
      const templateData: TicketTemplateData = {
        ticket,
        qrCodeDataUrl,
        barcodeDataUrl,
        organizationLogo: ticket.organizationLogo,
        customFields: ticket.customData
      };

      // Générer le HTML du billet
      const html = this.generateTicketHTML(templateData, ticketTemplate);
      
      // Convertir en PDF
      const pdfBuffer = await this.htmlToPDF(html, ticketTemplate);
      
      // Nom du fichier
      const filename = `ticket-${ticket.ticketNumber}.pdf`;

      logger.info(`✅ Ticket PDF generated: ${ticket.ticketNumber}`, {
        ticketId: ticket.id,
        filename,
        templateId: ticketTemplate.id
      });

      return { pdfBuffer, filename };

    } catch (error: any) {
      logger.error(`❌ Error generating ticket PDF`, {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        error: error.message
      });
      throw new ValidationError(`Failed to generate ticket PDF: ${error.message}`);
    }
  }

  /**
   * Envoyer un billet par email
   */
  async sendTicketByEmail(
    ticket: EventTicket,
    options: TicketEmailOptions = {},
    tenantId: string
  ): Promise<boolean> {
    try {
      // Générer le PDF du billet
      const { pdfBuffer, filename } = await this.generateTicketPDF(ticket);

      // Préparer les données de l'email
      const emailData = {
        to: ticket.participantEmail,
        subject: options.subject || `Votre billet pour ${ticket.eventTitle}`,
        html: this.generateEmailHTML(ticket, options),
        attachments: [
          {
            filename,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };

      // Ajouter l'invitation calendrier si demandée
      if (options.includeCalendarInvite) {
        const icsContent = this.generateCalendarInvite(ticket);
        emailData.attachments.push({
          filename: `event-${ticket.eventId}.ics`,
          content: Buffer.from(icsContent),
          contentType: 'text/calendar'
        });
      }

      // Envoyer l'email
      await this.sendEmail(emailData);

      // Marquer l'email comme envoyé
      await ticketService.markEmailSent(ticket.id!, tenantId);

      // Envoyer des copies si demandées
      if (options.sendCopy && options.copyEmails && options.copyEmails.length > 0) {
        for (const copyEmail of options.copyEmails) {
          await this.sendEmail({
            ...emailData,
            to: copyEmail,
            subject: `[COPIE] ${emailData.subject}`
          });
        }
      }

      logger.info(`📧 Ticket email sent successfully`, {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        recipientEmail: ticket.participantEmail,
        includeCalendar: options.includeCalendarInvite,
        copiesCount: options.copyEmails?.length || 0
      });

      return true;

    } catch (error: any) {
      logger.error(`❌ Error sending ticket email`, {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        recipientEmail: ticket.participantEmail,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Envoyer plusieurs billets par email en lot
   */
  async sendBulkTicketEmails(
    tickets: EventTicket[],
    options: TicketEmailOptions = {},
    tenantId: string
  ): Promise<{ success: number; failed: number; errors: Array<{ ticketId: string; error: string }> }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ ticketId: string; error: string }>
    };

    for (const ticket of tickets) {
      try {
        const sent = await this.sendTicketByEmail(ticket, options, tenantId);
        if (sent) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push({
            ticketId: ticket.id!,
            error: 'Failed to send email'
          });
        }
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          ticketId: ticket.id!,
          error: error.message
        });
      }
    }

    logger.info(`📧 Bulk ticket emails completed`, {
      totalTickets: tickets.length,
      successCount: results.success,
      failedCount: results.failed,
      tenantId
    });

    return results;
  }

  // Méthodes privées pour la génération

  private getDefaultTemplate(): TicketTemplate {
    return {
      id: 'default',
      name: 'Default Template',
      description: 'Template par défaut',
      backgroundColor: '#ffffff',
      textColor: '#333333',
      includeQRCode: true,
      includeBarcode: false,
      customFields: [],
      layout: 'standard',
      dimensions: { width: 400, height: 600 },
      fonts: {
        title: 'Arial Bold',
        body: 'Arial',
        footer: 'Arial'
      },
      isDefault: true,
      tenantId: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private async generateQRCodeImage(qrCodeData: string): Promise<string> {
    try {
      const QRCode = require('qrcode');
      const qrCodeDataUrl = await QRCode.toDataURL(qrCodeData, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.95,
        margin: 1,
        width: 200,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      logger.info('✅ QR code generated successfully', {
        dataLength: qrCodeData.length,
        imageSize: qrCodeDataUrl.length
      });
      
      return qrCodeDataUrl;
    } catch (error: any) {
      logger.error('❌ Failed to generate QR code image', { 
        qrCodeData, 
        error: error.message 
      });
      throw new ValidationError(`QR code generation failed: ${error.message}`);
    }
  }

  private async generateBarcodeImage(barcodeData: string): Promise<string> {
    // Ici, vous utiliseriez une bibliothèque comme 'jsbarcode' pour générer le code-barres
    try {
      // Version simulée pour l'exemple
      return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;
    } catch (error) {
      logger.warn('Failed to generate barcode image', { barcodeData, error });
      return '';
    }
  }

  private generateTicketHTML(data: TicketTemplateData, template: TicketTemplate): string {
    const { ticket, qrCodeDataUrl, barcodeDataUrl, organizationLogo } = data;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Billet - ${ticket.eventTitle}</title>
        <style>
            body {
                font-family: ${template.fonts.body}, Arial, sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #f5f5f5;
            }
            .ticket {
                width: ${template.dimensions.width}px;
                height: ${template.dimensions.height}px;
                background-color: ${template.backgroundColor};
                color: ${template.textColor};
                border: 2px solid #ddd;
                border-radius: 10px;
                padding: 20px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                position: relative;
                overflow: hidden;
            }
            .header {
                text-align: center;
                border-bottom: 2px dashed #ccc;
                padding-bottom: 15px;
                margin-bottom: 15px;
            }
            .logo {
                max-width: 100px;
                max-height: 50px;
                margin-bottom: 10px;
            }
            .event-title {
                font-family: ${template.fonts.title}, Arial, sans-serif;
                font-size: 24px;
                font-weight: bold;
                margin: 10px 0;
                color: #2c3e50;
            }
            .event-details {
                margin: 15px 0;
            }
            .detail-row {
                display: flex;
                justify-content: space-between;
                margin: 8px 0;
                padding: 5px 0;
            }
            .detail-label {
                font-weight: bold;
                color: #7f8c8d;
            }
            .detail-value {
                text-align: right;
            }
            .participant-info {
                background-color: rgba(52, 152, 219, 0.1);
                padding: 10px;
                border-radius: 5px;
                margin: 15px 0;
            }
            .ticket-number {
                font-size: 18px;
                font-weight: bold;
                text-align: center;
                background-color: #34495e;
                color: white;
                padding: 10px;
                border-radius: 5px;
                margin: 15px 0;
            }
            .qr-section {
                text-align: center;
                margin: 20px 0;
            }
            .qr-code {
                max-width: 120px;
                max-height: 120px;
            }
            .security-code {
                font-family: monospace;
                font-size: 14px;
                font-weight: bold;
                margin-top: 10px;
                padding: 5px;
                background-color: #ecf0f1;
                border-radius: 3px;
            }
            .footer {
                position: absolute;
                bottom: 10px;
                left: 20px;
                right: 20px;
                text-align: center;
                font-size: 12px;
                color: #95a5a6;
                border-top: 1px solid #ecf0f1;
                padding-top: 10px;
            }
            .barcode {
                max-width: 200px;
                max-height: 50px;
                margin: 10px 0;
            }
        </style>
    </head>
    <body>
        <div class="ticket">
            <div class="header">
                ${organizationLogo ? `<img src="${organizationLogo}" alt="Logo" class="logo">` : ''}
                <div class="event-title">${ticket.eventTitle}</div>
                <div style="font-size: 14px; color: #7f8c8d;">${ticket.organizationName}</div>
            </div>
            
            <div class="event-details">
                <div class="detail-row">
                    <span class="detail-label">📅 Date :</span>
                    <span class="detail-value">${this.formatDate(ticket.eventDate)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">📍 Lieu :</span>
                    <span class="detail-value">${ticket.eventLocation}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">🎫 Type :</span>
                    <span class="detail-value">${this.formatTicketType(ticket.type)}</span>
                </div>
            </div>

            <div class="participant-info">
                <div class="detail-row">
                    <span class="detail-label">👤 Participant :</span>
                    <span class="detail-value">${ticket.participantName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">📧 Email :</span>
                    <span class="detail-value">${ticket.participantEmail}</span>
                </div>
            </div>

            <div class="ticket-number">
                Billet N° ${ticket.ticketNumber}
            </div>

            <div class="qr-section">
                ${qrCodeDataUrl ? `<img src="${qrCodeDataUrl}" alt="QR Code" class="qr-code">` : ''}
                <div class="security-code">Code: ${ticket.securityCode}</div>
                ${barcodeDataUrl ? `<img src="${barcodeDataUrl}" alt="Barcode" class="barcode">` : ''}
            </div>

            <div class="footer">
                <div>Valide du ${this.formatDate(ticket.validFrom)} au ${this.formatDate(ticket.validUntil)}</div>
                <div style="margin-top: 5px;">Généré le ${this.formatDate(ticket.issuedAt)}</div>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private async htmlToPDF(html: string, template: TicketTemplate): Promise<Buffer> {
    try {
      const PDFDocument = require('pdfkit');
      const stream = require('stream');
      
      return new Promise((resolve, reject) => {
        try {
          const doc = new PDFDocument({
            size: [template.dimensions.width, template.dimensions.height],
            margins: { top: 20, bottom: 20, left: 20, right: 20 },
            bufferPages: true,
            autoFirstPage: true
          });
          
          const buffers: Buffer[] = [];
          const bufferStream = new stream.PassThrough();
          
          bufferStream.on('data', (chunk: Buffer) => buffers.push(chunk));
          bufferStream.on('end', () => {
            const pdfBuffer = Buffer.concat(buffers);
            logger.info('✅ PDF generated successfully', {
              bufferSize: pdfBuffer.length,
              width: template.dimensions.width,
              height: template.dimensions.height
            });
            resolve(pdfBuffer);
          });
          bufferStream.on('error', (error: Error) => {
            logger.error('❌ PDF buffer stream error', { error: error.message });
            reject(error);
          });
          
          doc.pipe(bufferStream);
          
          // Parse HTML and extract data for PDF generation
          // Note: PDFKit doesn't support HTML directly, so we extract data from HTML
          const ticketData = this.parseHTMLForPDF(html);
          
          // Generate PDF content using PDFKit
          this.generatePDFContent(doc, ticketData, template);
          
          doc.end();
        } catch (error: any) {
          logger.error('❌ PDF document creation error', { error: error.message });
          reject(error);
        }
      });
    } catch (error: any) {
      logger.error('❌ Failed to convert HTML to PDF', { error: error.message });
      throw new ValidationError(`PDF generation failed: ${error.message}`);
    }
  }

  private parseHTMLForPDF(html: string): any {
    // Extract data from HTML (simple regex-based parsing)
    const extractText = (pattern: RegExp): string => {
      const match = html.match(pattern);
      return match ? match[1].trim() : '';
    };

    return {
      eventTitle: extractText(/<div class="event-title">(.*?)<\/div>/),
      organizationName: extractText(/<div style="font-size: 14px; color: #7f8c8d;">(.*?)<\/div>/),
      eventDate: extractText(/📅 Date :<\/span>\s*<span class="detail-value">(.*?)<\/span>/),
      eventLocation: extractText(/📍 Lieu :<\/span>\s*<span class="detail-value">(.*?)<\/span>/),
      ticketType: extractText(/🎫 Type :<\/span>\s*<span class="detail-value">(.*?)<\/span>/),
      participantName: extractText(/👤 Participant :<\/span>\s*<span class="detail-value">(.*?)<\/span>/),
      participantEmail: extractText(/📧 Email :<\/span>\s*<span class="detail-value">(.*?)<\/span>/),
      ticketNumber: extractText(/Billet N° (.*?)<\/div>/),
      securityCode: extractText(/Code: (.*?)<\/div>/),
      qrCodeDataUrl: extractText(/src="(data:image\/png;base64,[^"]+)" alt="QR Code"/),
      validFrom: extractText(/Valide du (.*?) au/),
      validUntil: extractText(/au (.*?)<\/div>/),
      issuedAt: extractText(/Généré le (.*?)<\/div>/)
    };
  }

  private generatePDFContent(doc: any, data: any, template: TicketTemplate): void {
    const { width, height } = template.dimensions;
    const margin = 20;
    const contentWidth = width - (margin * 2);
    
    // Background
    doc.rect(0, 0, width, height).fill(template.backgroundColor);
    
    // Header section
    let yPos = margin;
    
    // Event title
    doc.fillColor(template.textColor)
       .fontSize(24)
       .font('Helvetica-Bold')
       .text(data.eventTitle, margin, yPos, {
         width: contentWidth,
         align: 'center'
       });
    yPos += 40;
    
    // Organization name
    doc.fontSize(14)
       .fillColor('#7f8c8d')
       .font('Helvetica')
       .text(data.organizationName, margin, yPos, {
         width: contentWidth,
         align: 'center'
       });
    yPos += 30;
    
    // Separator line
    doc.moveTo(margin, yPos)
       .lineTo(width - margin, yPos)
       .dash(5, { space: 5 })
       .stroke('#cccccc');
    yPos += 20;
    
    // Event details
    doc.undash();
    const detailsStartY = yPos;
    
    doc.fontSize(12)
       .fillColor('#7f8c8d')
       .font('Helvetica-Bold')
       .text('📅 Date :', margin, yPos, { continued: true })
       .fillColor(template.textColor)
       .font('Helvetica')
       .text(`  ${data.eventDate}`, { align: 'left' });
    yPos += 20;
    
    doc.fillColor('#7f8c8d')
       .font('Helvetica-Bold')
       .text('📍 Lieu :', margin, yPos, { continued: true })
       .fillColor(template.textColor)
       .font('Helvetica')
       .text(`  ${data.eventLocation}`, { align: 'left' });
    yPos += 20;
    
    doc.fillColor('#7f8c8d')
       .font('Helvetica-Bold')
       .text('🎫 Type :', margin, yPos, { continued: true })
       .fillColor(template.textColor)
       .font('Helvetica')
       .text(`  ${data.ticketType}`, { align: 'left' });
    yPos += 30;
    
    // Participant info box
    doc.rect(margin, yPos, contentWidth, 60)
       .fillAndStroke('rgba(52, 152, 219, 0.1)', '#3498db');
    yPos += 15;
    
    doc.fontSize(12)
       .fillColor('#7f8c8d')
       .font('Helvetica-Bold')
       .text('👤 Participant :', margin + 10, yPos, { continued: true })
       .fillColor(template.textColor)
       .font('Helvetica')
       .text(`  ${data.participantName}`, { align: 'left' });
    yPos += 20;
    
    doc.fillColor('#7f8c8d')
       .font('Helvetica-Bold')
       .text('📧 Email :', margin + 10, yPos, { continued: true })
       .fillColor(template.textColor)
       .font('Helvetica')
       .text(`  ${data.participantEmail}`, { align: 'left' });
    yPos += 35;
    
    // Ticket number box
    doc.rect(margin, yPos, contentWidth, 40)
       .fillAndStroke('#34495e', '#34495e');
    
    doc.fontSize(18)
       .fillColor('#ffffff')
       .font('Helvetica-Bold')
       .text(`Billet N° ${data.ticketNumber}`, margin, yPos + 12, {
         width: contentWidth,
         align: 'center'
       });
    yPos += 55;
    
    // QR Code section
    if (data.qrCodeDataUrl && template.includeQRCode) {
      try {
        // Extract base64 data from data URL
        const base64Data = data.qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        // Center the QR code
        const qrSize = 120;
        const qrX = (width - qrSize) / 2;
        
        doc.image(imageBuffer, qrX, yPos, {
          width: qrSize,
          height: qrSize
        });
        yPos += qrSize + 10;
      } catch (error: any) {
        logger.warn('Failed to embed QR code in PDF', { error: error.message });
      }
    }
    
    // Security code
    doc.fontSize(14)
       .fillColor(template.textColor)
       .font('Helvetica-Bold')
       .text(`Code: ${data.securityCode}`, margin, yPos, {
         width: contentWidth,
         align: 'center'
       });
    yPos += 30;
    
    // Footer
    const footerY = height - 40;
    doc.moveTo(margin, footerY)
       .lineTo(width - margin, footerY)
       .stroke('#ecf0f1');
    
    doc.fontSize(10)
       .fillColor('#95a5a6')
       .font('Helvetica')
       .text(`Valide du ${data.validFrom} au ${data.validUntil}`, margin, footerY + 5, {
         width: contentWidth,
         align: 'center'
       });
    
    doc.text(`Généré le ${data.issuedAt}`, margin, footerY + 20, {
      width: contentWidth,
      align: 'center'
    });
  }

  private generateEmailHTML(ticket: EventTicket, options: TicketEmailOptions): string {
    const customMessage = options.message || `
      Bonjour ${ticket.participantName},
      
      Votre inscription à l'événement "${ticket.eventTitle}" a été confirmée !
      
      Vous trouverez votre billet en pièce jointe. Veuillez le présenter lors de votre arrivée à l'événement.
    `;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Votre billet pour ${ticket.eventTitle}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #3498db; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .event-info { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .button { display: inline-block; background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎫 Votre billet est prêt !</h1>
            </div>
            
            <div class="content">
                <p>${customMessage.replace(/\n/g, '<br>')}</p>
                
                <div class="event-info">
                    <h3>📋 Détails de l'événement</h3>
                    <p><strong>Événement :</strong> ${ticket.eventTitle}</p>
                    <p><strong>Date :</strong> ${this.formatDate(ticket.eventDate)}</p>
                    <p><strong>Lieu :</strong> ${ticket.eventLocation}</p>
                    <p><strong>Participant :</strong> ${ticket.participantName}</p>
                    <p><strong>N° de billet :</strong> ${ticket.ticketNumber}</p>
                </div>

                ${options.includeEventDetails ? `
                <div class="event-info">
                    <h3>ℹ️ Informations importantes</h3>
                    <ul>
                        <li>Présentez votre billet (PDF ou sur mobile) à l'entrée</li>
                        <li>Arrivez 15 minutes avant le début de l'événement</li>
                        <li>En cas de problème, contactez l'organisateur</li>
                    </ul>
                </div>
                ` : ''}
            </div>
            
            <div class="footer">
                <p>Organisé par ${ticket.organizationName}</p>
                <p>Billet généré automatiquement le ${this.formatDate(ticket.issuedAt)}</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private generateCalendarInvite(ticket: EventTicket): string {
    const startDate = this.formatDateForCalendar(ticket.eventDate);
    const endDate = this.formatDateForCalendar(new Date(ticket.eventDate.getTime() + 2 * 60 * 60 * 1000)); // +2h par défaut

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AttendanceX//Event Ticket//EN
BEGIN:VEVENT
UID:${ticket.eventId}-${ticket.id}@attendancex.com
DTSTAMP:${this.formatDateForCalendar(new Date())}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${ticket.eventTitle}
DESCRIPTION:Événement organisé par ${ticket.organizationName}\\nBillet N°: ${ticket.ticketNumber}
LOCATION:${ticket.eventLocation}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT15M
DESCRIPTION:Rappel: ${ticket.eventTitle} dans 15 minutes
ACTION:DISPLAY
END:VALARM
END:VEVENT
END:VCALENDAR`;
  }

  private async sendEmail(emailData: any): Promise<void> {
    try {
      logger.info('📧 Sending ticket email', {
        to: emailData.to,
        subject: emailData.subject,
        attachmentsCount: emailData.attachments?.length || 0
      });
      
      // Utiliser le service d'email existant
      const result = await this.emailService.sendEmail(
        emailData.to,
        emailData.subject,
        {
          html: emailData.html,
          text: emailData.text
        },
        {
          attachments: emailData.attachments?.map((att: any) => ({
            filename: att.filename,
            content: att.content,
            contentType: att.contentType
          })),
          trackingId: `ticket-${Date.now()}`,
          categories: ['ticket', 'event']
        }
      );

      if (!result.success) {
        throw new Error('Email sending failed');
      }

      logger.info('✅ Ticket email sent successfully', {
        to: emailData.to,
        messageId: result.messageId
      });
      
    } catch (error: any) {
      logger.error('❌ Failed to send ticket email', { 
        to: emailData.to,
        error: error.message 
      });
      throw new ValidationError(`Email sending failed: ${error.message}`);
    }
  }

  // Utilitaires de formatage

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  private formatDateForCalendar(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  private formatTicketType(type: string): string {
    const types: Record<string, string> = {
      'standard': 'Standard',
      'vip': 'VIP',
      'early_bird': 'Early Bird',
      'student': 'Étudiant',
      'complimentary': 'Gratuit'
    };
    return types[type] || type;
  }
}

export const ticketGeneratorService = new TicketGeneratorService();