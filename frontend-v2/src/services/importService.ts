import { apiClient } from './apiClient';
import {
  ImportType,
  ImportPreview,
  ImportResult,
  BulkImportRequest,
  ImportTemplate,
  ImportStatus
} from '../types/import.types';

class ImportService {
  private baseUrl = '/api/import';

  /**
   * Prévisualiser un import CSV
   */
  async previewImport(csvData: string, type: ImportType): Promise<ImportPreview> {
    const response = await apiClient.post<{ success: boolean; data: ImportPreview }>(
      `${this.baseUrl}/preview`,
      { csvData, type }
    );
    return response.data;
  }

  /**
   * Exécuter un import en lot
   */
  async bulkImport(request: BulkImportRequest): Promise<ImportResult> {
    const response = await apiClient.post<{ success: boolean; data: ImportResult }>(
      `${this.baseUrl}/bulk`,
      request
    );
    return response.data;
  }

  /**
   * Obtenir les templates d'import
   */
  async getImportTemplate(type: ImportType): Promise<ImportTemplate> {
    const response = await apiClient.get<{ success: boolean; data: ImportTemplate }>(
      `${this.baseUrl}/templates/${type}`
    );
    return response.data;
  }

  /**
   * Télécharger un template CSV
   */
  async downloadTemplate(type: ImportType): Promise<void> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}${this.baseUrl}/templates/${type}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement du template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `template_${type}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading template:', error);
      throw error;
    }
  }

  /**
   * Parser un fichier CSV
   */
  parseCSVFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        resolve(text);
      };
      reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * Valider un fichier CSV
   */
  validateCSVFile(file: File): { isValid: boolean; error?: string } {
    // Vérifier le type de fichier
    if (!file.type.includes('csv') && !file.name.endsWith('.csv')) {
      return { isValid: false, error: 'Le fichier doit être au format CSV' };
    }

    // Vérifier la taille (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { isValid: false, error: 'Le fichier ne doit pas dépasser 5MB' };
    }

    return { isValid: true };
  }

  /**
   * Obtenir les types d'import disponibles
   */
  getImportTypes(): Array<{ value: ImportType; label: string; description: string }> {
    return [
      {
        value: ImportType.VOLUNTEERS,
        label: 'Bénévoles',
        description: 'Importer une liste de bénévoles avec leurs compétences et disponibilités'
      },
      {
        value: ImportType.PARTICIPANTS,
        label: 'Participants',
        description: 'Importer une liste de participants à un événement'
      },
      {
        value: ImportType.USERS,
        label: 'Utilisateurs',
        description: 'Importer des utilisateurs avec différents rôles dans l\'organisation'
      },
      {
        value: ImportType.EVENTS,
        label: 'Événements',
        description: 'Importer une liste d\'événements avec leurs détails'
      },
      {
        value: ImportType.ATTENDANCES,
        label: 'Présences',
        description: 'Importer les données de présence aux événements'
      },
      {
        value: ImportType.TICKETS,
        label: 'Billets',
        description: 'Importer une liste de billets pour les événements'
      }
    ];
  }

  /**
   * Obtenir les options d'import par défaut
   */
  getDefaultImportOptions(type: ImportType) {
    return {
      skipDuplicates: true,
      updateExisting: false,
      sendInvitations: false,
      createTickets: false,
      defaultRole: type === ImportType.VOLUNTEERS ? 'volunteer' : 'participant'
    };
  }
}

export const importService = new ImportService();