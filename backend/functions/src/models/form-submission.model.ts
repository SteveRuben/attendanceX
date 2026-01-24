import { DocumentSnapshot } from "firebase-admin/firestore";
import { BaseModel } from "./base.model";
import { FormSubmission, FormSubmissionStatus } from "../common/types/form-builder.types";

export interface FormSubmissionDocument extends FormSubmission {
  // Additional internal fields if needed
  processingAttempts?: number;
  lastProcessedAt?: Date;
  processingErrors?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFormSubmissionRequest {
  formId: string;
  tenantId: string;
  eventId?: string;
  submittedBy?: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

export class FormSubmissionModel extends BaseModel<FormSubmissionDocument> {
  constructor(data: Partial<FormSubmissionDocument>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const submission = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(submission, [
      "formId", "tenantId", "submittedAt", "data", "status"
    ]);

    // Validation du statut
    if (!Object.values(FormSubmissionStatus).includes(submission.status)) {
      throw new Error("Invalid form submission status");
    }

    // Validation des données
    if (!submission.data || typeof submission.data !== 'object') {
      throw new Error("Form data must be a valid object");
    }

    // Validation de la date de soumission
    if (!(submission.submittedAt instanceof Date)) {
      throw new Error("Invalid submission date");
    }

    return true;
  }

  toFirestore() {
    const { id, ...data } = this.data;
    const cleanedData = FormSubmissionModel.removeUndefinedFields(data);
    return this.convertDatesToFirestore(cleanedData);
  }

  public toAPI(): Partial<FormSubmissionDocument> {
    const data = this.data as any;
    const cleaned = { ...data };
    
    // Supprimer les champs internes sensibles
    delete cleaned.processingAttempts;
    delete cleaned.lastProcessedAt;
    delete cleaned.processingErrors;
    
    return cleaned;
  }

  static fromFirestore(doc: DocumentSnapshot): FormSubmissionModel | null {
    if (!doc.exists) {return null;}

    const data = doc.data()!;
    const convertedData = FormSubmissionModel.prototype.convertDatesFromFirestore(data);

    return new FormSubmissionModel({
      id: doc.id,
      ...convertedData,
    });
  }

  static fromCreateRequest(request: CreateFormSubmissionRequest): FormSubmissionModel {
    const submissionData = {
      ...request,
      submittedAt: new Date(),
      status: FormSubmissionStatus.PENDING,
      processingAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return new FormSubmissionModel(submissionData);
  }

  // Marquer comme traité
  markAsProcessed(): void {
    this.update({
      status: FormSubmissionStatus.PROCESSED,
      lastProcessedAt: new Date(),
      updatedAt: new Date()
    });
  }

  // Marquer comme échoué
  markAsFailed(error: string): void {
    const attempts = (this.data.processingAttempts || 0) + 1;
    const errors = [...(this.data.processingErrors || []), error];

    this.update({
      status: FormSubmissionStatus.FAILED,
      processingAttempts: attempts,
      processingErrors: errors,
      lastProcessedAt: new Date(),
      updatedAt: new Date()
    });
  }

  // Incrémenter les tentatives de traitement
  incrementProcessingAttempts(): void {
    this.update({
      processingAttempts: (this.data.processingAttempts || 0) + 1,
      lastProcessedAt: new Date(),
      updatedAt: new Date()
    });
  }

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