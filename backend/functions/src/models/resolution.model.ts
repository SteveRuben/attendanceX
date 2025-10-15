import { DocumentSnapshot } from "firebase-admin/firestore";
import { BaseModel } from "./base.model";

/**
 * Énumérations pour les résolutions
 */
export enum ResolutionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress', 
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum ResolutionPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * Interface pour les résolutions de réunion
 */
export interface Resolution {
  id?: string;
  eventId: string;
  title: string;
  description: string;
  assignedTo: string[]; // IDs des utilisateurs assignés
  assignedToNames?: string[]; // Noms des utilisateurs (pour affichage)
  createdBy: string;
  createdByName?: string;
  dueDate?: Date;
  status: ResolutionStatus;
  priority: ResolutionPriority;
  tags?: string[];
  attachments?: string[]; // URLs des fichiers attachés
  comments?: ResolutionComment[];
  progress?: number; // Pourcentage de completion (0-100)
  estimatedHours?: number;
  actualHours?: number;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface pour les commentaires sur les résolutions
 */
export interface ResolutionComment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Date;
}

/**
 * Interface pour créer une résolution
 */
export interface CreateResolutionRequest {
  eventId: string;
  title: string;
  description: string;
  assignedTo: string[];
  dueDate?: Date;
  priority?: ResolutionPriority;
  tags?: string[];
  estimatedHours?: number;
}

/**
 * Interface pour mettre à jour une résolution
 */
export interface UpdateResolutionRequest {
  title?: string;
  description?: string;
  assignedTo?: string[];
  dueDate?: Date;
  status?: ResolutionStatus;
  priority?: ResolutionPriority;
  tags?: string[];
  progress?: number;
  actualHours?: number;
}

/**
 * Modèle de données pour les résolutions de réunion
 */
export class ResolutionModel extends BaseModel<Resolution> {
  constructor(data: Partial<Resolution>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const resolution = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(resolution, [
      "eventId", "title", "description", "assignedTo", 
      "createdBy", "status", "priority", "tenantId"
    ]);

    // Validation des énumérations
    BaseModel.validateEnum(resolution.status, ResolutionStatus, "status");
    BaseModel.validateEnum(resolution.priority, ResolutionPriority, "priority");

    // Validation des longueurs
    this.validateLength(resolution.title, 3, 200, "title");
    this.validateLength(resolution.description, 10, 2000, "description");

    // Validation des assignés
    if (!Array.isArray(resolution.assignedTo) || resolution.assignedTo.length === 0) {
      throw new Error("At least one assignee is required");
    }

    // Validation de la date d'échéance
    if (resolution.dueDate && resolution.dueDate <= new Date()) {
      throw new Error("Due date must be in the future");
    }

    // Validation du progrès
    if (resolution.progress !== undefined) {
      if (resolution.progress < 0 || resolution.progress > 100) {
        throw new Error("Progress must be between 0 and 100");
      }
    }

    // Validation des heures
    if (resolution.estimatedHours !== undefined && resolution.estimatedHours < 0) {
      throw new Error("Estimated hours must be positive");
    }

    if (resolution.actualHours !== undefined && resolution.actualHours < 0) {
      throw new Error("Actual hours must be positive");
    }

    return true;
  }

  toFirestore() {
    const { id, ...data } = this.data;
    return this.convertDatesToFirestore(data);
  }

  static fromFirestore(doc: DocumentSnapshot): ResolutionModel | null {
    if (!doc.exists) return null;

    const data = doc.data()!;
    const convertedData = ResolutionModel.prototype.convertDatesFromFirestore(data);

    return new ResolutionModel({
      id: doc.id,
      ...convertedData,
    });
  }

  static fromCreateRequest(
    request: CreateResolutionRequest, 
    createdBy: string, 
    tenantId: string
  ): ResolutionModel {
    return new ResolutionModel({
      ...request,
      createdBy,
      tenantId,
      status: ResolutionStatus.PENDING,
      priority: request.priority || ResolutionPriority.MEDIUM,
      progress: 0,
      comments: [],
      tags: request.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Méthodes d'instance
  isOverdue(): boolean {
    if (!this.data.dueDate) return false;
    return this.data.dueDate < new Date() && this.data.status !== ResolutionStatus.COMPLETED;
  }

  isDueSoon(hoursThreshold: number = 24): boolean {
    if (!this.data.dueDate) return false;
    const threshold = new Date(Date.now() + hoursThreshold * 60 * 60 * 1000);
    return this.data.dueDate <= threshold && this.data.status !== ResolutionStatus.COMPLETED;
  }

  isAssignedTo(userId: string): boolean {
    return this.data.assignedTo.includes(userId);
  }

  canEdit(userId: string): boolean {
    return this.data.createdBy === userId || this.isAssignedTo(userId);
  }

  addAssignee(userId: string): void {
    if (!this.data.assignedTo.includes(userId)) {
      this.data.assignedTo.push(userId);
      this.data.updatedAt = new Date();
    }
  }

  removeAssignee(userId: string): void {
    const index = this.data.assignedTo.indexOf(userId);
    if (index !== -1) {
      this.data.assignedTo.splice(index, 1);
      this.data.updatedAt = new Date();
    }
  }

  updateStatus(newStatus: ResolutionStatus, updatedBy: string): void {
    //@ts-ignore
    const oldStatus = this.data.status;
    
    // Auto-update progress based on status
    if (newStatus === ResolutionStatus.COMPLETED) {
      this.data.progress = 100;
    } else if (newStatus === ResolutionStatus.IN_PROGRESS && (this.data.progress || 0) === 0) {
      this.data.progress = 10; // Start with 10% when moving to in progress
    }

    this.data.status = newStatus;
    this.data.updatedAt = new Date();
  }

  updateProgress(progress: number, updatedBy: string): void {
    //@ts-ignore
    const oldProgress = this.data.progress || 0;
    
    // Auto-update status based on progress
    if (progress === 100 && this.data.status !== ResolutionStatus.COMPLETED) {
      this.data.status = ResolutionStatus.COMPLETED;
    } else if (progress > 0 && this.data.status === ResolutionStatus.PENDING) {
      this.data.status = ResolutionStatus.IN_PROGRESS;
    }

    this.data.progress = progress;
    this.data.updatedAt = new Date();
  }

  addComment(authorId: string, authorName: string, content: string): void {
    const comment: ResolutionComment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      authorId,
      authorName,
      content,
      createdAt: new Date(),
    };

    if (!this.data.comments) {
      this.data.comments = [];
    }

    this.data.comments.push(comment);
    this.data.updatedAt = new Date();
  }

  getTimeRemaining(): { days: number; hours: number; isOverdue: boolean } | null {
    if (!this.data.dueDate) return null;

    const now = new Date();
    const diff = this.data.dueDate.getTime() - now.getTime();
    
    if (diff < 0) {
      const overdueDiff = Math.abs(diff);
      return {
        days: Math.floor(overdueDiff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((overdueDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        isOverdue: true,
      };
    }

    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      isOverdue: false,
    };
  }

  getCompletionRate(): number {
    return this.data.progress || 0;
  }

  getEfficiencyRate(): number | null {
    if (!this.data.estimatedHours || !this.data.actualHours) return null;
    return (this.data.estimatedHours / this.data.actualHours) * 100;
  }

}