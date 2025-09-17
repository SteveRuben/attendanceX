/**
 * Service de base avec fonctionnalités communes
 */

import { apiService, type ApiResponse, type PaginatedResponse } from '../api';

export interface BaseFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  filters?: Record<string, any>;
  includeCharts?: boolean;
  language?: 'fr' | 'en';
}

export abstract class BaseService {
  protected abstract basePath: string;

  /**
   * Méthode générique pour obtenir des éléments avec pagination
   */
  protected async getItems<T>(
    endpoint: string,
    filters: BaseFilters = {}
  ): Promise<ApiResponse<PaginatedResponse<T>>> {
    return apiService.get<PaginatedResponse<T>>(`${this.basePath}${endpoint}`, filters);
  }

  /**
   * Méthode générique pour obtenir un élément par ID
   */
  protected async getItemById<T>(endpoint: string, id: string): Promise<ApiResponse<T>> {
    return apiService.get<T>(`${this.basePath}${endpoint}/${id}`);
  }

  /**
   * Méthode générique pour créer un élément
   */
  protected async createItem<T, C>(endpoint: string, data: C): Promise<ApiResponse<T>> {
    return apiService.post<T>(`${this.basePath}${endpoint}`, data);
  }

  /**
   * Méthode générique pour mettre à jour un élément
   */
  protected async updateItem<T, U>(endpoint: string, id: string, data: U): Promise<ApiResponse<T>> {
    return apiService.put<T>(`${this.basePath}${endpoint}/${id}`, data);
  }

  /**
   * Méthode générique pour supprimer un élément
   */
  protected async deleteItem(endpoint: string, id: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`${this.basePath}${endpoint}/${id}`);
  }

  /**
   * Méthode générique pour obtenir des statistiques
   */
  protected async getStats<T>(endpoint: string, filters: Record<string, any> = {}): Promise<ApiResponse<T>> {
    return apiService.get<T>(`${this.basePath}${endpoint}/stats`, filters);
  }

  /**
   * Méthode générique pour l'export
   */
  protected async exportData(
    endpoint: string,
    options: ExportOptions
  ): Promise<Blob> {
    const response = await apiService.post(`${this.basePath}${endpoint}/export`, options);

    if (!response.data) {
      throw new Error('No data received from export request');
    }

    return response.data;
  }

  /**
   * Méthode utilitaire pour télécharger un fichier
   */
  protected downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  /**
   * Méthode générique pour les opérations en masse
   */
  protected async bulkOperation<T>(
    endpoint: string,
    operation: string,
    ids: string[],
    data?: any
  ): Promise<ApiResponse<T>> {
    return apiService.post<T>(`${this.basePath}${endpoint}/bulk`, {
      operation,
      ids,
      data
    });
  }

  /**
   * Gestion d'erreur standardisée
   */
  protected handleError(error: any, context: string): never {
    console.error(`Erreur dans ${context}:`, error);
    throw error;
  }
}