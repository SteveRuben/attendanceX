/**
 * Catégories de fichiers supportées
 */
export enum FileCategory {
  PROFILE_PICTURE = 'profile_picture',
  EVENT_ATTACHMENT = 'event_attachment',
  REPORT = 'report',
  NOTIFICATION_ATTACHMENT = 'notification_attachment',
  QR_CODE = 'qr_code',
  DOCUMENT = 'document',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  ARCHIVE = 'archive',
  BACKUP = 'backup',
  TEMPLATE = 'template',
  LOGO = 'logo',
  CERTIFICATE = 'certificate',
  SIGNATURE = 'signature',
  OTHER = 'other'
}

/**
 * Types MIME supportés par catégorie
 */
export const SUPPORTED_MIME_TYPES: Record<FileCategory, string[]> = {
  [FileCategory.PROFILE_PICTURE]: [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif'
  ],
  [FileCategory.EVENT_ATTACHMENT]: [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv'
  ],
  [FileCategory.REPORT]: [
    'application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv', 'application/json', 'text/html'
  ],
  [FileCategory.NOTIFICATION_ATTACHMENT]: [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf', 'text/plain'
  ],
  [FileCategory.QR_CODE]: [
    'image/png', 'image/jpeg', 'image/svg+xml'
  ],
  [FileCategory.DOCUMENT]: [
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv', 'application/rtf'
  ],
  [FileCategory.IMAGE]: [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 
    'image/svg+xml', 'image/bmp', 'image/tiff'
  ],
  [FileCategory.VIDEO]: [
    'video/mp4', 'video/webm', 'video/ogg', 'video/avi', 
    'video/mov', 'video/wmv'
  ],
  [FileCategory.AUDIO]: [
    'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 
    'audio/aac', 'audio/flac'
  ],
  [FileCategory.ARCHIVE]: [
    'application/zip', 'application/x-rar-compressed',
    'application/x-tar', 'application/gzip', 'application/x-7z-compressed'
  ],
  [FileCategory.BACKUP]: [
    'application/json', 'application/x-sql', 'application/octet-stream'
  ],
  [FileCategory.TEMPLATE]: [
    'text/html', 'application/json', 'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  [FileCategory.LOGO]: [
    'image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'
  ],
  [FileCategory.CERTIFICATE]: [
    'application/pdf', 'image/png', 'image/jpeg'
  ],
  [FileCategory.SIGNATURE]: [
    'image/png', 'image/jpeg', 'image/svg+xml'
  ],
  [FileCategory.OTHER]: [
    '*/*'
  ]
};

/**
 * Tailles maximales par catégorie (en bytes)
 */
export const MAX_FILE_SIZES: Record<FileCategory, number> = {
  [FileCategory.PROFILE_PICTURE]: 5 * 1024 * 1024, // 5 MB
  [FileCategory.EVENT_ATTACHMENT]: 25 * 1024 * 1024, // 25 MB
  [FileCategory.REPORT]: 100 * 1024 * 1024, // 100 MB
  [FileCategory.NOTIFICATION_ATTACHMENT]: 10 * 1024 * 1024, // 10 MB
  [FileCategory.QR_CODE]: 1 * 1024 * 1024, // 1 MB
  [FileCategory.DOCUMENT]: 50 * 1024 * 1024, // 50 MB
  [FileCategory.IMAGE]: 20 * 1024 * 1024, // 20 MB
  [FileCategory.VIDEO]: 500 * 1024 * 1024, // 500 MB
  [FileCategory.AUDIO]: 100 * 1024 * 1024, // 100 MB
  [FileCategory.ARCHIVE]: 200 * 1024 * 1024, // 200 MB
  [FileCategory.BACKUP]: 1024 * 1024 * 1024, // 1 GB
  [FileCategory.TEMPLATE]: 5 * 1024 * 1024, // 5 MB
  [FileCategory.LOGO]: 2 * 1024 * 1024, // 2 MB
  [FileCategory.CERTIFICATE]: 10 * 1024 * 1024, // 10 MB
  [FileCategory.SIGNATURE]: 1 * 1024 * 1024, // 1 MB
  [FileCategory.OTHER]: 100 * 1024 * 1024, // 100 MB
};

/**
 * Status de traitement des fichiers
 */
export enum FileStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  READY = 'ready',
  ERROR = 'error',
  DELETED = 'deleted',
  ARCHIVED = 'archived'
}

/**
 * Niveaux de sécurité des fichiers
 */
export enum FileSecurityLevel {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted'
}

/**
 * Métadonnées d'un fichier
 */
export interface FileMetadata {
  id: string;
  fileName: string;
  originalFileName: string;
  category: FileCategory;
  mimeType: string;
  size: number;
  
  // Stockage
  path: string;
  url?: string;
  downloadUrl?: string;
  extractedText?: string;
  thumbnails?: string[];
  
  // Sécurité
  securityLevel: FileSecurityLevel;
  isPublic: boolean;
  encryption?: {
    algorithm: string;
    keyId: string;
    iv?: string;
  };
  
  // Ownership et permissions
  uploadedBy: string;
  organizationId: string;
  ownerId?: string;
  accessPermissions: FileAccessPermission[];
  
  // Métadonnées spécifiques
  tags: string[];
  description?: string;
  version: number;
  previousVersionId?: string;
  
  // Traitement
  status: FileStatus;
  processingInfo?: FileProcessingInfo;
  
  // Analytics
  downloadCount: number;
  lastDownloadAt?: Date;
  viewCount: number;
  lastViewAt?: Date;
  
  // Metadata technique
  hash: string; // SHA-256
  checksum?: string;
  exifData?: Record<string, any>;
  
  // Dates
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  metadata?: {
    [key: string]: any;
  }
}

/**
 * Permissions d'accès aux fichiers
 */
export interface FileAccessPermission {
  type: 'user' | 'role' | 'department' | 'organization';
  targetId: string;
  permissions: FilePermission[];
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
}

/**
 * Types de permissions sur les fichiers
 */
export enum FilePermission {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  SHARE = 'share',
  DOWNLOAD = 'download'
}

/**
 * Informations de traitement des fichiers
 */
export interface FileProcessingInfo {
  startedAt: Date;
  completedAt?: Date;
  steps: FileProcessingStep[];
  error?: string;
  warnings: string[];
}

/**
 * Étapes de traitement des fichiers
 */
export interface FileProcessingStep {
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  details?: Record<string, any>;
  error?: string;
}

/**
 * Configuration d'upload de fichier
 */
export interface FileUploadConfig {
  category: FileCategory;
  maxSize?: number;
  allowedMimeTypes?: string[];
  securityLevel?: FileSecurityLevel;
  generateThumbnail?: boolean;
  processImmediately?: boolean;
  tags?: string[];
  description?: string;
  expiresAfterDays?: number;
}

/**
 * Résultat d'upload de fichier
 */
export interface FileUploadResult {
  success: boolean;
  file?: FileMetadata;
  error?: string;
  uploadId: string;
  processingRequired: boolean;
}

/**
 * Filtre de recherche de fichiers
 */
export interface FileSearchFilter {
  category?: FileCategory;
  mimeType?: string;
  tags?: string[];
  uploadedBy?: string;
  ownerId?: string;
  status?: FileStatus;
  securityLevel?: FileSecurityLevel;
  dateRange?: {
    start: Date;
    end: Date;
  };
  sizeRange?: {
    min: number;
    max: number;
  };
  search?: string; // Recherche dans le nom et description
}