import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useImport } from '@/hooks/useImport';
import {
  ImportType,
  ImportStatus,
  ImportOptions,
  BulkImportRequest,
  FieldMapping
} from '@/types/import.types';
import { 
  Upload, 
  Download, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  X,
  Loader2
} from 'lucide-react';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  importType?: ImportType;
  eventId?: string;
  onImportComplete?: (result: any) => void;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({
  open,
  onClose,
  importType = ImportType.PARTICIPANTS,
  eventId,
  onImportComplete
}) => {
  const {
    preview,
    result,
    loading,
    error,
    importing,
    progress,
    previewImport,
    executeImport,
    downloadTemplate,
    clearPreview,
    clearResult,
    clearError
  } = useImport();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string>('');
  const [currentType, setCurrentType] = useState<ImportType>(importType);
  const [options, setOptions] = useState<ImportOptions>({
    skipDuplicates: true,
    updateExisting: false,
    sendInvitations: false,
    createTickets: false,
    defaultRole: 'participant'
  });
  const [mapping, setMapping] = useState<FieldMapping>({
    firstName: 'firstName',
    lastName: 'lastName',
    email: 'email',
    phone: 'phone',
    role: 'role',
    department: 'department',
    skills: 'skills',
    notes: 'notes'
  });
  const [step, setStep] = useState<'upload' | 'preview' | 'options' | 'result'>('upload');

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Veuillez sélectionner un fichier CSV');
      return;
    }

    setSelectedFile(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvData(text);
    };
    reader.readAsText(file);
  }, []);

  const handlePreview = useCallback(async () => {
    if (!csvData) return;

    const previewResult = await previewImport(csvData, currentType);
    if (previewResult) {
      setStep('preview');
    }
  }, [csvData, currentType, previewImport]);

  const handleImport = useCallback(async () => {
    if (!csvData) return;

    const request: BulkImportRequest = {
      csvData,
      type: currentType,
      options: {
        ...options,
        eventId
      },
      mapping
    };

    const importResult = await executeImport(request);
    if (importResult) {
      setStep('result');
      onImportComplete?.(importResult);
    }
  }, [csvData, currentType, options, eventId, mapping, executeImport, onImportComplete]);

  const handleDownloadTemplate = useCallback(async () => {
    await downloadTemplate(currentType);
  }, [currentType, downloadTemplate]);

  const handleClose = useCallback(() => {
    setSelectedFile(null);
    setCsvData('');
    setStep('upload');
    clearPreview();
    clearResult();
    clearError();
    onClose();
  }, [onClose, clearPreview, clearResult, clearError]);

  const getImportTypeLabel = (type: ImportType): string => {
    const labels = {
      [ImportType.VOLUNTEERS]: 'Bénévoles',
      [ImportType.PARTICIPANTS]: 'Participants',
      [ImportType.USERS]: 'Utilisateurs',
      [ImportType.EVENTS]: 'Événements',
      [ImportType.ATTENDANCES]: 'Présences',
      [ImportType.TICKETS]: 'Billets'
    };
    return labels[type] || type;
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="import-type">Type d'import</Label>
          <Select value={currentType} onValueChange={(value) => setCurrentType(value as ImportType)}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner le type d'import" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(ImportType).map((type) => (
                <SelectItem key={type} value={type}>
                  {getImportTypeLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="csv-file">Fichier CSV</Label>
          <div className="mt-2">
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="cursor-pointer"
            />
          </div>
          {selectedFile && (
            <p className="text-sm text-muted-foreground mt-2">
              Fichier sélectionné: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
            </p>
          )}
        </div>

        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Besoin d'un modèle ?</p>
              <p className="text-sm text-muted-foreground">
                Téléchargez le modèle CSV pour {getImportTypeLabel(currentType).toLowerCase()}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            disabled={loading}
          >
            <Download className="h-4 w-4 mr-2" />
            Télécharger
          </Button>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handleClose}>
          Annuler
        </Button>
        <Button
          onClick={handlePreview}
          disabled={!csvData || loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyse...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Prévisualiser
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      {preview && (
        <>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Aperçu des données</h3>
            
            {preview.validation.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {preview.validation.errors.length} erreur(s) détectée(s). 
                  Veuillez corriger votre fichier avant de continuer.
                </AlertDescription>
              </Alert>
            )}

            {preview.validation.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {preview.validation.warnings.length} avertissement(s) détecté(s).
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-green-600">{preview.validation.validRows}</p>
                <p className="text-sm text-muted-foreground">Lignes valides</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-red-600">{preview.validation.errors.length}</p>
                <p className="text-sm text-muted-foreground">Erreurs</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{preview.validation.duplicates.length}</p>
                <p className="text-sm text-muted-foreground">Doublons</p>
              </div>
            </div>

            {preview.rows.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted p-3 border-b">
                  <h4 className="font-medium">Aperçu des données (5 premières lignes)</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        {preview.headers.map((header, index) => (
                          <th key={index} className="p-2 text-left font-medium">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.slice(0, 5).map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-t">
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="p-2">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setStep('upload')}>
              Retour
            </Button>
            <Button
              onClick={() => setStep('options')}
              disabled={preview.validation.errors.length > 0}
            >
              Configurer l'import
            </Button>
          </div>
        </>
      )}
    </div>
  );

  const renderOptionsStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Options d'import</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="skip-duplicates">Ignorer les doublons</Label>
            <p className="text-sm text-muted-foreground">
              Ne pas importer les entrées avec des emails déjà existants
            </p>
          </div>
          <Switch
            id="skip-duplicates"
            checked={options.skipDuplicates}
            onCheckedChange={(checked) => setOptions(prev => ({ ...prev, skipDuplicates: checked }))}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="update-existing">Mettre à jour les existants</Label>
            <p className="text-sm text-muted-foreground">
              Mettre à jour les informations des utilisateurs existants
            </p>
          </div>
          <Switch
            id="update-existing"
            checked={options.updateExisting}
            onCheckedChange={(checked) => setOptions(prev => ({ ...prev, updateExisting: checked }))}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="send-invitations">Envoyer des invitations</Label>
            <p className="text-sm text-muted-foreground">
              Envoyer un email d'invitation aux nouveaux utilisateurs
            </p>
          </div>
          <Switch
            id="send-invitations"
            checked={options.sendInvitations}
            onCheckedChange={(checked) => setOptions(prev => ({ ...prev, sendInvitations: checked }))}
          />
        </div>

        {eventId && (
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="create-tickets">Créer des billets</Label>
              <p className="text-sm text-muted-foreground">
                Générer automatiquement des billets pour l'événement
              </p>
            </div>
            <Switch
              id="create-tickets"
              checked={options.createTickets}
              onCheckedChange={(checked) => setOptions(prev => ({ ...prev, createTickets: checked }))}
            />
          </div>
        )}

        <div>
          <Label htmlFor="default-role">Rôle par défaut</Label>
          <Select 
            value={options.defaultRole} 
            onValueChange={(value) => setOptions(prev => ({ ...prev, defaultRole: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="participant">Participant</SelectItem>
              <SelectItem value="volunteer">Bénévole</SelectItem>
              <SelectItem value="organizer">Organisateur</SelectItem>
              <SelectItem value="admin">Administrateur</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => setStep('preview')}>
          Retour
        </Button>
        <Button onClick={handleImport} disabled={importing}>
          {importing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Import en cours...
            </>
          ) : (
            'Lancer l\'import'
          )}
        </Button>
      </div>
    </div>
  );

  const renderResultStep = () => (
    <div className="space-y-6">
      {result && (
        <>
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Import terminé</h3>
            <p className="text-muted-foreground">
              {result.successCount} élément(s) importé(s) avec succès
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">{result.successCount}</p>
              <p className="text-sm text-green-700">Créés</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">{result.skippedCount}</p>
              <p className="text-sm text-blue-700">Ignorés</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-red-600">Erreurs ({result.errors.length})</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {result.errors.map((error, index) => (
                  <div key={index} className="text-sm p-2 bg-red-50 rounded">
                    Ligne {error.row}: {error.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleClose}>
              Fermer
            </Button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import de données - {getImportTypeLabel(currentType)}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {importing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Import en cours...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        <div className="mt-6">
          {step === 'upload' && renderUploadStep()}
          {step === 'preview' && renderPreviewStep()}
          {step === 'options' && renderOptionsStep()}
          {step === 'result' && renderResultStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
};