// shared/src/constants/file-types.ts
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
] as const;

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv'
] as const;

export const ALLOWED_ARCHIVE_TYPES = [
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/x-7z-compressed'
] as const;

export const FILE_EXTENSIONS = {
  // Images
  JPEG: '.jpeg',
  JPG: '.jpg',
  PNG: '.png',
  GIF: '.gif',
  WEBP: '.webp',
  SVG: '.svg',
  
  // Documents
  PDF: '.pdf',
  DOC: '.doc',
  DOCX: '.docx',
  XLS: '.xls',
  XLSX: '.xlsx',
  PPT: '.ppt',
  PPTX: '.pptx',
  TXT: '.txt',
  CSV: '.csv',
  
  // Archives
  ZIP: '.zip',
  RAR: '.rar',
  SEVEN_Z: '.7z'
} as const;

export const FILE_SIZE_LIMITS = {
  AVATAR: 2 * 1024 * 1024, // 2MB
  IMAGE: 5 * 1024 * 1024, // 5MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
  ARCHIVE: 50 * 1024 * 1024, // 50MB
  REPORT: 25 * 1024 * 1024, // 25MB
  IMPORT: 20 * 1024 * 1024 // 20MB
} as const;

export const FILE_CATEGORIES = {
  IMAGE: 'IMAGE',
  DOCUMENT: 'DOCUMENT',
  ARCHIVE: 'ARCHIVE',
  REPORT: 'REPORT',
  EXPORT: 'EXPORT',
  AVATAR: 'AVATAR'
} as const;

export const MIME_TYPE_LABELS = {
  'image/jpeg': 'Image JPEG',
  'image/jpg': 'Image JPG',
  'image/png': 'Image PNG',
  'image/gif': 'Image GIF',
  'image/webp': 'Image WebP',
  'image/svg+xml': 'Image SVG',
  'application/pdf': 'Document PDF',
  'application/msword': 'Document Word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Document Word',
  'application/vnd.ms-excel': 'Feuille Excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Feuille Excel',
  'application/vnd.ms-powerpoint': 'Présentation PowerPoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'Présentation PowerPoint',
  'text/plain': 'Fichier texte',
  'text/csv': 'Fichier CSV',
  'application/zip': 'Archive ZIP',
  'application/x-zip-compressed': 'Archive ZIP',
  'application/x-rar-compressed': 'Archive RAR',
  'application/x-7z-compressed': 'Archive 7Z'
} as const;

// Catégorisation par type MIME
export const MIME_TYPE_CATEGORIES = {
  [FILE_CATEGORIES.IMAGE]: ALLOWED_IMAGE_TYPES,
  [FILE_CATEGORIES.DOCUMENT]: ALLOWED_DOCUMENT_TYPES,
  [FILE_CATEGORIES.ARCHIVE]: ALLOWED_ARCHIVE_TYPES
} as const;