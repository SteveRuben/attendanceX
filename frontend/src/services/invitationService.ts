/**
 * Service pour gérer les invitations utilisateurs
 * Interface avec l'API d'invitations
 */

export interface InvitationRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department?: string;
  message?: string;
  permissions?: string[];
}

export interface BulkInvitationRequest {
  invitations: InvitationRequest[];
  sendWelcomeEmail?: boolean;
  customMessage?: string;
}

export interface InvitationStatus {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  inviterName: string;
  createdAt: Date;
  expiresAt: Date;
  remindersSent: number;
}

export interface InvitationStats {
  total: number;
  pending: number;
  accepted: number;
  declined: number;
  expired: number;
  acceptanceRate: number;
  averageAcceptanceTime: number;
}

export interface InvitationListOptions {
  status?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface InvitationListResponse {
  invitations: InvitationStatus[];
  total: number;
  hasMore: boolean;
}

export interface CSVImportResult {
  successful: InvitationStatus[];
  failed: { data: any; error: string }[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

class InvitationService {
  private baseUrl = '/api/user-invitations';

  /**
   * Inviter un utilisateur unique
   */
  async inviteUser(invitation: InvitationRequest): Promise<InvitationStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invitation)
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to send invitation');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error inviting user:', error);
      throw error;
    }
  }

  /**
   * Inviter plusieurs utilisateurs en lot
   */
  async inviteUsers(bulkRequest: BulkInvitationRequest): Promise<{
    successful: InvitationStatus[];
    failed: { invitation: InvitationRequest; error: string }[];
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/bulk-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bulkRequest)
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to send bulk invitations');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error sending bulk invitations:', error);
      throw error;
    }
  }

  /**
   * Importer des invitations depuis un fichier CSV
   */
  async importFromCSV(
    file: File, 
    defaultRole: string = 'user', 
    customMessage?: string
  ): Promise<CSVImportResult> {
    try {
      const formData = new FormData();
      formData.append('csvFile', file);
      formData.append('defaultRole', defaultRole);
      
      if (customMessage) {
        formData.append('customMessage', customMessage);
      }

      const response = await fetch(`${this.baseUrl}/csv-import`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to import CSV');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error importing CSV:', error);
      throw error;
    }
  }

  /**
   * Obtenir la liste des invitations
   */
  async getInvitations(options: InvitationListOptions = {}): Promise<InvitationListResponse> {
    try {
      const params = new URLSearchParams();
      
      if (options.status) params.append('status', options.status);
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.sortBy) params.append('sortBy', options.sortBy);
      if (options.sortOrder) params.append('sortOrder', options.sortOrder);

      const response = await fetch(`${this.baseUrl}?${params}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get invitations');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error getting invitations:', error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques des invitations
   */
  async getInvitationStats(): Promise<InvitationStats> {
    try {
      const response = await fetch(`${this.baseUrl}/stats`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get invitation stats');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error getting invitation stats:', error);
      throw error;
    }
  }

  /**
   * Renvoyer une invitation
   */
  async resendInvitation(invitationId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${invitationId}/resend`, {
        method: 'POST'
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to resend invitation');
      }
    } catch (error) {
      console.error('Error resending invitation:', error);
      throw error;
    }
  }

  /**
   * Annuler une invitation
   */
  async cancelInvitation(invitationId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${invitationId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to cancel invitation');
      }
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      throw error;
    }
  }

  /**
   * Valider un token d'invitation (API publique)
   */
  async validateInvitationToken(token: string): Promise<{
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    organizationName: string;
    inviterName: string;
    expiresAt: Date;
  }> {
    try {
      const response = await fetch(`/api/public/invitations/validate/${token}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Invalid invitation token');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error validating invitation token:', error);
      throw error;
    }
  }

  /**
   * Accepter une invitation (API publique)
   */
  async acceptInvitation(acceptance: {
    token: string;
    password: string;
    acceptTerms: boolean;
    marketingConsent?: boolean;
  }): Promise<{
    user: any;
    tenant: any;
    loginUrl: string;
  }> {
    try {
      const response = await fetch('/api/public/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(acceptance)
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to accept invitation');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  }

  /**
   * Refuser une invitation (API publique)
   */
  async declineInvitation(token: string, reason?: string): Promise<void> {
    try {
      const response = await fetch('/api/public/invitations/decline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          reason
        })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to decline invitation');
      }
    } catch (error) {
      console.error('Error declining invitation:', error);
      throw error;
    }
  }

  /**
   * Valider les données d'invitation côté client
   */
  validateInvitationData(invitation: InvitationRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validation de l'email
    if (!invitation.email?.trim()) {
      errors.push('L\'email est requis');
    } else if (!this.isValidEmail(invitation.email)) {
      errors.push('Format d\'email invalide');
    }

    // Validation des noms
    if (!invitation.firstName?.trim()) {
      errors.push('Le prénom est requis');
    } else if (invitation.firstName.length > 50) {
      errors.push('Le prénom ne peut pas dépasser 50 caractères');
    }

    if (!invitation.lastName?.trim()) {
      errors.push('Le nom est requis');
    } else if (invitation.lastName.length > 50) {
      errors.push('Le nom ne peut pas dépasser 50 caractères');
    }

    // Validation du rôle
    if (!invitation.role) {
      errors.push('Le rôle est requis');
    } else if (!['admin', 'manager', 'user', 'viewer'].includes(invitation.role)) {
      errors.push('Rôle invalide');
    }

    // Validation du département (optionnel)
    if (invitation.department && invitation.department.length > 100) {
      errors.push('Le département ne peut pas dépasser 100 caractères');
    }

    // Validation du message (optionnel)
    if (invitation.message && invitation.message.length > 500) {
      errors.push('Le message ne peut pas dépasser 500 caractères');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Générer un modèle CSV pour les invitations
   */
  generateCSVTemplate(): string {
    const headers = ['email', 'firstName', 'lastName', 'role', 'department'];
    const examples = [
      'john.doe@example.com,John,Doe,user,IT',
      'jane.smith@example.com,Jane,Smith,manager,HR',
      'bob.wilson@example.com,Bob,Wilson,admin,Administration'
    ];

    return [headers.join(','), ...examples].join('\\n');
  }

  /**
   * Télécharger le modèle CSV
   */
  downloadCSVTemplate(): void {
    const csvContent = this.generateCSVTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'invitation-template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  /**
   * Parser un fichier CSV
   */
  async parseCSVFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const csv = e.target?.result as string;
          const lines = csv.split('\\n');
          const headers = lines[0].split(',').map(h => h.trim());
          
          const data = lines.slice(1)
            .filter(line => line.trim())
            .map(line => {
              const values = line.split(',').map(v => v.trim());
              const row: any = {};
              
              headers.forEach((header, index) => {
                row[header] = values[index] || '';
              });
              
              return row;
            });
          
          resolve(data);
        } catch (error) {
          reject(new Error('Erreur lors du parsing du CSV'));
        }
      };
      
      reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
      reader.readAsText(file);
    });
  }

  /**
   * Obtenir les rôles disponibles avec leurs descriptions
   */
  getAvailableRoles(): { value: string; label: string; description: string }[] {
    return [
      {
        value: 'admin',
        label: 'Administrateur',
        description: 'Accès complet à toutes les fonctionnalités'
      },
      {
        value: 'manager',
        label: 'Manager',
        description: 'Gestion des équipes et événements'
      },
      {
        value: 'user',
        label: 'Utilisateur',
        description: 'Accès standard aux fonctionnalités'
      },
      {
        value: 'viewer',
        label: 'Observateur',
        description: 'Accès en lecture seule'
      }
    ];
  }

  /**
   * Formater le statut d'invitation pour l'affichage
   */
  formatInvitationStatus(status: string): { label: string; color: string; icon: string } {
    const statusMap: Record<string, { label: string; color: string; icon: string }> = {
      pending: { label: 'En attente', color: 'yellow', icon: 'clock' },
      accepted: { label: 'Acceptée', color: 'green', icon: 'check-circle' },
      declined: { label: 'Refusée', color: 'red', icon: 'x-circle' },
      expired: { label: 'Expirée', color: 'gray', icon: 'alert-triangle' },
      cancelled: { label: 'Annulée', color: 'gray', icon: 'x-circle' }
    };

    return statusMap[status] || { label: status, color: 'gray', icon: 'help-circle' };
  }

  /**
   * Calculer le temps restant avant expiration
   */
  getTimeUntilExpiration(expiresAt: Date): { expired: boolean; timeLeft: string } {
    const now = new Date();
    const expiration = new Date(expiresAt);
    const diff = expiration.getTime() - now.getTime();

    if (diff <= 0) {
      return { expired: true, timeLeft: 'Expirée' };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return { expired: false, timeLeft: `${days} jour${days > 1 ? 's' : ''}` };
    } else if (hours > 0) {
      return { expired: false, timeLeft: `${hours} heure${hours > 1 ? 's' : ''}` };
    } else {
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return { expired: false, timeLeft: `${minutes} minute${minutes > 1 ? 's' : ''}` };
    }
  }

  // Méthodes privées

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    return emailRegex.test(email);
  }
}

// Instance singleton
export const invitationService = new InvitationService();
export default invitationService;