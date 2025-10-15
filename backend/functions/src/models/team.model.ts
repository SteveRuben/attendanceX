import { CreateTeamRequest, Team, TeamMember, TeamRole, TeamSettings, UpdateTeamRequest } from '../common/types';
import { BaseModel, ValidationError } from './base.model';
import { DocumentData } from 'firebase-admin/firestore';

export class TeamModel extends BaseModel<Team> {
  public organizationId: string;
  public name: string;
  public description?: string;
  public department?: string;
  public managerId?: string;
  public members: string[];
  public permissions: string[];
  public settings: TeamSettings;
  public isActive: boolean;

  constructor(data: Partial<Team>) {
    super(data);
    this.name = data.name || '';
    this.description = data.description;
    this.department = data.department;
    this.managerId = data.managerId;
    this.members = data.members || [];
    this.permissions = data.permissions || [];
    this.settings = data.settings || this.getDefaultSettings();
    this.isActive = data.isActive !== undefined ? data.isActive : true;
  }

  /**
   * Créer une équipe à partir d'une requête
   */
  static fromCreateRequest(organizationId: string, request: CreateTeamRequest): TeamModel {
    const team = new TeamModel({
      name: request.name,
      description: request.description,
      department: request.department,
      managerId: request.managerId,
      members: request.initialMembers || [],
      permissions: [],
      settings: {
        canValidateAttendance: request.settings?.canValidateAttendance || false,
        canCreateEvents: request.settings?.canCreateEvents || false,
        canInviteParticipants: request.settings?.canInviteParticipants || true,
        canViewAllEvents: request.settings?.canViewAllEvents || false,
        canExportData: request.settings?.canExportData || false,
        maxEventsPerMonth: request.settings?.maxEventsPerMonth,
        allowedEventTypes: request.settings?.allowedEventTypes || []
      },
      isActive: true
    });

    return team;
  }

  /**
   * Valider les données de l'équipe
   */
  async validate(): Promise<boolean> {
    const errors: string[] = [];

    // Validation du nom
    if (!this.name || this.name.trim().length === 0) {
      errors.push('Le nom de l\'équipe est requis');
    }

    if (this.name && this.name.length < 2) {
      errors.push('Le nom de l\'équipe doit contenir au moins 2 caractères');
    }

    if (this.name && this.name.length > 100) {
      errors.push('Le nom de l\'équipe ne peut pas dépasser 100 caractères');
    }

    // Validation de l'organisation
    if (!this.organizationId || this.organizationId.trim().length === 0) {
      errors.push('L\'ID de l\'organisation est requis');
    }

    // Validation de la description
    if (this.description && this.description.length > 500) {
      errors.push('La description ne peut pas dépasser 500 caractères');
    }

    // Validation du département
    if (this.department && this.department.length > 100) {
      errors.push('Le département ne peut pas dépasser 100 caractères');
    }

    // Validation des paramètres
    if (this.settings) {
      this.validateSettings(errors);
    }

    if (errors.length > 0) {
      throw new ValidationError('Données d\'équipe invalides');
    }

    return true;
  }

  /**
   * Valider les paramètres de l'équipe
   */
  private validateSettings(errors: string[]): void {
    const settings = this.settings;

    // Validation du nombre maximum d'événements par mois
    if (settings.maxEventsPerMonth !== undefined) {
      if (settings.maxEventsPerMonth < 1 || settings.maxEventsPerMonth > 1000) {
        errors.push('Le nombre maximum d\'événements par mois doit être entre 1 et 1000');
      }
    }

    // Validation des types d'événements autorisés
    if (settings.allowedEventTypes && Array.isArray(settings.allowedEventTypes)) {
      const invalidTypes = settings.allowedEventTypes.filter(type => 
        typeof type !== 'string' || type.trim().length === 0
      );
      if (invalidTypes.length > 0) {
        errors.push('Les types d\'événements autorisés doivent être des chaînes non vides');
      }
    }
  }

  /**
   * Mettre à jour l'équipe
   */
  async updateTeam(updates: UpdateTeamRequest): Promise<void> {
    const updateData: Partial<Team> = {};

    if (updates.name !== undefined) {
      this.name = updates.name;
      updateData.name = updates.name;
    }

    if (updates.description !== undefined) {
      this.description = updates.description;
      updateData.description = updates.description;
    }

    if (updates.department !== undefined) {
      this.department = updates.department;
      updateData.department = updates.department;
    }

    if (updates.managerId !== undefined) {
      this.managerId = updates.managerId;
      updateData.managerId = updates.managerId;
    }

    if (updates.settings) {
      this.settings = { ...this.settings, ...updates.settings };
      updateData.settings = this.settings;
    }

    await this.validate();

    // Utiliser la méthode update du BaseModel pour mettre à jour updatedAt
    super.update(updateData);
  }

  /**
   * Supprimer une équipe (soft delete)
   */
  async deleteTeam(): Promise<void> {
    this.isActive = false;
    super.update({ isActive: false });
  }

  /**
   * Ajouter un membre à l'équipe
   */
  addMember(userId: string): void {
    if (!this.members.includes(userId)) {
      this.members.push(userId);
      super.update({ members: this.members });
    }
  }

  /**
   * Supprimer un membre de l'équipe
   */
  removeMember(userId: string): void {
    const index = this.members.indexOf(userId);
    if (index > -1) {
      this.members.splice(index, 1);
      super.update({ members: this.members });
    }
  }

  /**
   * Vérifier si un utilisateur est membre de l'équipe
   */
  isMember(userId: string): boolean {
    return this.members.includes(userId);
  }

  /**
   * Vérifier si un utilisateur est manager de l'équipe
   */
  isManager(userId: string): boolean {
    return this.managerId === userId;
  }

  /**
   * Obtenir les paramètres par défaut
   */
  private getDefaultSettings(): TeamSettings {
    return {
      canValidateAttendance: false,
      canCreateEvents: false,
      canInviteParticipants: true,
      canViewAllEvents: false,
      canExportData: false,
      maxEventsPerMonth: undefined,
      allowedEventTypes: []
    };
  }

  /**
   * Convertir en objet simple pour la base de données
   */
  toFirestore(): DocumentData {
    return this.convertDatesToFirestore({
      id: this.id,
      organizationId: this.organizationId,
      name: this.name,
      description: this.description,
      department: this.department,
      managerId: this.managerId,
      members: this.members,
      permissions: this.permissions,
      settings: this.settings,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    });
  }

  /**
   * Créer une instance depuis les données Firestore
   */
  static fromFirestore(doc: any): TeamModel {
    if (!doc.exists) {
      throw new Error('Document d\'équipe non trouvé');
    }

    const data = doc.data();
    return new TeamModel({
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate()
    });
  }
}

export class TeamMemberModel extends BaseModel<TeamMember> {
  public teamId: string;
  public userId: string;
  public role: TeamRole;
  public joinedAt: Date;
  public isActive: boolean;
  public permissions: string[];

  constructor(data: Partial<TeamMember>) {
    super(data);
    this.teamId = data.teamId || '';
    this.userId = data.userId || '';
    this.role = data.role || TeamRole.MEMBER;
    this.joinedAt = data.joinedAt || new Date();
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.permissions = data.permissions || [];
  }

  /**
   * Créer un membre d'équipe à partir des données
   */
  static fromData(teamId: string, userId: string, role: TeamRole = TeamRole.MEMBER): TeamMemberModel {
    return new TeamMemberModel({
      teamId,
      userId,
      role,
      joinedAt: new Date(),
      isActive: true,
      permissions: []
    });
  }

  /**
   * Valider les données du membre d'équipe
   */
  async validate(): Promise<boolean> {
    const errors: string[] = [];

    // Validation de l'équipe
    if (!this.teamId || this.teamId.trim().length === 0) {
      errors.push('L\'ID de l\'équipe est requis');
    }

    // Validation de l'utilisateur
    if (!this.userId || this.userId.trim().length === 0) {
      errors.push('L\'ID de l\'utilisateur est requis');
    }

    // Validation du rôle
    if (!Object.values(TeamRole).includes(this.role)) {
      errors.push('Rôle d\'équipe invalide');
    }

    // Validation de la date d'adhésion
    if (!this.joinedAt || !(this.joinedAt instanceof Date)) {
      errors.push('Date d\'adhésion invalide');
    }

    if (errors.length > 0) {
      throw new ValidationError('Données de membre d\'équipe invalides');
    }

    return true;
  }

  /**
   * Mettre à jour le rôle du membre
   */
  updateRole(newRole: TeamRole): void {
    this.role = newRole;
    super.update({ role: newRole });
  }

  /**
   * Désactiver le membre
   */
  deactivate(): void {
    this.isActive = false;
    super.update({ isActive: false });
  }

  /**
   * Activer le membre
   */
  activate(): void {
    this.isActive = true;
    super.update({ isActive: true });
  }

  /**
   * Convertir en objet simple pour la base de données
   */
  toFirestore(): DocumentData {
    return this.convertDatesToFirestore({
      id: this.id,
      teamId: this.teamId,
      userId: this.userId,
      role: this.role,
      joinedAt: this.joinedAt,
      isActive: this.isActive,
      permissions: this.permissions,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    });
  }

  /**
   * Créer une instance depuis les données Firestore
   */
  static fromFirestore(doc: any): TeamMemberModel {
    if (!doc.exists) {
      throw new Error('Document de membre d\'équipe non trouvé');
    }

    const data = doc.data();
    return new TeamMemberModel({
      ...data,
      id: doc.id,
      joinedAt: data.joinedAt?.toDate(),
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate()
    });
  }
}

// Instances pour l'utilisation dans les services
// Note: Ces instances ne sont pas utilisées directement mais servent de référence
// Les vrais modèles sont créés via les constructeurs dans les services