/**
 * Modèle ActivityCode pour la gestion des codes d'activité
 */

import { DocumentData, DocumentSnapshot } from 'firebase-admin/firestore';
import { BaseModel, ValidationError } from './base.model';
import { ActivityCode, ActivityCodeInput, ActivityCodeTree } from '../common/types';

export class ActivityCodeModel extends BaseModel<ActivityCode> {
  constructor(data: Partial<ActivityCode>) {
    const activityCodeData = {
      ...data,
      billable: data.billable !== undefined ? data.billable : true,
      isActive: data.isActive !== undefined ? data.isActive : true,
      projectSpecific: data.projectSpecific !== undefined ? data.projectSpecific : false,
      hierarchy: data.hierarchy || {
        level: 0,
        path: data.code || '',
        fullName: data.name || ''
      }
    };

    super(activityCodeData);
  }

  // Getters spécifiques
  get tenantId(): string {
    return this.data.tenantId;
  }

  get code(): string {
    return this.data.code;
  }

  get name(): string {
    return this.data.name;
  }

  get description(): string | undefined {
    return this.data.description;
  }

  get category(): string {
    return this.data.category;
  }

  get parentId(): string | undefined {
    return this.data.parentId;
  }

  get billable(): boolean {
    return this.data.billable;
  }

  get defaultRate(): number | undefined {
    return this.data.defaultRate;
  }

  get isActive(): boolean {
    return this.data.isActive;
  }

  get projectSpecific(): boolean {
    return this.data.projectSpecific;
  }

  get hierarchy(): ActivityCode['hierarchy'] {
    return this.data.hierarchy;
  }

  get level(): number {
    return this.data.hierarchy?.level || 0;
  }

  get path(): string {
    return this.data.hierarchy?.path || this.data.code;
  }

  get fullName(): string {
    return this.data.hierarchy?.fullName || this.data.name;
  }

  get isParent(): boolean {
    return !this.data.parentId;
  }

  get isChild(): boolean {
    return !!this.data.parentId;
  }

  // Méthodes de gestion de la hiérarchie
  public setParent(parentId: string, parentCode: string, parentName: string): void {
    if (!parentId || parentId.trim().length === 0) {
      throw new ValidationError('Parent ID is required');
    }

    if (parentId === this.id) {
      throw new ValidationError('Activity code cannot be its own parent');
    }

    this.data.parentId = parentId;
    this.updateHierarchy(parentCode, parentName);
    this.updateTimestamp();
  }

  public removeParent(): void {
    this.data.parentId = undefined;
    this.resetHierarchy();
    this.updateTimestamp();
  }

  private updateHierarchy(parentCode?: string, parentName?: string): void {
    if (this.data.parentId && parentCode && parentName) {
      // Code enfant
      this.data.hierarchy = {
        level: 1,
        path: `${parentCode}/${this.data.code}`,
        fullName: `${parentName} > ${this.data.name}`
      };
    } else {
      // Code parent ou sans parent
      this.resetHierarchy();
    }
  }

  private resetHierarchy(): void {
    this.data.hierarchy = {
      level: 0,
      path: this.data.code,
      fullName: this.data.name
    };
  }

  public updateHierarchyInfo(level: number, path: string, fullName: string): void {
    this.data.hierarchy = {
      level: Math.max(0, level),
      path: path || this.data.code,
      fullName: fullName || this.data.name
    };
    this.updateTimestamp();
  }

  // Méthodes de gestion du statut
  public activate(): void {
    this.data.isActive = true;
    this.updateTimestamp();
  }

  public deactivate(): void {
    this.data.isActive = false;
    this.updateTimestamp();
  }

  public toggleActive(): void {
    this.data.isActive = !this.data.isActive;
    this.updateTimestamp();
  }

  // Méthodes de gestion de la facturation
  public makeBillable(): void {
    this.data.billable = true;
    this.updateTimestamp();
  }

  public makeNonBillable(): void {
    this.data.billable = false;
    this.data.defaultRate = undefined; // Supprimer le taux si non facturable
    this.updateTimestamp();
  }

  public toggleBillable(): void {
    this.data.billable = !this.data.billable;
    if (!this.data.billable) {
      this.data.defaultRate = undefined;
    }
    this.updateTimestamp();
  }

  // Méthodes de gestion des taux
  public setDefaultRate(rate: number): void {
    if (rate < 0) {
      throw new ValidationError('Default rate cannot be negative');
    }

    if (!this.data.billable) {
      throw new ValidationError('Cannot set rate for non-billable activity code');
    }

    this.data.defaultRate = rate;
    this.updateTimestamp();
  }

  public removeDefaultRate(): void {
    this.data.defaultRate = undefined;
    this.updateTimestamp();
  }

  public hasDefaultRate(): boolean {
    return this.data.defaultRate !== undefined && this.data.defaultRate > 0;
  }

  // Méthodes de gestion de la spécificité projet
  public makeProjectSpecific(): void {
    this.data.projectSpecific = true;
    this.updateTimestamp();
  }

  public makeGlobal(): void {
    this.data.projectSpecific = false;
    this.updateTimestamp();
  }

  public toggleProjectSpecific(): void {
    this.data.projectSpecific = !this.data.projectSpecific;
    this.updateTimestamp();
  }

  // Méthodes de validation hiérarchique
  public canBeParentOf(childCode: ActivityCode): boolean {
    // Un code ne peut pas être parent de lui-même
    if (this.id === childCode.id) {
      return false;
    }

    // Un code enfant ne peut pas être parent d'un autre code
    if (this.isChild) {
      return false;
    }

    // Un code ne peut pas être parent de son propre parent
    if (childCode.parentId === this.id) {
      return false;
    }

    return true;
  }

  public canHaveParent(parentCode: ActivityCode): boolean {
    // Un code ne peut pas avoir lui-même comme parent
    if (this.id === parentCode.id) {
      return false;
    }

    // Un code parent ne peut pas avoir un enfant comme parent
    if (parentCode.parentId === this.id) {
      return false;
    }

    // Un code enfant ne peut pas avoir un autre enfant comme parent
    if (parentCode.parentId) {
      return false;
    }

    return true;
  }

  public validateHierarchyConsistency(allCodes: ActivityCode[]): string[] {
    const issues: string[] = [];

    // Vérifier que le parent existe
    if (this.data.parentId) {
      const parent = allCodes.find(code => code.id === this.data.parentId);
      if (!parent) {
        issues.push('Parent activity code not found');
      } else {
        // Vérifier que le parent n'a pas de parent (max 2 niveaux)
        if (parent.parentId) {
          issues.push('Activity code hierarchy cannot exceed 2 levels');
        }

        // Vérifier la cohérence de la hiérarchie
        if (this.data.hierarchy?.level !== 1) {
          issues.push('Child activity code should have level 1');
        }

        if (!this.data.hierarchy?.path.includes(parent.code)) {
          issues.push('Hierarchy path is inconsistent with parent');
        }
      }
    } else {
      // Code parent - vérifier le niveau
      if (this.data.hierarchy?.level !== 0) {
        issues.push('Parent activity code should have level 0');
      }
    }

    return issues;
  }

  // Méthodes de recherche et filtrage
  public matchesSearchTerm(searchTerm: string): boolean {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return true;
    }

    const term = searchTerm.toLowerCase();
    const code = this.data.code.toLowerCase();
    const name = this.data.name.toLowerCase();
    const description = (this.data.description || '').toLowerCase();
    const category = this.data.category.toLowerCase();

    return code.includes(term) || 
           name.includes(term) || 
           description.includes(term) || 
           category.includes(term);
  }

  public isInCategory(category: string): boolean {
    return this.data.category.toLowerCase() === category.toLowerCase();
  }

  public isForTenant(tenantId: string): boolean {
    return this.data.tenantId === tenantId;
  }

  public matchesFilters(filters: {
    category?: string;
    billable?: boolean;
    isActive?: boolean;
    projectSpecific?: boolean;
    hasParent?: boolean;
  }): boolean {
    if (filters.category && !this.isInCategory(filters.category)) {
      return false;
    }

    if (filters.billable !== undefined && this.data.billable !== filters.billable) {
      return false;
    }

    if (filters.isActive !== undefined && this.data.isActive !== filters.isActive) {
      return false;
    }

    if (filters.projectSpecific !== undefined && this.data.projectSpecific !== filters.projectSpecific) {
      return false;
    }

    if (filters.hasParent !== undefined) {
      const hasParent = !!this.data.parentId;
      if (hasParent !== filters.hasParent) {
        return false;
      }
    }

    return true;
  }

  // Méthodes de construction d'arbre
  public static buildTree(activityCodes: ActivityCode[]): ActivityCodeTree[] {
    const tree: ActivityCodeTree[] = [];
    const codeMap = new Map<string, ActivityCode>();
    
    // Créer une map pour un accès rapide
    activityCodes.forEach(code => {
      if (code.id) {
        codeMap.set(code.id, code);
      }
    });

    // Traiter d'abord les codes parents
    const parentCodes = activityCodes.filter(code => !code.parentId);
    
    parentCodes.forEach(parentCode => {
      const treeNode: ActivityCodeTree = {
        id: parentCode.id!,
        code: parentCode.code,
        name: parentCode.name,
        level: 0,
        children: []
      };

      // Trouver les enfants
      const children = activityCodes.filter(code => code.parentId === parentCode.id);
      children.forEach(childCode => {
        treeNode.children.push({
          id: childCode.id!,
          code: childCode.code,
          name: childCode.name,
          level: 1,
          children: []
        });
      });

      tree.push(treeNode);
    });

    return tree;
  }

  public static flattenTree(tree: ActivityCodeTree[]): ActivityCode[] {
    const flattened: ActivityCode[] = [];

    const traverse = (nodes: ActivityCodeTree[], parentId?: string) => {
      nodes.forEach(node => {
        // Créer un ActivityCode à partir du nœud de l'arbre
        // Note: Ceci est une représentation simplifiée
        const activityCode: Partial<ActivityCode> = {
          id: node.id,
          code: node.code,
          name: node.name,
          parentId: parentId,
          hierarchy: {
            level: node.level,
            path: parentId ? `parent/${node.code}` : node.code,
            fullName: node.name
          }
        };

        flattened.push(activityCode as ActivityCode);

        // Traiter les enfants
        if (node.children.length > 0) {
          traverse(node.children, node.id);
        }
      });
    };

    traverse(tree);
    return flattened;
  }

  // Méthodes de mise à jour
  public updateFromInput(input: Partial<ActivityCodeInput>): void {
    const updates: Partial<ActivityCode> = {};

    if (input.code !== undefined) {
      updates.code = input.code.trim().toUpperCase();
    }

    if (input.name !== undefined) {
      updates.name = input.name.trim();
    }

    if (input.description !== undefined) {
      updates.description = input.description?.trim();
    }

    if (input.category !== undefined) {
      updates.category = input.category.trim();
    }

    if (input.parentId !== undefined) {
      updates.parentId = input.parentId;
    }

    if (input.billable !== undefined) {
      updates.billable = input.billable;
      // Si devient non facturable, supprimer le taux
      if (!input.billable) {
        updates.defaultRate = undefined;
      }
    }

    if (input.defaultRate !== undefined) {
      if (!this.data.billable && !input.billable) {
        throw new ValidationError('Cannot set rate for non-billable activity code');
      }
      updates.defaultRate = input.defaultRate;
    }

    if (input.isActive !== undefined) {
      updates.isActive = input.isActive;
    }

    if (input.projectSpecific !== undefined) {
      updates.projectSpecific = input.projectSpecific;
    }

    // Appliquer les mises à jour
    this.update(updates);

    // Mettre à jour la hiérarchie si le code ou le nom a changé
    if (input.code !== undefined || input.name !== undefined) {
      this.resetHierarchy();
    }
  }

  // Méthodes utilitaires
  public getActivityInfo(): {
    activityCode: ActivityCode;
    isParent: boolean;
    isChild: boolean;
    hasDefaultRate: boolean;
    hierarchyLevel: number;
  } {
    return {
      activityCode: this.getData(),
      isParent: this.isParent,
      isChild: this.isChild,
      hasDefaultRate: this.hasDefaultRate(),
      hierarchyLevel: this.level
    };
  }

  public getDisplayName(): string {
    return `${this.data.code} - ${this.data.name}`;
  }

  public getFullDisplayName(): string {
    return this.data.hierarchy?.fullName || this.getDisplayName();
  }

  public getCategoryDisplayName(): string {
    return `[${this.data.category}] ${this.getDisplayName()}`;
  }

  // Méthodes de comparaison
  public isSimilarTo(other: ActivityCode): boolean {
    return this.data.code === other.code || 
           this.data.name.toLowerCase() === other.name.toLowerCase();
  }

  public belongsToSameCategory(other: ActivityCode): boolean {
    return this.data.category.toLowerCase() === other.category.toLowerCase();
  }

  public hasSameParent(other: ActivityCode): boolean {
    return this.data.parentId === other.parentId;
  }

  // Validation complète
  public async validate(): Promise<boolean> {
    try {
      // Validation des champs requis
      BaseModel.validateRequired(this.data, [
        'tenantId',
        'code',
        'name',
        'category',
        'billable',
        'isActive',
        'projectSpecific'
      ]);

      // Validation du code
      if (!this.data.code || this.data.code.trim().length === 0) {
        throw new ValidationError('Activity code is required');
      }

      if (this.data.code.length > 20) {
        throw new ValidationError('Activity code cannot exceed 20 characters');
      }

      // Validation du format du code (alphanumérique avec tirets et underscores)
      if (!/^[A-Z0-9_-]+$/.test(this.data.code)) {
        throw new ValidationError('Activity code must contain only uppercase letters, numbers, hyphens, and underscores');
      }

      // Validation du nom
      if (!this.data.name || this.data.name.trim().length === 0) {
        throw new ValidationError('Activity name is required');
      }

      if (this.data.name.length > 100) {
        throw new ValidationError('Activity name cannot exceed 100 characters');
      }

      // Validation de la description
      if (this.data.description && this.data.description.length > 500) {
        throw new ValidationError('Activity description cannot exceed 500 characters');
      }

      // Validation de la catégorie
      if (!this.data.category || this.data.category.trim().length === 0) {
        throw new ValidationError('Activity category is required');
      }

      if (this.data.category.length > 50) {
        throw new ValidationError('Activity category cannot exceed 50 characters');
      }

      // Validation du taux par défaut
      if (this.data.defaultRate !== undefined) {
        if (this.data.defaultRate < 0) {
          throw new ValidationError('Default rate cannot be negative');
        }

        if (!this.data.billable) {
          throw new ValidationError('Non-billable activity codes cannot have a default rate');
        }
      }

      // Validation de la hiérarchie
      if (this.data.hierarchy) {
        if (this.data.hierarchy.level < 0 || this.data.hierarchy.level > 1) {
          throw new ValidationError('Activity code hierarchy level must be 0 or 1');
        }

        if (!this.data.hierarchy.path || this.data.hierarchy.path.trim().length === 0) {
          throw new ValidationError('Hierarchy path is required');
        }

        if (!this.data.hierarchy.fullName || this.data.hierarchy.fullName.trim().length === 0) {
          throw new ValidationError('Hierarchy full name is required');
        }
      }

      // Validation de cohérence parent/enfant
      if (this.data.parentId) {
        if (this.data.parentId === this.id) {
          throw new ValidationError('Activity code cannot be its own parent');
        }

        if (this.data.hierarchy?.level !== 1) {
          throw new ValidationError('Child activity code must have hierarchy level 1');
        }
      } else {
        if (this.data.hierarchy?.level !== 0) {
          throw new ValidationError('Parent activity code must have hierarchy level 0');
        }
      }

      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(`Activity code validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Conversion vers Firestore
  public toFirestore(): DocumentData {
    const data = {
      tenantId: this.data.tenantId,
      code: this.data.code,
      name: this.data.name,
      description: this.data.description || null,
      category: this.data.category,
      parentId: this.data.parentId || null,
      billable: this.data.billable,
      defaultRate: this.data.defaultRate || null,
      isActive: this.data.isActive,
      projectSpecific: this.data.projectSpecific,
      hierarchy: this.data.hierarchy || {
        level: 0,
        path: this.data.code,
        fullName: this.data.name
      },
      createdAt: this.data.createdAt,
      updatedAt: this.data.updatedAt
    };

    return this.convertDatesToFirestore(data);
  }

  // Création depuis Firestore
  public static fromFirestore(doc: DocumentSnapshot): ActivityCodeModel | null {
    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    if (!data) {
      return null;
    }

    const convertedData = {
      id: doc.id,
      ...data
    };

    // Conversion des timestamps Firestore en dates
    const activityCodeData = new ActivityCodeModel({}).convertDatesFromFirestore(convertedData) as ActivityCode;

    return new ActivityCodeModel(activityCodeData);
  }

  // Méthodes de détection d'anomalies
  public detectAnomalies(): string[] {
    const anomalies: string[] = [];

    // Code très court
    if (this.data.code.length < 2) {
      anomalies.push('very_short_code');
    }

    // Nom très court
    if (this.data.name.length < 3) {
      anomalies.push('very_short_name');
    }

    // Taux très élevé
    if (this.data.defaultRate && this.data.defaultRate > 500) {
      anomalies.push('very_high_rate');
    }

    // Taux très bas
    if (this.data.defaultRate && this.data.defaultRate < 5) {
      anomalies.push('very_low_rate');
    }

    // Code facturable sans taux
    if (this.data.billable && !this.data.defaultRate) {
      anomalies.push('billable_without_rate');
    }

    // Code inactif mais spécifique au projet
    if (!this.data.isActive && this.data.projectSpecific) {
      anomalies.push('inactive_project_specific');
    }

    // Hiérarchie incohérente
    if (this.data.parentId && this.data.hierarchy?.level !== 1) {
      anomalies.push('inconsistent_hierarchy_level');
    }

    if (!this.data.parentId && this.data.hierarchy?.level !== 0) {
      anomalies.push('inconsistent_parent_level');
    }

    return anomalies;
  }

  // Méthode pour l'API
  public toAPI(): any {
    const apiData = super.toAPI();
    const anomalies = this.detectAnomalies();
    const activityInfo = this.getActivityInfo();

    return {
      ...apiData,
      displayName: this.getDisplayName(),
      fullDisplayName: this.getFullDisplayName(),
      categoryDisplayName: this.getCategoryDisplayName(),
      isParent: activityInfo.isParent,
      isChild: activityInfo.isChild,
      hasDefaultRate: activityInfo.hasDefaultRate,
      hierarchyLevel: activityInfo.hierarchyLevel,
      anomalies,
      hasAnomalies: anomalies.length > 0
    };
  }
}