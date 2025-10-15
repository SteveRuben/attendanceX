import React, { useState, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/badge';
import { 
  Upload, 
  Download, 
  Users, 
  AlertCircle, 
  CheckCircle,
  X,
  FileText,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { UserRole, OrganizationRole } from '../../shared';
import { invitationService } from '../services/invitationService';
import { teamService } from '../services/teamService';
import { toast } from 'react-toastify';

interface UserBulkImportProps {
  organizationId: string;
  onComplete?: (result: any) => void;
  onCancel?: () => void;
}

interface ImportSettings {
  defaultRole: UserRole;
  defaultOrganizationRole: OrganizationRole;
  defaultPassword: string;
  defaultTeams: string[];
  createMissingTeams: boolean;
  autoAssignByDepartment: boolean;
  sendWelcomeEmail: boolean;
  language: string;
}

interface ImportResult {
  imported: number;
  failed: number;
  createdTeams: string[];
  errors: Array<{ row: number; email: string; error: string }>;
}

export const UserBulkImport: React.FC<UserBulkImportProps> = ({
  organizationId,
  onComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<ImportSettings>({
    defaultRole: UserRole.CONTRIBUTOR,
    defaultOrganizationRole: OrganizationRole.MEMBER,
    defaultPassword: 'TempPass123!',
    defaultTeams: [],
    createMissingTeams: true,
    autoAssignByDepartment: true,
    sendWelcomeEmail: true,
    language: 'fr'
  });

  React.useEffect(() => {
    loadAvailableTeams();
  }, [organizationId]);

  const loadAvailableTeams = async () => {
    try {
      const response = await teamService.getTeams(organizationId);
      if (response.success && response.data) {
        setAvailableTeams(response.data.data);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
    }
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

      if (file.size > 10 * 1024 * 1024) { // 10MB
        toast.error('Le fichier est trop volumineux (max 10MB).');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    try {
      setLoading(true);
      const response = await invitationService.importUsersWithTeams(organizationId, selectedFile, {
        defaultRole: settings.defaultRole,
        defaultOrganizationRole: settings.defaultOrganizationRole,
        defaultPassword: settings.defaultPassword,
        defaultTeams: settings.defaultTeams,
        createMissingTeams: settings.createMissingTeams,
        autoAssignByDepartment: settings.autoAssignByDepartment,
        sendWelcomeEmail: settings.sendWelcomeEmail,
        language: settings.language
      });

      if (response.success && response.data) {
        setImportResult(response.data);
        setCurrentStep(3);
        toast.success(`Import terminé : ${response.data.imported} utilisateur(s) importé(s)`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'import');
      console.error('Import error:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `email,firstName,lastName,phone,department,jobTitle,systemRole,organizationRole,teams,language,sendWelcomeEmail
john@company.com,John,Doe,+33123456789,IT,Developer,contributor,member,"IT Support;Development",en,true
jane@company.com,Jane,Smith,+33987654321,HR,Manager,contributor,manager,"HR;Management",fr,true
bob@company.com,Bob,Wilson,,Operations,Supervisor,contributor,member,"Operations;Quality",fr,false`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template-import-utilisateurs.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Upload className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Import en masse des utilisateurs
              </h3>
              <p className="text-gray-600">
                Importez plusieurs utilisateurs à la fois depuis un fichier CSV ou Excel
              </p>
            </div>

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
              <div className="text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {selectedFile ? (
                  <div className="space-y-4">
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
                  <div className="space-y-4">
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
                      Formats supportés : CSV, Excel (.xlsx, .xls) • Taille max : 10MB
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Format Requirements */}
            <Card className="p-4">
              <h4 className="font-medium text-gray-900 mb-3">Format requis</h4>
              <div className="text-sm text-gray-600 space-y-2">
                <div><strong>Colonnes obligatoires :</strong> email, firstName, lastName</div>
                <div><strong>Colonnes optionnelles :</strong> phone, department, jobTitle, teams, language</div>
                <div><strong>Équipes :</strong> Séparez plusieurs équipes par des points-virgules (;)</div>
                <div><strong>Langues supportées :</strong> fr, en, es, de, it</div>
              </div>
            </Card>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Settings className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Configuration de l'import
              </h3>
              <p className="text-gray-600">
                Configurez les paramètres par défaut pour les nouveaux utilisateurs
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Rôles */}
              <Card className="p-4">
                <h4 className="font-medium text-gray-900 mb-3">Rôles par défaut</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rôle système
                    </label>
                    <select
                      value={settings.defaultRole}
                      onChange={(e) => setSettings({...settings, defaultRole: e.target.value as UserRole})}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value={UserRole.CONTRIBUTOR}>Contributeur</option>
                      <option value={UserRole.PARTICIPANT}>Participant</option>
                      <option value={UserRole.VIEWER}>Observateur</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rôle organisation
                    </label>
                    <select
                      value={settings.defaultOrganizationRole}
                      onChange={(e) => setSettings({...settings, defaultOrganizationRole: e.target.value as OrganizationRole})}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value={OrganizationRole.MEMBER}>Membre</option>
                      <option value={OrganizationRole.MANAGER}>Manager</option>
                      <option value={OrganizationRole.VIEWER}>Observateur</option>
                    </select>
                  </div>
                </div>
              </Card>

              {/* Mot de passe */}
              <Card className="p-4">
                <h4 className="font-medium text-gray-900 mb-3">Authentification</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mot de passe temporaire
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={settings.defaultPassword}
                      onChange={(e) => setSettings({...settings, defaultPassword: e.target.value})}
                      className="w-full px-3 py-2 pr-10 border rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Les utilisateurs devront changer ce mot de passe à la première connexion
                  </p>
                </div>
              </Card>

              {/* Équipes */}
              <Card className="p-4">
                <h4 className="font-medium text-gray-900 mb-3">Affectation aux équipes</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Équipes par défaut
                    </label>
                    <select
                      multiple
                      value={settings.defaultTeams}
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions, option => option.value);
                        setSettings({...settings, defaultTeams: values});
                      }}
                      className="w-full px-3 py-2 border rounded-md"
                      size={4}
                    >
                      {availableTeams.map(team => (
                        <option key={team.id} value={team.id}>
                          {team.name} ({team.department})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Maintenez Ctrl/Cmd pour sélectionner plusieurs équipes
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.createMissingTeams}
                        onChange={(e) => setSettings({...settings, createMissingTeams: e.target.checked})}
                        className="mr-2"
                      />
                      <span className="text-sm">Créer les équipes manquantes</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.autoAssignByDepartment}
                        onChange={(e) => setSettings({...settings, autoAssignByDepartment: e.target.checked})}
                        className="mr-2"
                      />
                      <span className="text-sm">Assigner automatiquement par département</span>
                    </label>
                  </div>
                </div>
              </Card>

              {/* Notifications */}
              <Card className="p-4">
                <h4 className="font-medium text-gray-900 mb-3">Notifications</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Langue par défaut
                    </label>
                    <select
                      value={settings.language}
                      onChange={(e) => setSettings({...settings, language: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="fr">Français</option>
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="de">Deutsch</option>
                      <option value="it">Italiano</option>
                    </select>
                  </div>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.sendWelcomeEmail}
                      onChange={(e) => setSettings({...settings, sendWelcomeEmail: e.target.checked})}
                      className="mr-2"
                    />
                    <span className="text-sm">Envoyer un email de bienvenue</span>
                  </label>
                </div>
              </Card>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Import terminé !
              </h3>
              <p className="text-gray-600">
                L'import des utilisateurs a été traité
              </p>
            </div>

            {importResult && (
              <div className="space-y-4">
                {/* Résumé */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4 text-center bg-green-50">
                    <div className="text-2xl font-bold text-green-600">
                      {importResult.imported}
                    </div>
                    <div className="text-sm text-green-800">Importés</div>
                  </Card>
                  
                  <Card className="p-4 text-center bg-red-50">
                    <div className="text-2xl font-bold text-red-600">
                      {importResult.failed}
                    </div>
                    <div className="text-sm text-red-800">Échecs</div>
                  </Card>
                  
                  <Card className="p-4 text-center bg-blue-50">
                    <div className="text-2xl font-bold text-blue-600">
                      {importResult.createdTeams.length}
                    </div>
                    <div className="text-sm text-blue-800">Équipes créées</div>
                  </Card>
                </div>

                {/* Équipes créées */}
                {importResult.createdTeams.length > 0 && (
                  <Card className="p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Équipes créées</h4>
                    <div className="flex flex-wrap gap-2">
                      {importResult.createdTeams.map((teamName, index) => (
                        <Badge key={index} variant="secondary">
                          {teamName}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Erreurs */}
                {importResult.errors.length > 0 && (
                  <Card className="p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2 text-red-600" />
                      Erreurs d'import ({importResult.errors.length})
                    </h4>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {importResult.errors.map((error, index) => (
                        <div key={index} className="text-sm p-2 bg-red-50 rounded border-l-4 border-red-400">
                          <div className="font-medium text-red-800">
                            Ligne {error.row} - {error.email}
                          </div>
                          <div className="text-red-600">{error.error}</div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              currentStep >= step 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-600'
            }`}>
              {currentStep > step ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                step
              )}
            </div>
            {step < 3 && (
              <div className={`w-16 h-1 mx-2 ${
                currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card className="p-8">
        {renderStepContent()}
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <div>
          {currentStep > 1 && currentStep < 3 && (
            <Button
              variant="outline"
              onClick={() => setCurrentStep(currentStep - 1)}
            >
              Précédent
            </Button>
          )}
        </div>
        
        <div className="flex space-x-3">
          {currentStep < 3 && (
            <Button
              variant="outline"
              onClick={onCancel}
            >
              Annuler
            </Button>
          )}
          
          {currentStep === 1 && (
            <Button
              onClick={() => setCurrentStep(2)}
              disabled={!selectedFile}
            >
              Suivant
            </Button>
          )}
          
          {currentStep === 2 && (
            <Button
              onClick={handleImport}
              disabled={loading}
            >
              {loading ? 'Import en cours...' : 'Lancer l\'import'}
            </Button>
          )}
          
          {currentStep === 3 && (
            <Button onClick={() => onComplete?.(importResult)}>
              Terminer
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};