import { campaignReportsService } from '../services/campaignReportsService';

export interface ExportOptions {
  filename?: string;
  format: 'pdf' | 'excel' | 'csv' | 'powerpoint';
  organizationId: string;
}

/**
 * Télécharger un fichier blob avec un nom spécifique
 */
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Générer un nom de fichier avec timestamp
 */
export const generateFilename = (baseName: string, format: string): string => {
  const timestamp = new Date().toISOString().split('T')[0];
  const extension = getFileExtension(format);
  return `${baseName}_${timestamp}.${extension}`;
};

/**
 * Obtenir l'extension de fichier selon le format
 */
export const getFileExtension = (format: string): string => {
  const extensions: Record<string, string> = {
    pdf: 'pdf',
    excel: 'xlsx',
    csv: 'csv',
    powerpoint: 'pptx'
  };
  return extensions[format] || 'pdf';
};

/**
 * Exporter un rapport personnalisé
 */
export const exportCustomReport = async (
  reportId: string,
  options: ExportOptions
): Promise<void> => {
  try {
    const blob = await campaignReportsService.exportReport(reportId, options.format);
    const filename = options.filename || generateFilename(`rapport_${reportId}`, options.format);
    downloadBlob(blob, filename);
  } catch (error) {
    console.error('Erreur lors de l\'export du rapport:', error);
    throw new Error('Impossible d\'exporter le rapport. Veuillez réessayer.');
  }
};

/**
 * Exporter le résumé exécutif
 */
export const exportExecutiveSummary = async (
  options: ExportOptions & { timeRange?: string }
): Promise<void> => {
  try {
    const blob = await campaignReportsService.exportExecutiveSummary(
      options.organizationId,
      options.timeRange || '30d',
      options.format
    );
    const filename = options.filename || generateFilename('resume_executif', options.format);
    downloadBlob(blob, filename);
  } catch (error) {
    console.error('Erreur lors de l\'export du résumé exécutif:', error);
    throw new Error('Impossible d\'exporter le résumé exécutif. Veuillez réessayer.');
  }
};

/**
 * Partager un rapport par email
 */
export const shareReportByEmail = async (
  reportId: string,
  recipients: string[],
  format: 'pdf' | 'excel' | 'csv' = 'pdf',
  message?: string
): Promise<void> => {
  try {
    await campaignReportsService.emailReport(reportId, recipients, format, message);
  } catch (error) {
    console.error('Erreur lors de l\'envoi du rapport par email:', error);
    throw new Error('Impossible d\'envoyer le rapport par email. Veuillez réessayer.');
  }
};

/**
 * Créer un lien de partage pour un rapport
 */
export const createReportShareLink = async (
  reportId: string,
  expiresIn: number = 7
): Promise<{ shareUrl: string; expiresAt: string }> => {
  try {
    return await campaignReportsService.createShareLink(reportId, expiresIn);
  } catch (error) {
    console.error('Erreur lors de la création du lien de partage:', error);
    throw new Error('Impossible de créer le lien de partage. Veuillez réessayer.');
  }
};

/**
 * Valider le format d'export
 */
export const isValidExportFormat = (format: string): format is 'pdf' | 'excel' | 'csv' | 'powerpoint' => {
  return ['pdf', 'excel', 'csv', 'powerpoint'].includes(format);
};

/**
 * Obtenir la taille lisible d'un blob
 */
export const getReadableFileSize = (blob: Blob): string => {
  const bytes = blob.size;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Vérifier si le navigateur supporte le téléchargement
 */
export const supportsDownload = (): boolean => {
  const link = document.createElement('a');
  return typeof link.download !== 'undefined';
};