export interface BaseEntity {
  id?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface Address {
  street?: string;
  city: string;
  state?: string;
  zipCode?: string;
  country: string;
  coordinates?: GeoPoint;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
  timestamp?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SearchParams {
  query: string;
  filters?: Record<string, any>;
  limit?: number;
}

export interface FileUpload {
  // @ts-ignore
  file: File;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadPath: string;
}

export interface AuditLog {
  action: string;
  performedBy: string;
  performedAt: Date;
  oldValue?: any;
  newValue?: any;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}