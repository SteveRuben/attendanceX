import { collections } from "../../config/database";
import { logger } from "firebase-functions";
import { 
  ImportRequest,
  ImportResult,
  ImportData,
  ImportType,
  ImportOptions,
  ImportedUser,
  ImportValidationResult,
  ImportValidationError,
  ImportValidationWarning,
  ImportDuplicate,
  BulkImportRequest,
  FieldMapping,
  ImportPreview
} from "../../common/types/import.types";
import { ValidationError } from "../../utils/common/errors";
import { UserModel } from "../../models/user.model";
import { ImportModel, CreateImportJobRequest } from "../../models/import.model";
import { CreateUserRequest } from "../../common/types/user.types";
import { TenantRole } from "../../common/types/tenant.types";
import { ticketService } from "../ticket/ticket.service";
import { TicketType } from "../../common/types/ticket.types";
import { userInvitationService, UserInvitationRequest } from "../user/user-invitation.service";

export class ImportService {

  /**
   * Prévisualiser un import CSV
   */
  async previewImport(
    csvData: string,
    type: ImportType,
    tenantId: string
  ): Promise<ImportPreview> {
    try {
      // Validate tenant context
      if (!tenantId) {
        throw new ValidationError('Tenant context is required');
      }

      const lines = csvData.trim().split('\n');
      
      if (lines.length < 2) {
        throw new ValidationError('Le fichier CSV doit contenir au moins un en-tête et une ligne de données');
      }

      const headers = this.parseCSVLine(lines[0]);
      const rows = lines.slice(1).map(line => this.parseCSVLine(line));

      // Mapping automatique des champs
      const mapping = this.autoMapFields(headers);

      // Validation des données
      const validation = await this.validateImportData(rows, mapping, tenantId);

      return {
        headers,
        rows: rows.slice(0, 10), // Limiter à 10 lignes pour la prévisualisation
        mapping,
        validation
      };
    } catch (error: any) {
      logger.error('Error previewing import:', error);
      throw new ValidationError(error.message || 'Erreur lors de la prévisualisation');
    }
  }

  /**
   * Importer des données en lot
   */
  async bulkImport(
    request: BulkImportRequest,
    tenantId: string,
    userId: string
  ): Promise<ImportResult> {
    const startTime = Date.now();
    
    try {
      // Validate tenant context
      if (!tenantId) {
        throw new ValidationError('Tenant context is required');
      }

      if (!userId) {
        throw new ValidationError('User context is required');
      }

      logger.info(`🚀 Starting bulk import for tenant: ${tenantId}`, {
        type: request.type,
        tenantId,
        userId
      });

      const lines = request.csvData.trim().split('\n');
      
      if (lines.length < 2) {
        throw new ValidationError('Le fichier CSV doit contenir au moins un en-tête et une ligne de données');
      }

      const headers = this.parseCSVLine(lines[0]);
      const rows = lines.slice(1).map(line => this.parseCSVLine(line));

      // Utiliser le mapping fourni ou auto-mapping
      const mapping = request.mapping || this.autoMapFields(headers);

      // Convertir les lignes CSV en données d'import
      const importData = this.convertRowsToImportData(rows, mapping);

      // Valider les données
      const validation = await this.validateImportData(rows, mapping, tenantId);

      if (!validation.isValid && validation.errors.length > 0) {
        throw new ValidationError(`Erreurs de validation: ${validation.errors.length} erreurs trouvées`);
      }

      // Créer un job d'import pour le suivi
      const importJobRequest: CreateImportJobRequest = {
        type: request.type,
        totalRows: importData.length,
        options: request.options,
        metadata: {
          headers,
          mapping,
          validation: {
            totalRows: validation.totalRows,
            validRows: validation.validRows,
            errorCount: validation.errors.length,
            warningCount: validation.warnings.length,
            duplicateCount: validation.duplicates.length
          }
        }
      };

      const importJobModel = ImportModel.fromCreateRequest({
        ...importJobRequest,
        tenantId,
        createdBy: userId
      });

      await importJobModel.validate();
      const jobRef = collections.import_jobs.doc();
      await jobRef.set(importJobModel.toFirestore());

      // Marquer le job comme en cours de traitement
      importJobModel.markAsProcessing();
      await jobRef.update(importJobModel.toFirestore());

      // Effectuer l'import
      const result = await this.processImport({
        tenantId,
        type: request.type,
        data: importData,
        options: request.options
      }, userId);

      // Mettre à jour le job avec le résultat
      importJobModel.markAsCompleted(result);
      await jobRef.update(importJobModel.toFirestore());

      const duration = Date.now() - startTime;
      logger.info(`✅ Bulk import completed in ${duration}ms`, {
        tenantId,
        type: request.type,
        jobId: jobRef.id,
        totalProcessed: result.totalProcessed,
        successCount: result.successCount,
        errorCount: result.errorCount,
        duration
      });

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Bulk import failed after ${duration}ms`, {
        tenantId,
        error: error.message,
        duration
      });
      throw error;
    }
  }

  /**
   * Traiter l'import des données avec batch processing
   */
  async processImport(
    request: ImportRequest,
    userId: string
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      totalProcessed: 0,
      successCount: 0,
      errorCount: 0,
      skippedCount: 0,
      errors: [],
      createdUsers: [],
      updatedUsers: [],
      skippedUsers: []
    };

    try {
      // Validate tenant context
      if (!request.tenantId) {
        throw new ValidationError('Tenant context is required');
      }

      result.totalProcessed = request.data.length;

      // Process in batches for better performance
      const batchSize = 10;
      for (let i = 0; i < request.data.length; i += batchSize) {
        const batch = request.data.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (userData, batchIndex) => {
            const globalIndex = i + batchIndex;
            try {
              const importedUser = await this.processUserImport(
                userData,
                request.tenantId,
                request.type,
                request.options || {},
                userId,
                globalIndex + 2 // +2 car ligne 1 = headers, ligne 2 = première donnée
              );

              if (importedUser.action === 'created') {
                result.createdUsers.push(importedUser);
                result.successCount++;
              } else if (importedUser.action === 'updated') {
                result.updatedUsers.push(importedUser);
                result.successCount++;
              } else {
                result.skippedUsers.push(importedUser);
                result.skippedCount++;
              }

            } catch (error: any) {
              result.errorCount++;
              result.errors.push({
                row: globalIndex + 2,
                email: userData.email,
                error: error.message,
                data: userData
              });
            }
          })
        );
      }

      result.success = result.errorCount === 0;

      return result;
    } catch (error: any) {
      logger.error('Error processing import:', error);
      throw new ValidationError(error.message || 'Erreur lors du traitement de l\'import');
    }
  }

  /**
   * Traiter l'import d'un utilisateur individuel
   */
  private async processUserImport(
    userData: ImportData,
    tenantId: string,
    type: ImportType,
    options: ImportOptions,
    createdBy: string,
    row: number
  ): Promise<ImportedUser> {
    // Validate input parameters
    if (!userData.email || !userData.firstName) {
      throw new ValidationError('Email and firstName are required');
    }
    
    // Pour les bénévoles, créer une invitation au lieu d'un utilisateur direct
    if (type === ImportType.VOLUNTEERS) {
      return await this.processVolunteerInvitation(userData, tenantId, options, createdBy, row);
    }

    // Pour les autres types (participants, utilisateurs), créer directement l'utilisateur
    return await this.processDirectUserCreation(userData, tenantId, type, options, createdBy, row);
  }

  /**
   * Traiter l'import d'un bénévole comme une invitation
   */
  private async processVolunteerInvitation(
    userData: ImportData,
    tenantId: string,
    options: ImportOptions,
    createdBy: string,
    row: number
  ): Promise<ImportedUser> {
    // Vérifier si une invitation existe déjà
    const existingInvitationQuery = await collections.user_invitations
      .where('email', '==', userData.email.toLowerCase())
      .where('tenantId', '==', tenantId)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (!existingInvitationQuery.empty) {
      if (options.skipDuplicates) {
        return {
          id: existingInvitationQuery.docs[0].id,
          email: userData.email,
          name: `${userData.firstName} ${userData.lastName}`,
          action: 'skipped'
        };
      }

      if (options.updateExisting) {
        // Annuler l'ancienne invitation et en créer une nouvelle
        await collections.user_invitations.doc(existingInvitationQuery.docs[0].id).update({
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy: createdBy,
          updatedAt: new Date()
        });
      }
    }

    // Créer l'invitation pour le bénévole
    const invitationRequest: UserInvitationRequest = {
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      tenantRole: this.mapVolunteerRole(userData.role),
      department: userData.department,
      message: `Vous êtes invité(e) à rejoindre notre équipe de bénévoles. ${userData.notes || ''}`
    };

    try {
      const invitation = await userInvitationService.inviteUser(tenantId, createdBy, invitationRequest);

      logger.info(`✅ Volunteer invitation created: ${userData.email}`, {
        invitationId: invitation.id,
        tenantId,
        row
      });

      return {
        id: invitation.id,
        email: userData.email,
        name: `${userData.firstName} ${userData.lastName}`,
        action: 'created'
      };
    } catch (error: any) {
      logger.error(`❌ Failed to create volunteer invitation for ${userData.email}:`, error);
      throw new ValidationError(`Erreur lors de la création de l'invitation pour ${userData.email}: ${error.message}`);
    }
  }

  /**
   * Traiter la création directe d'un utilisateur (non-bénévoles)
   */
  private async processDirectUserCreation(
    userData: ImportData,
    tenantId: string,
    type: ImportType,
    options: ImportOptions,
    createdBy: string,
    row: number
  ): Promise<ImportedUser> {
    // Vérifier si l'utilisateur existe déjà
    const existingUserQuery = await collections.users
      .where('email', '==', userData.email.toLowerCase())
      .where('tenantId', '==', tenantId)
      .limit(1)
      .get();

    const existingUser = !existingUserQuery.empty ? existingUserQuery.docs[0] : null;

    if (existingUser) {
      if (options.skipDuplicates) {
        return {
          id: existingUser.id,
          email: userData.email,
          name: `${userData.firstName} ${userData.lastName}`,
          action: 'skipped'
        };
      }

      if (options.updateExisting) {
        // Mettre à jour l'utilisateur existant
        const updateData: any = {
          firstName: userData.firstName,
          lastName: userData.lastName,
          name: `${userData.firstName} ${userData.lastName}`,
          phone: userData.phone,
          profile: {
            department: userData.department,
            skills: userData.skills || [],
            jobTitle: userData.role
          },
          updatedAt: new Date()
        };

        await collections.users.doc(existingUser.id).update(updateData);

        return {
          id: existingUser.id,
          email: userData.email,
          name: `${userData.firstName} ${userData.lastName}`,
          action: 'updated'
        };
      }
    }

    // Créer un nouvel utilisateur (pour participants, etc.)
    const createUserData: CreateUserRequest = {
      name: `${userData.firstName} ${userData.lastName}`,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email.toLowerCase(),
      phone: userData.phone,
      password: 'temp_password_' + Math.random().toString(36).substring(7), // Temporary password
      profile: {
        department: userData.department,
        skills: userData.skills || [],
        jobTitle: userData.role
      }
    };

    const userModel = UserModel.fromCreateRequest(createUserData);
    await userModel.validate();

    const userRef = collections.users.doc();
    await userRef.set(userModel.toFirestore());

    const newUser: ImportedUser = {
      id: userRef.id,
      email: userData.email,
      name: `${userData.firstName} ${userData.lastName}`,
      action: 'created'
    };

    // Créer un billet si demandé et si un événement est spécifié
    if (options.createTickets && options.eventId) {
      try {
        const ticket = await ticketService.createTicket({
          eventId: options.eventId,
          participantId: userRef.id,
          participantName: `${userData.firstName} ${userData.lastName}`,
          participantEmail: userData.email,
          participantPhone: userData.phone,
          type: TicketType.STANDARD,
          customData: {
            importedUser: true,
            importRow: row
          }
        }, tenantId, createdBy);

        newUser.ticketId = ticket.id;

        // Envoyer le billet par email si demandé
        if (options.sendInvitations) {
          logger.info(`Ticket created for imported user: ${userData.email}`, {
            ticketId: ticket.id,
            userId: userRef.id
          });
        }
      } catch (ticketError: any) {
        logger.warn(`Failed to create ticket for imported user ${userData.email}:`, ticketError);
        // Ne pas faire échouer l'import pour un problème de billet
      }
    }

    return newUser;
  }

  /**
   * Valider les données d'import
   */
  private async validateImportData(
    rows: string[][],
    mapping: FieldMapping,
    tenantId: string
  ): Promise<ImportValidationResult> {
    const errors: ImportValidationError[] = [];
    const warnings: ImportValidationWarning[] = [];
    const duplicates: ImportDuplicate[] = [];
    const emailsSeen = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 car ligne 1 = headers

      // Validation des champs requis
      const firstName = this.getFieldValue(row, mapping.firstName, mapping);
      const lastName = this.getFieldValue(row, mapping.lastName, mapping);
      const email = this.getFieldValue(row, mapping.email, mapping);

      if (!firstName?.trim()) {
        errors.push({
          row: rowNum,
          field: 'firstName',
          value: firstName || '',
          message: 'Le prénom est requis'
        });
      }

      if (!lastName?.trim()) {
        errors.push({
          row: rowNum,
          field: 'lastName',
          value: lastName || '',
          message: 'Le nom est requis'
        });
      }

      if (!email?.trim()) {
        errors.push({
          row: rowNum,
          field: 'email',
          value: email || '',
          message: 'L\'email est requis'
        });
      } else {
        // Validation du format email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          errors.push({
            row: rowNum,
            field: 'email',
            value: email,
            message: 'Format d\'email invalide'
          });
        } else {
          const normalizedEmail = email.toLowerCase().trim();
          
          // Vérifier les doublons dans le fichier
          if (emailsSeen.has(normalizedEmail)) {
            warnings.push({
              row: rowNum,
              field: 'email',
              value: email,
              message: 'Email en double dans le fichier'
            });
          } else {
            emailsSeen.add(normalizedEmail);
          }

          // Vérifier si l'utilisateur existe déjà
          const existingUserQuery = await collections.users
            .where('email', '==', normalizedEmail)
            .where('tenantId', '==', tenantId)
            .limit(1)
            .get();

          if (!existingUserQuery.empty) {
            duplicates.push({
              row: rowNum,
              email: normalizedEmail,
              existingUserId: existingUserQuery.docs[0].id,
              action: 'skip'
            });
          }
        }
      }

      // Validation du téléphone si fourni
      const phone = this.getFieldValue(row, mapping.phone, mapping);
      if (phone && phone.trim()) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
          warnings.push({
            row: rowNum,
            field: 'phone',
            value: phone,
            message: 'Format de téléphone potentiellement invalide'
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      duplicates,
      validRows: rows.length - errors.length,
      totalRows: rows.length
    };
  }

  /**
   * Mapper automatiquement les champs CSV
   */
  private autoMapFields(headers: string[]): FieldMapping {
    const mapping: FieldMapping = {
      firstName: '',
      lastName: '',
      email: ''
    };

    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());

    // Mapping automatique basé sur des mots-clés
    for (let i = 0; i < normalizedHeaders.length; i++) {
      const header = normalizedHeaders[i];
      
      if (!mapping.firstName && (header.includes('prénom') || header.includes('firstname') || header.includes('first_name') || header.includes('prenom'))) {
        mapping.firstName = headers[i];
      }
      
      if (!mapping.lastName && (header.includes('nom') || header.includes('lastname') || header.includes('last_name') || header.includes('surname'))) {
        mapping.lastName = headers[i];
      }
      
      if (!mapping.email && (header.includes('email') || header.includes('mail') || header.includes('e-mail'))) {
        mapping.email = headers[i];
      }
      
      if (!mapping.phone && (header.includes('téléphone') || header.includes('telephone') || header.includes('phone') || header.includes('mobile'))) {
        mapping.phone = headers[i];
      }
      
      if (!mapping.role && (header.includes('rôle') || header.includes('role') || header.includes('fonction'))) {
        mapping.role = headers[i];
      }
      
      if (!mapping.department && (header.includes('département') || header.includes('department') || header.includes('service'))) {
        mapping.department = headers[i];
      }
      
      if (!mapping.skills && (header.includes('compétences') || header.includes('skills') || header.includes('competences'))) {
        mapping.skills = headers[i];
      }
      
      if (!mapping.notes && (header.includes('notes') || header.includes('commentaires') || header.includes('comments'))) {
        mapping.notes = headers[i];
      }
    }

    return mapping;
  }

  /**
   * Convertir les lignes CSV en données d'import
   */
  private convertRowsToImportData(rows: string[][], mapping: FieldMapping): ImportData[] {
    return rows.map(row => {
      const skills = this.getFieldValue(row, mapping.skills, mapping);
      
      return {
        firstName: this.getFieldValue(row, mapping.firstName, mapping)?.trim() || '',
        lastName: this.getFieldValue(row, mapping.lastName, mapping)?.trim() || '',
        email: this.getFieldValue(row, mapping.email, mapping)?.toLowerCase().trim() || '',
        phone: this.getFieldValue(row, mapping.phone, mapping)?.trim(),
        role: this.getFieldValue(row, mapping.role, mapping)?.trim(),
        department: this.getFieldValue(row, mapping.department, mapping)?.trim(),
        skills: skills ? skills.split(',').map(s => s.trim()).filter(s => s) : [],
        notes: this.getFieldValue(row, mapping.notes, mapping)?.trim()
      };
    });
  }

  /**
   * Obtenir la valeur d'un champ depuis une ligne CSV
   */
  private getFieldValue(row: string[], fieldName: string | undefined, mapping: FieldMapping): string | undefined {
    if (!fieldName) return undefined;
    
    // Trouver l'index du champ dans le mapping
    const mappingEntries = Object.entries(mapping);
    for (const [, value] of mappingEntries) {
      if (value === fieldName) {
        const index = Object.values(mapping).indexOf(fieldName);
        return row[index];
      }
    }
    
    return undefined;
  }

  /**
   * Parser une ligne CSV
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  /**
   * Obtenir l'historique des imports pour un tenant
   */
  async getImportHistory(
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      type?: ImportType;
      status?: string;
    } = {}
  ): Promise<{
    jobs: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      if (!tenantId) {
        throw new ValidationError('Tenant context is required');
      }

      const { page = 1, limit = 20, type, status } = options;
      
      let query = collections.import_jobs
        .where('tenantId', '==', tenantId)
        .orderBy('createdAt', 'desc');

      if (type) {
        query = query.where('type', '==', type);
      }

      if (status) {
        query = query.where('status', '==', status);
      }

      // Get total count
      const totalSnapshot = await query.get();
      const total = totalSnapshot.size;

      // Apply pagination
      const offset = (page - 1) * limit;
      const paginatedQuery = query.offset(offset).limit(limit);
      const snapshot = await paginatedQuery.get();

      const jobs = snapshot.docs.map(doc => {
        const importModel = ImportModel.fromFirestore(doc);
        return importModel?.toAPI();
      }).filter(job => job !== null);

      const totalPages = Math.ceil(total / limit);

      return {
        jobs,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      };
    } catch (error: any) {
      logger.error('Error getting import history:', error);
      throw new ValidationError(error.message || 'Erreur lors de la récupération de l\'historique');
    }
  }

  /**
   * Obtenir un job d'import spécifique
   */
  async getImportJob(jobId: string, tenantId: string): Promise<any | null> {
    try {
      if (!tenantId) {
        throw new ValidationError('Tenant context is required');
      }

      const doc = await collections.import_jobs.doc(jobId).get();
      
      if (!doc.exists) {
        return null;
      }

      const importModel = ImportModel.fromFirestore(doc);
      
      if (!importModel || importModel.getTenantId() !== tenantId) {
        return null;
      }

      return importModel.toAPI();
    } catch (error: any) {
      logger.error('Error getting import job:', error);
      throw new ValidationError(error.message || 'Erreur lors de la récupération du job');
    }
  }

  /**
   * Annuler un job d'import en cours
   */
  async cancelImportJob(jobId: string, tenantId: string, userId: string): Promise<void> {
    try {
      if (!tenantId) {
        throw new ValidationError('Tenant context is required');
      }

      const doc = await collections.import_jobs.doc(jobId).get();
      
      if (!doc.exists) {
        throw new ValidationError('Import job not found');
      }

      const importModel = ImportModel.fromFirestore(doc);
      
      if (!importModel || importModel.getTenantId() !== tenantId) {
        throw new ValidationError('Import job not found');
      }

      if (importModel.isCompleted() || importModel.isFailed()) {
        throw new ValidationError('Cannot cancel completed or failed import job');
      }

      // Marquer comme annulé
      importModel.markAsCancelled();

      await collections.import_jobs.doc(jobId).update(importModel.toFirestore());

      logger.info(`✅ Import job cancelled: ${jobId}`, {
        jobId,
        tenantId,
        userId
      });
    } catch (error: any) {
      logger.error('Error cancelling import job:', error);
      throw new ValidationError(error.message || 'Erreur lors de l\'annulation du job');
    }
  }

  /**
   * Mapper le rôle pour les bénévoles uniquement
   */
  private mapVolunteerRole(role: string | undefined): TenantRole {
    if (!role) {
      return TenantRole.MEMBER; // Rôle par défaut pour les bénévoles
    }

    const normalizedRole = role.toLowerCase().trim();
    
    // Mapping spécifique pour les bénévoles
    if (normalizedRole.includes('coordinateur') || normalizedRole.includes('coordinator')) return TenantRole.MANAGER;
    if (normalizedRole.includes('responsable') || normalizedRole.includes('supervisor')) return TenantRole.MANAGER;
    if (normalizedRole.includes('chef') || normalizedRole.includes('lead')) return TenantRole.MANAGER;
    if (normalizedRole.includes('admin')) return TenantRole.ADMIN;
    
    // Par défaut, tous les bénévoles sont des membres
    return TenantRole.MEMBER;
  }
}

export const importService = new ImportService();