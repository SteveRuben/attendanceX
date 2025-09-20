import { OrganizationInvitation, OrganizationInvitationStatus, OrganizationRole } from "../common/types";
import { BaseModel, ValidationError } from "./base.model";
import * as crypto from 'crypto';

export class OrganizationInvitationModel extends BaseModel<OrganizationInvitation> {
  public organizationId: string;
  public email: string;
  public role: OrganizationRole;
  public permissions: string[];
  public invitedBy: string;
  public invitedAt: Date;
  public expiresAt: Date;
  public token: string;
  public status: OrganizationInvitationStatus;
  public acceptedAt?: Date;
  public acceptedBy?: string;
  public message?: string;
  public metadata: Record<string, any>;

  constructor(data: Partial<OrganizationInvitation>) {
    super(data);
    
    this.organizationId = data.organizationId || '';
    this.email = data.email || '';
    this.role = data.role || OrganizationRole.MEMBER;
    this.permissions = data.permissions || [];
    this.invitedBy = data.invitedBy || '';
    this.invitedAt = data.invitedAt || new Date();
    this.expiresAt = data.expiresAt || this.getDefaultExpirationDate();
    this.token = data.token || this.generateInvitationToken();
    this.status = data.status || OrganizationInvitationStatus.PENDING;
    this.acceptedAt = data.acceptedAt;
    this.acceptedBy = data.acceptedBy;
    this.message = data.message;
    this.metadata = data.metadata || {};
  }

  /**
   * Créer une nouvelle invitation
   */
  static createInvitation(
    organizationId: string,
    email: string,
    role: OrganizationRole,
    invitedBy: string,
    permissions?: string[],
    message?: string,
    expirationDays: number = 7
  ): OrganizationInvitationModel {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    const invitation = new OrganizationInvitationModel({
      organizationId,
      email: email.toLowerCase().trim(),
      role,
      permissions: permissions || [],
      invitedBy,
      expiresAt,
      message,
      status: OrganizationInvitationStatus.PENDING
    });

    invitation.validate();
    return invitation;
  }

  /**
   * Valider les données de l'invitation
   */
  async validate(): Promise<boolean> {
    const errors: string[] = [];

    // Validation de l'ID d'organisation
    if (!this.organizationId || this.organizationId.trim().length === 0) {
      errors.push('L\'ID de l\'organisation est requis');
    }

    // Validation de l'email
    if (!this.email || this.email.trim().length === 0) {
      errors.push('L\'adresse email est requise');
    }

    if (this.email && !this.isValidEmail(this.email)) {
      errors.push('Adresse email invalide');
    }

    // Validation du rôle
    if (!Object.values(OrganizationRole).includes(this.role)) {
      errors.push('Rôle d\'organisation invalide');
    }

    // Validation des permissions
    if (this.permissions && this.permissions.length > 0) {
      const invalidPermissions = this.permissions.filter(permission => 
        !this.isValidPermission(permission)
      );
      
      if (invalidPermissions.length > 0) {
        errors.push(`Permissions invalides: ${invalidPermissions.join(', ')}`);
      }
    }

    // Validation de l'inviteur
    if (!this.invitedBy || this.invitedBy.trim().length === 0) {
      errors.push('L\'ID de l\'inviteur est requis');
    }

    // Validation des dates
    if (this.expiresAt <= new Date()) {
      errors.push('La date d\'expiration doit être dans le futur');
    }

    if (this.invitedAt > new Date()) {
      errors.push('La date d\'invitation ne peut pas être dans le futur');
    }

    // Validation du token
    if (!this.token || this.token.length < 32) {
      errors.push('Token d\'invitation invalide');
    }

    // Validation du statut
    if (!Object.values(OrganizationInvitationStatus).includes(this.status)) {
      errors.push('Statut d\'invitation invalide');
    }

    // Validation du message (si présent)
    if (this.message && this.message.length > 500) {
      errors.push('Le message ne peut pas dépasser 500 caractères');
    }

    // Validation de la cohérence des données d'acceptation
    if (this.status === OrganizationInvitationStatus.ACCEPTED) {
      if (!this.acceptedAt) {
        errors.push('La date d\'acceptation est requise pour une invitation acceptée');
      }
      
      if (!this.acceptedBy) {
        errors.push('L\'ID de l\'utilisateur qui a accepté est requis');
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Données d\'invitation invalides');
    }
    
    return true;
  }

  /**
   * Vérifier si l'invitation est valide (non expirée et en attente)
   */
  isValid(): boolean {
    return this.status === OrganizationInvitationStatus.PENDING && 
           this.expiresAt > new Date();
  }

  /**
   * Vérifier si l'invitation est expirée
   */
  isExpired(): boolean {
    return this.expiresAt <= new Date();
  }

  /**
   * Accepter l'invitation
   */
  accept(acceptedBy: string): void {
    if (!this.isValid()) {
      if (this.isExpired()) {
        throw new ValidationError('Cette invitation a expiré');
      }
      throw new ValidationError('Cette invitation n\'est plus valide');
    }

    this.status = OrganizationInvitationStatus.ACCEPTED;
    this.acceptedAt = new Date();
    this.acceptedBy = acceptedBy;
  }

  /**
   * Décliner l'invitation
   */
  decline(): void {
    if (this.status !== OrganizationInvitationStatus.PENDING) {
      throw new ValidationError('Seules les invitations en attente peuvent être déclinées');
    }

    this.status = OrganizationInvitationStatus.DECLINED;
  }

  /**
   * Annuler l'invitation
   */
  cancel(): void {
    if (this.status !== OrganizationInvitationStatus.PENDING) {
      throw new ValidationError('Seules les invitations en attente peuvent être annulées');
    }

    this.status = OrganizationInvitationStatus.CANCELLED;
  }

  /**
   * Marquer comme expirée
   */
  markAsExpired(): void {
    if (this.status === OrganizationInvitationStatus.PENDING && this.isExpired()) {
      this.status = OrganizationInvitationStatus.EXPIRED;
    }
  }

  /**
   * Renouveler l'invitation (créer un nouveau token et prolonger l'expiration)
   */
  renew(expirationDays: number = 7): void {
    if (this.status !== OrganizationInvitationStatus.PENDING 
      && this.status !== OrganizationInvitationStatus.EXPIRED) {
      throw new ValidationError('Seules les invitations en attente ou expirées peuvent être renouvelées');
    }

    this.token = this.generateInvitationToken();
    this.expiresAt = new Date();
    this.expiresAt.setDate(this.expiresAt.getDate() + expirationDays);
    this.status = OrganizationInvitationStatus.PENDING;
  }

  /**
   * Obtenir l'URL d'invitation
   */
  getInvitationUrl(baseUrl: string): string {
    return `${baseUrl}/invitation/accept?token=${this.token}`;
  }

  /**
   * Obtenir les données pour l'email d'invitation
   */
  getEmailData(organizationName: string, inviterName: string): {
    to: string;
    subject: string;
    templateData: any;
  } {
    return {
      to: this.email,
      subject: `Invitation à rejoindre ${organizationName}`,
      templateData: {
        organizationName,
        inviterName,
        role: this.getRoleDisplayName(),
        message: this.message,
        expiresAt: this.expiresAt,
        invitationUrl: this.getInvitationUrl(process.env.FRONTEND_URL || 'http://localhost:3000')
      }
    };
  }

  /**
   * Obtenir le nom d'affichage du rôle
   */
  private getRoleDisplayName(): string {
    const roleNames = {
      [OrganizationRole.OWNER]: 'Propriétaire',
      [OrganizationRole.ADMIN]: 'Administrateur',
      [OrganizationRole.MANAGER]: 'Gestionnaire',
      [OrganizationRole.MEMBER]: 'Membre',
      [OrganizationRole.VIEWER]: 'Observateur'
    };

    return roleNames[this.role] || 'Membre';
  }

  /**
   * Générer un token d'invitation sécurisé
   */
  private generateInvitationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Obtenir la date d'expiration par défaut (7 jours)
   */
  private getDefaultExpirationDate(): Date {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    return expiresAt;
  }

  /**
   * Valider une permission
   */
  private isValidPermission(permission: string): boolean {
    // Ici, vous pourriez valider contre une liste de permissions valides
    // Pour l'instant, on accepte toutes les chaînes non vides
    return typeof permission === 'string' && permission.trim().length > 0;
  }

  /**
   * Valider une adresse email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Convertir en objet simple pour la base de données
   */
  toFirestore(): any {
    return {
      id: this.id,
      organizationId: this.organizationId,
      email: this.email,
      role: this.role,
      permissions: this.permissions,
      invitedBy: this.invitedBy,
      invitedAt: this.invitedAt,
      expiresAt: this.expiresAt,
      token: this.token,
      status: this.status,
      acceptedAt: this.acceptedAt,
      acceptedBy: this.acceptedBy,
      message: this.message,
      metadata: this.metadata
    };
  }

  /**
   * Créer une instance depuis les données Firestore
   */
  static fromFirestore(doc: any): OrganizationInvitationModel {
    const data = doc.data();
    return new OrganizationInvitationModel({
      ...data,
      id: doc.id,
      invitedAt: data.invitedAt?.toDate(),
      expiresAt: data.expiresAt?.toDate(),
      acceptedAt: data.acceptedAt?.toDate()
    });
  }

  /**
   * Rechercher une invitation par token
   */
  static async findByToken(token: string): Promise<OrganizationInvitationModel | null> {
    // Cette méthode serait implémentée dans le service
    // Elle est ici pour référence
    return null;
  }

  /**
   * Nettoyer les invitations expirées
   */
  static async cleanupExpiredInvitations(): Promise<number> {
    // Cette méthode serait implémentée dans le service
    // Elle est ici pour référence
    return 0;
  }
}