import { DocumentSnapshot } from "firebase-admin/firestore";
import { BaseModel } from "./base.model";
import { 
  ImportResult,
  ImportType,
  ImportOptions,
  ImportData
} from "../common/types/import.types";
import { ValidationError } from "../utils/common/errors";

export interface ImportJobDocument {
  id: string;
  tenantId: string;
  type: ImportType;
  status: ImportJobStatus;
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  errors: ImportJobError[];
  options: ImportOptions;
  createdBy: string;
  startedAt: Date;
  completedAt?: Date;
  result?: ImportResult;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export enum ImportJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface ImportJobError {
  row: number;
  email: string;
  error: string;
  data: ImportData;
}

export interface CreateImportJobRequest {
  type: ImportType;
  totalRows: number;
  options: ImportOptions;
  metadata?: Record<string, any>;
}

export class ImportModel extends BaseModel<ImportJobDocument> {
  constructor(data: Partial<ImportJobDocument>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const importJob = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(importJob, [
      "tenantId", "type", "status", "totalRows", "createdBy"
    ]);

    // Validation du type d'import
    if (!Object.values(ImportType).includes(importJob.type)) {
      throw new ValidationError("Invalid import type");
    }

    // Validation du statut
    if (!Object.values(ImportJobStatus).includes(importJob.status)) {
      throw new ValidationError("Invalid import status");
    }

    // Validation des nombres
    if (importJob.totalRows < 0) {
      throw new ValidationError("Total rows must be non-negative");
    }

    if (importJob.processedRows < 0 || importJob.processedRows > importJob.totalRows) {
      throw new ValidationError("Processed rows must be between 0 and total rows");
    }

    if (importJob.successCount < 0) {
      throw new ValidationError("Success count must be non-negative");
    }

    if (importJob.errorCount < 0) {
      throw new ValidationError("Error count must be non-negative");
    }

    if (importJob.skippedCount < 0) {
      throw new ValidationError("Skipped count must be non-negative");
    }

    // Validation des dates
    if (importJob.completedAt && importJob.startedAt && importJob.completedAt < importJob.startedAt) {
      throw new ValidationError("Completed date cannot be before started date");
    }

    return true;
  }

  toFirestore() {
    const { id, ...data } = this.data;
    const cleanedData = ImportModel.removeUndefinedFields(data);
    return this.convertDatesToFirestore(cleanedData);
  }

  // Sérialisation sécurisée pour API
  public toAPI(): Partial<ImportJobDocument> {
    const data = this.data as any;
    const cleaned = { ...data };
    
    // Pas de champs sensibles à supprimer pour les jobs d'import
    return cleaned;
  }

  static fromFirestore(doc: DocumentSnapshot): ImportModel | null {
    if (!doc.exists) {return null;}

    const data = doc.data()!;
    const convertedData = ImportModel.prototype.convertDatesFromFirestore(data);

    return new ImportModel({
      id: doc.id,
      ...convertedData,
    });
  }

  static fromCreateRequest(
    request: CreateImportJobRequest & { 
      tenantId: string; 
      createdBy: string;
    }
  ): ImportModel {
    const now = new Date();
    
    const importJobData: Partial<ImportJobDocument> = {
      tenantId: request.tenantId,
      type: request.type,
      status: ImportJobStatus.PENDING,
      totalRows: request.totalRows,
      processedRows: 0,
      successCount: 0,
      errorCount: 0,
      skippedCount: 0,
      errors: [],
      options: request.options,
      createdBy: request.createdBy,
      startedAt: now,
      metadata: request.metadata || {},
      createdAt: now,
      updatedAt: now
    };

    return new ImportModel(importJobData);
  }

  // Méthodes d'instance pour les opérations sur le job d'import
  
  // Getter methods for safe data access
  public getTenantId(): string {
    return this.data.tenantId;
  }

  public getStatus(): ImportJobStatus {
    return this.data.status;
  }

  public setStatus(status: ImportJobStatus): void {
    this.data.status = status;
    this.data.updatedAt = new Date();
  }

  public setCompletedAt(date: Date): void {
    this.data.completedAt = date;
    this.data.updatedAt = new Date();
  }

  public markAsProcessing(): void {
    this.data.status = ImportJobStatus.PROCESSING;
    this.data.startedAt = new Date();
    this.data.updatedAt = new Date();
  }

  public markAsCompleted(result: ImportResult): void {
    this.data.status = ImportJobStatus.COMPLETED;
    this.data.completedAt = new Date();
    this.data.result = result;
    this.data.processedRows = result.totalProcessed;
    this.data.successCount = result.successCount;
    this.data.errorCount = result.errorCount;
    this.data.skippedCount = result.skippedCount;
    this.data.errors = result.errors;
    this.data.updatedAt = new Date();
  }

  public markAsFailed(error: string): void {
    this.data.status = ImportJobStatus.FAILED;
    this.data.completedAt = new Date();
    this.data.errors = [{
      row: 0,
      email: '',
      error,
      data: {} as ImportData
    }];
    this.data.updatedAt = new Date();
  }

  public markAsCancelled(): void {
    this.data.status = ImportJobStatus.CANCELLED;
    this.data.completedAt = new Date();
    this.data.updatedAt = new Date();
  }

  public updateProgress(processedRows: number, successCount: number, errorCount: number, skippedCount: number): void {
    this.data.processedRows = processedRows;
    this.data.successCount = successCount;
    this.data.errorCount = errorCount;
    this.data.skippedCount = skippedCount;
    this.data.updatedAt = new Date();
  }

  public isCompleted(): boolean {
    return this.data.status === ImportJobStatus.COMPLETED;
  }

  public isFailed(): boolean {
    return this.data.status === ImportJobStatus.FAILED;
  }

  public isProcessing(): boolean {
    return this.data.status === ImportJobStatus.PROCESSING;
  }

  // Utilitaire pour nettoyer les champs undefined récursivement
  public static removeUndefinedFields(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefinedFields(item));
    }

    if (typeof obj === 'object') {
      const cleaned: any = {};
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        if (value !== undefined) {
          cleaned[key] = this.removeUndefinedFields(value);
        }
      });
      return cleaned;
    }

    return obj;
  }
}