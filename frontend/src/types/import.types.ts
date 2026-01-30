/**
 * Types pour l'import de données - Frontend
 */

export interface ImportData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role?: string;
  department?: string;
  skills?: string[];
  notes?: string;
  metadata?: Record<string, any>;
}

export enum ImportType {
  VOLUNTEERS = 'volunteers',
  PARTICIPANTS = 'participants',
  USERS = 'users',
  EVENTS = 'events',
  ATTENDANCES = 'attendances',
  TICKETS = 'tickets'
}

export enum ImportStatus {
  IDLE = 'idle',
  UPLOADING = 'uploading',
  VALIDATING = 'validating',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export interface ImportOptions {
  skipDuplicates?: boolean;
  updateExisting?: boolean;
  sendInvitations?: boolean;
  defaultRole?: string;
  eventId?: string;
  createTickets?: boolean;
}

export interface ImportResult {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  errors: ImportError[];
  createdUsers: ImportedUser[];
  updatedUsers: ImportedUser[];
  skippedUsers: ImportedUser[];
  status: ImportStatus;
  processedCount: number;
  message?: string;
}

export interface ImportError {
  row: number;
  email: string;
  error: string;
  data: ImportData;
}

export interface ImportedUser {
  id: string;
  email: string;
  name: string;
  action: 'created' | 'updated' | 'skipped';
  ticketId?: string;
}

export interface ImportValidationResult {
  isValid: boolean;
  errors: ImportValidationError[];
  warnings: ImportValidationWarning[];
  duplicates: ImportDuplicate[];
  validRows: number;
  totalRows: number;
}

export interface ImportValidationError {
  row: number;
  field: string;
  value: string;
  message: string;
}

export interface ImportValidationWarning {
  row: number;
  field: string;
  value: string;
  message: string;
}

export interface ImportDuplicate {
  row: number;
  email: string;
  existingUserId?: string;
  action: 'skip' | 'update' | 'create_new';
}

export interface BulkImportRequest {
  csvData: string;
  type: ImportType;
  options: ImportOptions;
  mapping?: FieldMapping;
}

export interface FieldMapping {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role?: string;
  department?: string;
  skills?: string;
  notes?: string;
}

export interface ImportPreview {
  headers: string[];
  rows: string[][];
  mapping: FieldMapping;
  validation: ImportValidationResult;
}

export interface ImportTemplate {
  headers: string[];
  example: string[];
  csvTemplate: string;
}