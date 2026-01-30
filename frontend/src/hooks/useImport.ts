import { useState, useCallback } from 'react';
import { importService } from '../services/importService';
import {
  ImportType,
  ImportPreview,
  ImportResult,
  BulkImportRequest,
  ImportOptions,
  ImportStatus,
  ImportData
} from '../types/import.types';

export interface UseImportReturn {
  preview: ImportPreview | null;
  result: ImportResult | null;
  loading: boolean;
  error: string | null;
  importing: boolean;
  progress: number;
  importData: ImportData[];
  previewImport: (csvData: string, type: ImportType) => Promise<ImportPreview | null>;
  executeImport: (request: BulkImportRequest) => Promise<ImportResult | null>;
  downloadTemplate: (type: ImportType) => Promise<void>;
  clearPreview: () => void;
  clearResult: () => void;
  clearError: () => void;
}

export const useImport = (): UseImportReturn => {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importData, setImportData] = useState<ImportData[]>([]);

  const previewImport = useCallback(async (
    csvData: string,
    type: ImportType
  ): Promise<ImportPreview | null> => {
    setLoading(true);
    setError(null);

    try {
      const previewData = await importService.previewImport(csvData, type);
      setPreview(previewData);
      return previewData;
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la prévisualisation';
      setError(errorMessage);
      setPreview(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const executeImport = useCallback(async (
    request: BulkImportRequest
  ): Promise<ImportResult | null> => {
    setLoading(true);
    setImporting(true);
    setProgress(0);
    setError(null);

    try {
      const importResult = await importService.bulkImport(request);
      setResult(importResult);
      setProgress(100);
      return importResult;
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de l\'import';
      setError(errorMessage);
      setResult(null);
      return null;
    } finally {
      setLoading(false);
      setImporting(false);
    }
  }, []);

  const downloadTemplate = useCallback(async (type: ImportType): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await importService.downloadTemplate(type);
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors du téléchargement du template';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearPreview = useCallback(() => {
    setPreview(null);
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    preview,
    result,
    loading,
    error,
    importing,
    progress,
    importData,
    previewImport,
    executeImport,
    downloadTemplate,
    clearPreview,
    clearResult,
    clearError
  };
};