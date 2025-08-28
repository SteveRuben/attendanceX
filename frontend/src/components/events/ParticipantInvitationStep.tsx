import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Upload, 
  Download, 
  Mail, 
  MessageSquare, 
  Plus,
  X,
  FileText,
  AlertCircle,
  CheckCircle,
  Globe
} from 'lucide-react';
import { ParticipantImportRow, ImportNotificationSettings } from '@attendance-x/shared';
import { participantService } from '@/services/participantService';
import { toast } from 'react-toastify';

interface ParticipantInvitationStepProps {
  eventId: string;
  onParticipantsAdded?: (count: number) => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

interface ManualParticipant {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  language: string;
  notifyByEmail: boolean;
  notifyBySMS: boolean;
}

export const ParticipantInvitationStep: React.FC<ParticipantInvitationStepProps> = ({
  eventId,
  onParticipantsAdded,
  onNext,
  onPrevious
}) => {
  const [invitationMethod, setInvitationMethod] = useState<'manual' | 'import' | 'internal'>('manual');
  const [manualParticipants, setManualParticipants] = useState<ManualParticipant[]>([
    { email: '', firstName: '', lastName: '', language: 'fr', notifyByEmail: true, notifyBySMS: false }
  ]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importSettings, setImportSettings] = useState<ImportNotificationSettings>({
    defaultChannels: ['email'],
    sendWelcomeNotification: true,
    defaultLanguage: 'fr',
    autoDetectLanguage: true,
    fallbackLanguage: 'fr',
    supportedLanguages: ['fr', 'en', 'es', 'de', 'it']
  });
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addManualParticipant = () => {
    setManualParticipants([
      ...manualParticipants,
      { email: '', firstName: '', lastName: '', language: 'fr', notifyByEmail: true, notifyBySMS: false }
    ]);
  };

  const removeManualParticipant = (index: number) => {
    setManualParticipants(manualParticipants.filter((_, i) => i !== index));
  };

  const updateManualParticipant = (index: number, updates: Partial<ManualParticipant>) => {
    setManualParticipants(prev => prev.map((participant, i) => 
      i === index ? { ...participant, ...updates } : participant
    ));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      if (!validTypes.includes(file.type)) {
        toast.error('Format de fichier non supporté. Utilisez CSV ou Excel.');
        return;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB
        toast.error('Le fichier est trop volumineux (max 5MB).');
        return;
      }

      setSelectedFile(file);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `email,phone,firstName,lastName,notifyByEmail,notifyBySMS,language,role,notes
john@example.com,+33123456789,John,Doe,true,false,en,participant,VIP guest
,+33987654321,Jane,Smith,false,true,fr,participant,No email available
marie@test.com,,Marie,Martin,true,false,fr,speaker,Keynote speaker`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template-participants.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleManualInvitation = async () => {
    const validParticipants = manualParticipants.filter(p => 
      (p.email?.trim() || p.phone?.trim()) && (p.firstName?.trim() || p.lastName?.trim())
    );

    if (validParticipants.length === 0) {
      toast.warning('Veuillez ajouter au moins un participant valide');
      return;
    }

    try {
      setLoading(true);
      const promises = validParticipants.map(participant =>
        participantService.createParticipant({
          eventId,
          email: participant.email || undefined,
          phone: participant.phone || undefined,
          firstName: participant.firstName || undefined,
          lastName: participant.lastName || undefined,
          notificationPreferences: {
            email: participant.notifyByEmail,
            sms: participant.notifyBySMS,
            channels: [
              ...(participant.notifyByEmail ? ['email'] : []),
              ...(participant.notifyBySMS ? ['sms'] : [])
            ] as any,
            language: participant.language
          }
        })
      );

      const results = await Promise.all(promises);
      const successful = results.filter(r => r.success).length;
      
      toast.success(`${successful} participant(s) ajouté(s) avec succès`);
      onParticipantsAdded?.(successful);
      
    } catch (error) {
      toast.error('Erreur lors de l\'ajout des participants');
      console.error('Error adding participants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileImport = async () => {
    if (!selectedFile) return;

    try {
      setLoading(true);
      const response = await participantService.importParticipants(eventId, selectedFile, {
        duplicateHandling: 'skip',
        defaultLanguage: importSettings.defaultLanguage,
        sendWelcomeNotification: importSettings.sendWelcomeNotification,
        customMessage: importSettings.customMessage
      });

      if (response.success && response.data) {
        setImportResult(response.data);
        toast.success(`Import terminé : ${response.data.imported} participant(s) importé(s)`);
        onParticipantsAdded?.(response.data.imported);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'import');
      console.error('Import error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderManualInvitation = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-md font-medium text-gray-900">Ajouter des participants manuellement</h4>
        <Button onClick={addManualParticipant} size="sm" variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Ajouter
        </Button>
      </div>

      <div className="space-y-3">
        {manualParticipants.map((participant, index) => (
          <Card key={index} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={participant.email || ''}
                  onChange={(e) => updateManualParticipant(index, { email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="participant@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={participant.phone || ''}
                  onChange={(e) => updateManualParticipant(index, { phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="+33123456789"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prénom
                </label>
                <input
                  type="text"
                  value={participant.firstName || ''}
                  onChange={(e) => updateManualParticipant(index, { firstName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="John"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom
                </label>
                <input
                  type="text"
                  value={participant.lastName || ''}
                  onChange={(e) => updateManualParticipant(index, { lastName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Doe"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Langue
                </label>
                <select
                  value={participant.language}
                  onChange={(e) => updateManualParticipant(index, { language: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="de">Deutsch</option>
                  <option value="it">Italiano</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={participant.notifyByEmail}
                    onChange={(e) => updateManualParticipant(index, { notifyByEmail: e.target.checked })}
                    className="mr-2"
                  />
                  <Mail className="w-4 h-4 mr-1" />
                  Email
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={participant.notifyBySMS}
                    onChange={(e) => updateManualParticipant(index, { notifyBySMS: e.target.checked })}
                    className="mr-2"
                  />
                  <MessageSquare className="w-4 h-4 mr-1" />
                  SMS
                </label>
              </div>
            </div>
            
            {manualParticipants.length > 1 && (
              <div className="mt-3 flex justify-end">
                <Button
                  onClick={() => removeManualParticipant(index)}
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4 mr-1" />
                  Supprimer
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
        <AlertCircle className="w-4 h-4 inline mr-2" />
        Au moins un email OU téléphone est requis par participant
      </div>
    </div>
  );

  const renderFileImport = () => (
    <div className="space-y-4">
      {/* Template Download */}
      <Card className="p-4 bg-blue-50">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-blue-900">Modèle de fichier</h4>
            <p className="text-sm text-blue-700">
              Téléchargez le modèle CSV avec les colonnes requises
            </p>
          </div>
          <Button
            variant="outline"
            onClick={downloadTemplate}
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Télécharger le modèle
          </Button>
        </div>
      </Card>

      {/* File Upload */}
      <Card className="p-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {selectedFile ? (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <FileText className="w-8 h-8 text-green-600" />
              <div>
                <div className="font-medium text-gray-900">{selectedFile.name}</div>
                <div className="text-sm text-gray-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </div>
              </div>
            </div>
            <div className="flex justify-center space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                size="sm"
              >
                <X className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                size="sm"
              >
                Changer de fichier
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                Glissez-déposez votre fichier ici ou cliquez pour sélectionner
              </p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                Sélectionner un fichier
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              Formats supportés : CSV, Excel (.xlsx, .xls) • Taille max : 5MB
            </p>
          </div>
        )}
      </Card>

      {/* Import Settings */}
      <Card className="p-4">
        <h4 className="font-medium text-gray-900 mb-3">Paramètres d'import</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Langue par défaut
            </label>
            <select
              value={importSettings.defaultLanguage}
              onChange={(e) => setImportSettings({
                ...importSettings,
                defaultLanguage: e.target.value
              })}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="de">Deutsch</option>
              <option value="it">Italiano</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={importSettings.sendWelcomeNotification}
                onChange={(e) => setImportSettings({
                  ...importSettings,
                  sendWelcomeNotification: e.target.checked
                })}
                className="mr-2"
              />
              <span className="text-sm">Envoyer notification de bienvenue</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={importSettings.autoDetectLanguage}
                onChange={(e) => setImportSettings({
                  ...importSettings,
                  autoDetectLanguage: e.target.checked
                })}
                className="mr-2"
              />
              <span className="text-sm">Détecter automatiquement la langue</span>
            </label>
          </div>
        </div>
      </Card>

      {/* Import Result */}
      {importResult && (
        <Card className="p-4 bg-green-50">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h4 className="font-medium text-green-900">Import terminé</h4>
          </div>
          <div className="text-sm text-green-800">
            <div>✓ {importResult.imported} participant(s) importé(s)</div>
            {importResult.failed > 0 && (
              <div>⚠ {importResult.failed} échec(s)</div>
            )}
            {importResult.duplicates > 0 && (
              <div>ℹ {importResult.duplicates} doublon(s) ignoré(s)</div>
            )}
          </div>
        </Card>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Inviter des participants
        </h3>
        <p className="text-gray-600">
          Ajoutez des participants à votre événement
        </p>
      </div>

      {/* Method Selection */}
      <Card className="p-4">
        <h4 className="font-medium text-gray-900 mb-3">Méthode d'invitation</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { 
              value: 'manual', 
              label: 'Saisie manuelle', 
              description: 'Ajouter des participants un par un',
              icon: Users 
            },
            { 
              value: 'import', 
              label: 'Import fichier', 
              description: 'Importer depuis CSV ou Excel',
              icon: Upload 
            },
            { 
              value: 'internal', 
              label: 'Utilisateurs internes', 
              description: 'Sélectionner des membres de l\'organisation',
              icon: Building 
            }
          ].map((method) => {
            const Icon = method.icon;
            return (
              <button
                key={method.value}
                onClick={() => setInvitationMethod(method.value as any)}
                className={`p-4 border rounded-lg text-left transition-all ${
                  invitationMethod === method.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <Icon className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">{method.label}</span>
                </div>
                <p className="text-sm text-gray-600">{method.description}</p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Content based on selected method */}
      {invitationMethod === 'manual' && renderManualInvitation()}
      {invitationMethod === 'import' && renderFileImport()}
      {invitationMethod === 'internal' && (
        <Card className="p-8 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            Sélection d'utilisateurs internes
          </h4>
          <p className="text-gray-600 mb-4">
            Cette fonctionnalité sera disponible prochainement
          </p>
          <Badge variant="secondary">À venir</Badge>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onPrevious}>
          Précédent
        </Button>
        
        <div className="flex space-x-3">
          {invitationMethod === 'manual' && (
            <Button
              onClick={handleManualInvitation}
              disabled={loading}
            >
              {loading ? 'Ajout en cours...' : 'Ajouter les participants'}
            </Button>
          )}
          
          {invitationMethod === 'import' && selectedFile && (
            <Button
              onClick={handleFileImport}
              disabled={loading}
            >
              {loading ? 'Import en cours...' : 'Importer les participants'}
            </Button>
          )}
          
          <Button onClick={onNext}>
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
};