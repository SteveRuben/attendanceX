// backend/functions/src/services/certificate.service.ts - Service de génération de certificats

import { getFirestore } from "firebase-admin/firestore";
import * as crypto from "crypto";
import PDFDocument from 'pdfkit';
import { getStorage } from "firebase-admin/storage";
import { EventModel } from "../../models/event.model";
import { UserModel } from "../../models/user.model";
import { AttendanceRecord, Certificate, CertificateTemplate } from "../../common/types";
import { ERROR_CODES } from "../../common/constants";

export class CertificateService {
  private readonly db = getFirestore();
  private readonly storage = getStorage();

  /**
   * Générer un certificat de présence
   */
  async generateAttendanceCertificate(attendanceId: string): Promise<Certificate> {
    try {
      // Récupérer les données de présence
      const attendanceDoc = await this.db.collection('attendances').doc(attendanceId).get();
      if (!attendanceDoc.exists) {
        throw new Error(ERROR_CODES.ATTENDANCE_NOT_FOUND);
      }
      
      const attendance = attendanceDoc.data() as AttendanceRecord;
      
      // Vérifier que la présence est valide pour un certificat
      if (!this.isEligibleForCertificate(attendance)) {
        throw new Error('Attendance record is not eligible for certificate generation');
      }

      // Récupérer les données de l'événement et de l'utilisateur
      const [event, user] = await Promise.all([
        this.getEventById(attendance.eventId),
        this.getUserById(attendance.userId)
      ]);

      // Récupérer le template de certificat
      const template = await this.getCertificateTemplate(event.getData().organizationId);

      // Générer le certificat
      const certificate = await this.createCertificate(attendance, event, user, template);

      // Générer le PDF
      const pdfBuffer = await this.generateCertificatePDF(certificate, template);
      
      // Uploader le PDF vers le storage
      const pdfUrl = await this.uploadCertificatePDF(certificate.id, pdfBuffer);
      
      // Mettre à jour le certificat avec l'URL
      certificate.pdfUrl = pdfUrl;

      // Sauvegarder en base
      await this.db.collection('certificates').doc(certificate.id).set(certificate);

      // Mettre à jour l'attendance record
      await this.db.collection('attendances').doc(attendanceId).update({
        certificateGenerated: {
          certificateId: certificate.id,
          generatedAt: new Date(),
          downloadUrl: pdfUrl
        }
      });

      return certificate;
    } catch (error) {
      console.error('Error generating certificate:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Générer des certificats en masse pour un événement
   */
  async bulkGenerateCertificates(eventId: string): Promise<Certificate[]> {
    try {
      // Récupérer toutes les présences éligibles pour l'événement
      const attendancesQuery = await this.db
        .collection('attendances')
        .where('eventId', '==', eventId)
        .where('status', 'in', ['present', 'late', 'partial'])
        .get();

      const certificates: Certificate[] = [];
      const batchSize = 10; // Traiter par lots pour éviter les timeouts

      for (let i = 0; i < attendancesQuery.docs.length; i += batchSize) {
        const batch = attendancesQuery.docs.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (doc) => {
          try {
            return await this.generateAttendanceCertificate(doc.id);
          } catch (error) {
            console.error(`Error generating certificate for attendance ${doc.id}:`, error);
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        certificates.push(...batchResults.filter(cert => cert !== null) as Certificate[]);
      }

      return certificates;
    } catch (error) {
      console.error('Error bulk generating certificates:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Valider un certificat avec son code de vérification
   */
  async validateCertificate(certificateId: string): Promise<{ isValid: boolean; certificate?: Certificate; reason?: string }> {
    try {
      const certificateDoc = await this.db.collection('certificates').doc(certificateId).get();
      
      if (!certificateDoc.exists) {
        return { isValid: false, reason: 'Certificate not found' };
      }

      const certificate = certificateDoc.data() as Certificate;

      // Vérifier le statut
      if (certificate.status === 'revoked') {
        return { isValid: false, reason: 'Certificate has been revoked' };
      }

      // Vérifier la validité
      if (certificate.validUntil && certificate.validUntil < new Date()) {
        return { isValid: false, reason: 'Certificate has expired' };
      }

      return { isValid: true, certificate };
    } catch (error) {
      console.error('Error validating certificate:', error);
      return { isValid: false, reason: 'Internal server error' };
    }
  }

  /**
   * Mettre à jour un template de certificat
   */
  async updateCertificateTemplate(templateId: string, updates: Partial<CertificateTemplate>, userId: string): Promise<CertificateTemplate> {
    try {
      const templateDoc = await this.db.collection('certificate_templates').doc(templateId).get();
      
      if (!templateDoc.exists) {
        throw new Error('Template not found');
      }

      const updatedTemplate = {
        ...templateDoc.data(),
        ...updates,
        updatedAt: new Date()
      };

      await this.db.collection('certificate_templates').doc(templateId).update(updatedTemplate);
      
      return updatedTemplate as CertificateTemplate;
    } catch (error) {
      console.error('Error updating certificate template:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Supprimer un template de certificat
   */
  async deleteCertificateTemplate(templateId: string, userId: string): Promise<void> {
    try {
      const templateDoc = await this.db.collection('certificate_templates').doc(templateId).get();
      
      if (!templateDoc.exists) {
        throw new Error('Template not found');
      }

      await this.db.collection('certificate_templates').doc(templateId).delete();
    } catch (error) {
      console.error('Error deleting certificate template:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obtenir les statistiques des certificats
   */
  async getCertificateStats(organizationId: string): Promise<any> {
    try {
      const certificatesQuery = await this.db
        .collection('certificates')
        .where('organizationId', '==', organizationId)
        .get();

      const totalCertificates = certificatesQuery.size;
      const certificates = certificatesQuery.docs.map(doc => doc.data());
      
      const stats = {
        totalCertificates,
        totalDownloads: certificates.reduce((sum, cert: any) => sum + (cert.downloadCount || 0), 0),
        averageAttendanceRate: certificates.length > 0 
          ? certificates.reduce((sum, cert: any) => sum + (cert.attendancePercentage || 0), 0) / certificates.length 
          : 0,
        certificatesByMonth: this.groupCertificatesByMonth(certificates)
      };

      return stats;
    } catch (error) {
      console.error('Error getting certificate stats:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Personnaliser un template de certificat
   */
  async customizeCertificateTemplate(organizationId: string, template: Partial<CertificateTemplate>): Promise<CertificateTemplate> {
    try {
      const templateId = template.id || crypto.randomUUID();
      
      const certificateTemplate: CertificateTemplate = {
        id: templateId,
        organizationId,
        name: template.name || 'Default Template',
        description: template.description,
        layout: template.layout || 'portrait',
        backgroundColor: template.backgroundColor || '#ffffff',
        primaryColor: template.primaryColor || '#000000',
        secondaryColor: template.secondaryColor || '#666666',
        fontFamily: template.fontFamily || 'Arial',
        title: template.title || 'Certificate of Attendance',
        subtitle: template.subtitle,
        bodyText: template.bodyText || 'This is to certify that {participantName} has attended {eventTitle} on {eventDate}',
        footerText: template.footerText,
        logoPosition: template.logoPosition || { x: 50, y: 50, width: 100, height: 50 },
        signaturePosition: template.signaturePosition,
        includeQRCode: template.includeQRCode ?? true,
        qrCodePosition: template.qrCodePosition || { x: 450, y: 700, size: 80 },
        isDefault: template.isDefault || false,
        isActive: template.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.db.collection('certificate_templates').doc(templateId).set(certificateTemplate);
      
      return certificateTemplate;
    } catch (error) {
      console.error('Error customizing certificate template:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  // Méthodes privées

  private isEligibleForCertificate(attendance: AttendanceRecord): boolean {
    // Vérifier que la présence est confirmée
    if (!['present', 'late', 'partial'].includes(attendance.status)) {
      return false;
    }

    // Vérifier le pourcentage de présence minimum (si applicable)
    if (attendance.sessionTracking) {
      return attendance.sessionTracking.attendancePercentage >= 75; // 75% minimum
    }

    return true;
  }

  private async createCertificate(
    attendance: AttendanceRecord, 
    event: EventModel, 
    user: UserModel, 
    template: CertificateTemplate
  ): Promise<Certificate> {
    const eventData = event.getData();
    const userData = user.getData();
    
    const certificateId = crypto.randomUUID();
    const verificationCode = this.generateVerificationCode();
    
    return {
      id: certificateId,
      attendanceRecordId: attendance.id!,
      userId: attendance.userId,
      eventId: attendance.eventId,
      organizationId: eventData.organizationId,
      certificateNumber: this.generateCertificateNumber(eventData.organizationId),
      issueDate: new Date(),
      participantName: userData.displayName || `${userData.firstName} ${userData.lastName}`,
      eventTitle: eventData.title,
      eventDate: eventData.startDateTime,
      duration: this.calculateEventDuration(eventData.startDateTime, eventData.endDateTime),
      attendancePercentage: attendance.sessionTracking?.attendancePercentage || 100,
      templateId: template.id,
      organizationLogo: eventData.organizationLogo,
      organizationName: eventData.organizationName || 'Organization',
      signatoryName: eventData.organizerName,
      signatoryTitle: 'Event Organizer',
      verificationCode,
      qrCodeData: this.generateCertificateQRCode(certificateId, verificationCode),
      pdfUrl: '', // Sera rempli après génération du PDF
      downloadCount: 0,
      status: 'generated',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private async generateCertificatePDF(certificate: Certificate, template: CertificateTemplate): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: template.layout === 'landscape' ? [792, 612] : [612, 792],
          margin: 50
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        // Fond
        doc.rect(0, 0, doc.page.width, doc.page.height)
           .fill(template.backgroundColor);

        // Titre
        doc.fontSize(24)
           .fillColor(template.primaryColor)
           .text(template.title, 50, 100, { align: 'center' });

        // Sous-titre
        if (template.subtitle) {
          doc.fontSize(16)
             .fillColor(template.secondaryColor)
             .text(template.subtitle, 50, 140, { align: 'center' });
        }

        // Corps du texte
        const bodyText = this.replacePlaceholders(template.bodyText, certificate);
        doc.fontSize(14)
           .fillColor('#000000')
           .text(bodyText, 50, 200, { align: 'center', width: doc.page.width - 100 });

        // Informations du certificat
        doc.fontSize(12)
           .text(`Certificate Number: ${certificate.certificateNumber}`, 50, 400)
           .text(`Issue Date: ${certificate.issueDate.toLocaleDateString()}`, 50, 420)
           .text(`Verification Code: ${certificate.verificationCode}`, 50, 440);

        // Signature
        if (certificate.signatoryName) {
          doc.fontSize(12)
             .text(`${certificate.signatoryName}`, 400, 500)
             .text(`${certificate.signatoryTitle}`, 400, 520);
        }

        // QR Code (placeholder - dans un vrai projet, utiliser une librairie QR)
        if (template.includeQRCode && template.qrCodePosition) {
          doc.rect(template.qrCodePosition.x, template.qrCodePosition.y, 
                  template.qrCodePosition.size, template.qrCodePosition.size)
             .stroke();
          doc.fontSize(8)
             .text('QR Code', template.qrCodePosition.x, template.qrCodePosition.y + template.qrCodePosition.size + 5);
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private async uploadCertificatePDF(certificateId: string, pdfBuffer: Buffer): Promise<string> {
    const bucket = this.storage.bucket();
    const fileName = `certificates/${certificateId}.pdf`;
    const file = bucket.file(fileName);

    await file.save(pdfBuffer, {
      metadata: {
        contentType: 'application/pdf'
      }
    });

    // Générer une URL signée valide pour 1 an
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000 // 1 an
    });

    return url;
  }

  private generateVerificationCode(): string {
    return crypto.randomBytes(8).toString('hex').toUpperCase();
  }

  private generateCertificateNumber(organizationId: string): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `${organizationId.substring(0, 4).toUpperCase()}-${timestamp}-${random}`.toUpperCase();
  }

  private generateCertificateQRCode(certificateId: string, verificationCode: string): string {
    const data = `${process.env.APP_BASE_URL}/verify-certificate/${certificateId}?code=${verificationCode}`;
    return Buffer.from(data).toString('base64');
  }

  private calculateEventDuration(startDate: Date, endDate: Date): number {
    return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)); // en heures
  }

  private replacePlaceholders(text: string, certificate: Certificate): string {
    return text
      .replace('{participantName}', certificate.participantName)
      .replace('{eventTitle}', certificate.eventTitle)
      .replace('{eventDate}', certificate.eventDate.toLocaleDateString())
      .replace('{duration}', `${certificate.duration} hours`)
      .replace('{attendancePercentage}', `${certificate.attendancePercentage}%`)
      .replace('{organizationName}', certificate.organizationName);
  }

  private async getCertificateTemplate(organizationId: string): Promise<CertificateTemplate> {
    // Chercher un template spécifique à l'organisation
    const templateQuery = await this.db
      .collection('certificate_templates')
      .where('organizationId', '==', organizationId)
      .where('isActive', '==', true)
      .orderBy('isDefault', 'desc')
      .limit(1)
      .get();

    if (!templateQuery.empty) {
      return templateQuery.docs[0].data() as CertificateTemplate;
    }

    // Utiliser le template par défaut
    return this.getDefaultTemplate(organizationId);
  }

  private getDefaultTemplate(organizationId: string): CertificateTemplate {
    return {
      id: 'default',
      organizationId,
      name: 'Default Template',
      layout: 'portrait',
      backgroundColor: '#ffffff',
      primaryColor: '#000000',
      secondaryColor: '#666666',
      fontFamily: 'Arial',
      title: 'Certificate of Attendance',
      bodyText: 'This is to certify that {participantName} has successfully attended {eventTitle} on {eventDate} with {attendancePercentage} attendance.',
      logoPosition: { x: 50, y: 50, width: 100, height: 50 },
      includeQRCode: true,
      qrCodePosition: { x: 450, y: 700, size: 80 },
      isDefault: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private async getEventById(eventId: string): Promise<EventModel> {
    const eventDoc = await this.db.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      throw new Error(ERROR_CODES.EVENT_NOT_FOUND);
    }
    return EventModel.fromFirestore(eventDoc);
  }

  private groupCertificatesByMonth(certificates: any[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    
    certificates.forEach(cert => {
      if (cert.issuedAt) {
        const date = cert.issuedAt.toDate ? cert.issuedAt.toDate() : new Date(cert.issuedAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        grouped[monthKey] = (grouped[monthKey] || 0) + 1;
      }
    });
    
    return grouped;
  }

  private async getUserById(userId: string): Promise<UserModel> {
    const userDoc = await this.db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new Error(ERROR_CODES.USER_NOT_FOUND);
    }
    return UserModel.fromFirestore(userDoc);
  }

  /**
   * Obtenir les certificats d'un utilisateur
   */
  async getCertificatesByUser(userId: string): Promise<Certificate[]> {
    try {
      const certificatesQuery = await this.db
        .collection('certificates')
        .where('userId', '==', userId)
        .orderBy('issueDate', 'desc')
        .get();

      return certificatesQuery.docs.map(doc => doc.data() as Certificate);
    } catch (error) {
      console.error('Error getting certificates by user:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obtenir les certificats d'un événement
   */
  async getCertificatesByEvent(eventId: string, options: { page: number; limit: number }): Promise<{
    certificates: Certificate[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const { page, limit } = options;
      const offset = (page - 1) * limit;

      const certificatesQuery = await this.db
        .collection('certificates')
        .where('eventId', '==', eventId)
        .orderBy('issueDate', 'desc')
        .offset(offset)
        .limit(limit)
        .get();

      const totalQuery = await this.db
        .collection('certificates')
        .where('eventId', '==', eventId)
        .get();

      const certificates = certificatesQuery.docs.map(doc => doc.data() as Certificate);

      return {
        certificates,
        total: totalQuery.size,
        page,
        limit
      };
    } catch (error) {
      console.error('Error getting certificates by event:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obtenir l'URL de téléchargement d'un certificat
   */
  async getCertificateDownloadUrl(certificateId: string, userId: string): Promise<{
    canDownload: boolean;
    downloadUrl?: string;
    reason?: string;
  }> {
    try {
      const certificateDoc = await this.db.collection('certificates').doc(certificateId).get();
      
      if (!certificateDoc.exists) {
        return {
          canDownload: false,
          reason: 'Certificate not found'
        };
      }

      const certificate = certificateDoc.data() as Certificate;

      // Vérifier que l'utilisateur peut télécharger ce certificat
      if (certificate.userId !== userId) {
        return {
          canDownload: false,
          reason: 'Access denied'
        };
      }

      return {
        canDownload: true,
        downloadUrl: certificate.pdfUrl
      };
    } catch (error) {
      console.error('Error getting certificate download URL:', error);
      return {
        canDownload: false,
        reason: 'Internal server error'
      };
    }
  }

  /**
   * Obtenir les templates par organisation
   */
  async getTemplatesByOrganization(organizationId: string): Promise<CertificateTemplate[]> {
    try {
      const templatesQuery = await this.db
        .collection('certificate_templates')
        .where('organizationId', '==', organizationId)
        .where('isActive', '==', true)
        .orderBy('isDefault', 'desc')
        .orderBy('name', 'asc')
        .get();

      return templatesQuery.docs.map(doc => doc.data() as CertificateTemplate);
    } catch (error) {
      console.error('Error getting templates by organization:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obtenir les statistiques par organisation
   */
  async getStatsByOrganization(organizationId: string): Promise<any> {
    try {
      const certificatesQuery = await this.db
        .collection('certificates')
        .where('organizationId', '==', organizationId)
        .get();

      const totalCertificates = certificatesQuery.size;
      const certificates = certificatesQuery.docs.map(doc => doc.data());
      
      const stats = {
        totalCertificates,
        totalDownloads: certificates.reduce((sum, cert: any) => sum + (cert.downloadCount || 0), 0),
        averageAttendanceRate: certificates.length > 0 
          ? certificates.reduce((sum, cert: any) => sum + (cert.attendancePercentage || 0), 0) / certificates.length 
          : 0,
        certificatesByMonth: this.groupCertificatesByMonth(certificates)
      };

      return stats;
    } catch (error) {
      console.error('Error getting stats by organization:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }
}

export const certificateService = new CertificateService();