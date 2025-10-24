// shared/types/api.types.ts

import { ApiResponse, PaginationParams } from "./common.types";

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  path: string;
  method: string;
}

export interface ApiValidationError extends ApiError {
  errors: Record<string, string[]>;
}

export interface ApiMetadata {
  version: string;
  timestamp: string;
  requestId: string;
  executionTime: number;
}

export interface ApiResponseWithMeta<T = any> extends ApiResponse<T> {
  meta: ApiMetadata;
}

export interface BulkOperation<T> {
  items: T[];
  operation: 'create' | 'update' | 'delete';
}

export interface BulkResponse<T> {
  success: boolean;
  results: {
    success: T[];
    failed: {
      item: T;
      error: string;
    }[];
  };
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

export interface FilterOptions {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith';
  value: any;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface QueryOptions {
  filters?: FilterOptions[];
  sort?: SortOptions[];
  pagination?: PaginationParams;
  include?: string[];
  exclude?: string[];
}