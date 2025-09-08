import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Plus, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle,
  Building,
  Settings,
  UserPlus
} from 'lucide-react';
import { CreateTeamRequest, TeamSettings, OrganizationSector } from '../../shared';
import { teamService } from '@/services/teamService';
import { toast } from 'react-toastify';

interface TeamCreationWizardProps {
  organizationId: string;
  organizationSector: OrganizationSector;
  onComplete: (teams: any[]) => void;
  onSkip?: () => void;
}

interface TeamTemplate {
  name: string;
  description: string;
  department: string;
  defaultSettings: TeamSettings;
  isRecommended?: boolean;
}

const SECTOR_TEAM_TEMPLATES: Record<OrganizationSector, TeamTemplate[]> = {
  [OrganizationSector.EDUCATION]: [
    {
      name: 'Administration',
      description: 'Équipe administrative et direction',
      department: 'Administration',
      defaultSettings: {
        canValidateAttendance: true,
        canCreateEvents: true,
        canInviteParticipants: true,
        canViewAllEvents: true,
        canExportData: true
      },
      isRecommended: true
    },
    {
      name: 'Corps Enseignant',
      description: 'Professeurs et formateurs',
      department: 'Enseignement',
      defaultSettings: {
        canValidateAttendance: true,
        canCreateEvents: true,
        canInviteParticipants: false,
        canViewAllEvents: false,
        canExportData: false
      },
      isRecommended: true
    },
    {
      name: 'Services aux Étudiants',
      description: 'Support et accompagnement étudiants',
      department: 'Services',
      defaultSettings: {
        canValidateAttendance: true,
        canCreateEvents: false,
        canInviteParticipants: false,
        canViewAllEvents: false,
        canExportData: false
      }
    }
  ],
  [OrganizationSector.CORPORATE]: [
    {
      name: 'Direction',
      description: 'Équipe de direction et management',
      department: 'Direction',
      defaultSettings: {
        canValidateAttendance: true,
        canCreateEvents: true,
        canInviteParticipants: true,
        canViewAllEvents: true,
        canExportData: true
      },
      isRecommended: true
    },
    {
      name: 'Ressources Humaines',
      description: 'Gestion du personnel et formation',
      department: 'RH',
      defaultSettings: {
        canValidateAttendance: true,
        canCreateEvents: true,
        canInviteParticipants: true,
        canViewAllEvents: true,
        canExportData: true
      },
      isRecommended: true
    },
    {
      name: 'Équipes Opérationnelles',
      description: 'Équipes de production et services',
      department: 'Opérations',
      defaultSettings: {
        canValidateAttendance: true,
        canCreateEvents: false,
        canInviteParticipants: false,
        canViewAllEvents: false,
        canExportData: false
      }
    }
  ],
  [OrganizationSector.HEALTHCARE]: [
    {
      name: 'Administration Médicale',
      description: 'Direction et administration hospitalière',
      department: 'Administration',
      defaultSettings: {
        canValidateAttendance: true,
        canCreateEvents: true,
        canInviteParticipants: true,
        canViewAllEvents: true,
        canExportData: true
      },
      isRecommended: true
    },
    {
      name: 'Personnel Soignant',
      description: 'Médecins, infirmiers et soignants',
      department: 'Soins',
      defaultSettings: {
        canValidateAttendance: true,
        canCreateEvents: false,
        canInviteParticipants: false,
        canViewAllEvents: false,
        canExportData: false
      },
      isRecommended: true
    }
  ],
  // Autres secteurs avec templates par défaut
  [OrganizationSector.GOVERNMENT]: [],
  [OrganizationSector.NON_PROFIT]: [],
  [OrganizationSector.TECHNOLOGY]: [],
  [OrganizationSector.FINANCE]: [],
  [OrganizationSector.RETAIL]: [],
  [OrganizationSector.MANUFACTURING]: [],
  [OrganizationSector.HOSPITALITY]: [],
  [OrganizationSector.CONSULTING]: [],
  [OrganizationSector.SERVICES]: [],
  [OrganizationSector.OTHER]: []
};

export const TeamCreationWizard: React.FC<TeamCreationWizardProps> = ({
  organizationId,
  organizationSector,
  onComplete,
  onSkip
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTemplates, setSelectedTemplates] = useState<TeamTemplate[]>([]);
  const [customTeams, setCustomTeams] = useState<CreateTeamRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [createdTeams, setCreatedTeams] = useState<any[]>([]);

  const templates = SECTOR_TEAM_TEMPLATES[organizationSector] || [];

  useEffect(() => {
    // Pré-sélectionner les templates recommandés
    const recommended = templates.filter(t => t.isRecommended);
    setSelectedTemplates(recommended);
  }, [organizationSector]);

  const handleTemplateToggle = (template: TeamTemplate) => {
    setSelectedTemplates(prev => {
      const exists = prev.find(t => t.name === template.name);
      if (exists) {
        return prev.filter(t => t.name !== template.name);
      } else {
        return [...prev, template];
      }
    });
  };

  const handleAddCustomTeam = () => {
    setCustomTeams(prev => [...prev, {
      name: '',
      description: '',
      department: '',
      managerId: '', // À définir plus tard
      settings: {
        canValidateAttendance: true,
        canCreateEvents: false,
        canInviteParticipants: false,
        canViewAllEvents: false,
        canExportData: false
      }
    }]);
  };

  const handleUpdateCustomTeam = (index: number, updates: Partial<CreateTeamRequest>) => {
    setCustomTeams(prev => prev.map((team, i) => 
      i === index ? { ...team, ...updates } : team
    ));
  };

  const handleRemoveCustomTeam = (index: number) => {
    setCustomTeams(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateTeams = async () => {
    try {
      setLoading(true);
      const teamsToCreate = [
        ...selectedTemplates.map(template => ({
          name: template.name,
          description: template.description,
          department: template.department,
          managerId: '', // À définir plus tard
          settings: template.defaultSettings
        })),
        ...customTeams.filter(team => team.name.trim())
      ];

      if (teamsToCreate.length === 0) {
        toast.warning('Veuillez sélectionner au moins une équipe');
        return;
      }

      const createdTeamsPromises = teamsToCreate.map(teamData =>
        teamService.createTeam(organizationId, teamData)
      );

      const results = await Promise.all(createdTeamsPromises);
      const successful = results.filter(r => r.success).map(r => r.data);
      
      setCreatedTeams(successful);
      toast.success(`${successful.length} équipe(s) créée(s) avec succès`);
      
      setCurrentStep(3);
    } catch (error) {
      toast.error('Erreur lors de la création des équipes');
      console.error('Error creating teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Building className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Créer vos équipes
              </h3>
              <p className="text-gray-600">
                Organisez votre structure en équipes pour une meilleure gestion des permissions et des responsabilités.
              </p>
            </div>

            {templates.length > 0 && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  Équipes recommandées pour votre secteur
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <Card 
                      key={template.name}
                      className={`p-4 cursor-pointer transition-all ${
                        selectedTemplates.find(t => t.name === template.name)
                          ? 'ring-2 ring-blue-500 bg-blue-50'
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => handleTemplateToggle(template)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h5 className="font-medium text-gray-900">
                              {template.name}
                            </h5>
                            {template.isRecommended && (
                              <Badge variant="default" className="text-xs">
                                Recommandé
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {template.description}
                          </p>
                          <Badge variant="outline" className="text-xs mt-2">
                            {template.department}
                          </Badge>
                        </div>
                        <input
                          type="checkbox"
                          checked={!!selectedTemplates.find(t => t.name === template.name)}
                          onChange={() => handleTemplateToggle(template)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                        />
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        Permissions : {Object.entries(template.defaultSettings)
                          .filter(([_, value]) => value)
                          .map(([key]) => key.replace('can', '').replace(/([A-Z])/g, ' $1').toLowerCase())
                          .join(', ')
                        }
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-gray-900">
                  Équipes personnalisées
                </h4>
                <Button
                  variant="outline"
                  onClick={handleAddCustomTeam}
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter une équipe
                </Button>
              </div>

              {customTeams.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>Aucune équipe personnalisée</p>
                  <p className="text-sm">Cliquez sur "Ajouter une équipe" pour créer une équipe sur mesure</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {customTeams.map((team, index) => (
                    <Card key={index} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nom de l'équipe
                          </label>
                          <input
                            type="text"
                            value={team.name}
                            onChange={(e) => handleUpdateCustomTeam(index, { name: e.target.value })}
                            className="w-full px-3 py-2 border rounded-md"
                            placeholder="Ex: Équipe Marketing"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Département
                          </label>
                          <input
                            type="text"
                            value={team.department}
                            onChange={(e) => handleUpdateCustomTeam(index, { department: e.target.value })}
                            className="w-full px-3 py-2 border rounded-md"
                            placeholder="Ex: Marketing"
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          value={team.description}
                          onChange={(e) => handleUpdateCustomTeam(index, { description: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 border rounded-md"
                          placeholder="Description de l'équipe..."
                        />
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCustomTeam(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Supprimer
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Confirmation
              </h3>
              <p className="text-gray-600">
                Vérifiez les équipes qui vont être créées
              </p>
            </div>

            <Card className="p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">
                Équipes à créer ({selectedTemplates.length + customTeams.filter(t => t.name.trim()).length})
              </h4>
              
              <div className="space-y-3">
                {selectedTemplates.map((template) => (
                  <div key={template.name} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{template.name}</div>
                      <div className="text-sm text-gray-600">{template.description}</div>
                      <Badge variant="outline" className="text-xs mt-1">
                        {template.department}
                      </Badge>
                    </div>
                    <Badge variant="default">Template</Badge>
                  </div>
                ))}
                
                {customTeams.filter(team => team.name.trim()).map((team, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{team.name}</div>
                      <div className="text-sm text-gray-600">{team.description}</div>
                      <Badge variant="outline" className="text-xs mt-1">
                        {team.department}
                      </Badge>
                    </div>
                    <Badge variant="secondary">Personnalisé</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Équipes créées avec succès !
              </h3>
              <p className="text-gray-600">
                Vos équipes ont été créées. Vous pouvez maintenant y ajouter des membres.
              </p>
            </div>

            <Card className="p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">
                Équipes créées ({createdTeams.length})
              </h4>
              
              <div className="space-y-3">
                {createdTeams.map((team) => (
                  <div key={team.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{team.name}</div>
                      <div className="text-sm text-gray-600">{team.description}</div>
                      <Badge variant="outline" className="text-xs mt-1">
                        {team.department}
                      </Badge>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 bg-blue-50">
              <h4 className="text-md font-medium text-blue-900 mb-2">
                Prochaines étapes
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Ajoutez des membres à vos équipes</li>
                <li>• Configurez les permissions spécifiques si nécessaire</li>
                <li>• Créez votre premier événement</li>
              </ul>
            </Card>
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
              <ArrowLeft className="w-4 h-4 mr-2" />
              Précédent
            </Button>
          )}
        </div>
        
        <div className="flex space-x-3">
          {currentStep < 3 && (
            <Button
              variant="outline"
              onClick={onSkip}
            >
              Passer cette étape
            </Button>
          )}
          
          {currentStep === 1 && (
            <Button
              onClick={() => setCurrentStep(2)}
              disabled={selectedTemplates.length === 0 && customTeams.filter(t => t.name.trim()).length === 0}
            >
              Suivant
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          
          {currentStep === 2 && (
            <Button
              onClick={handleCreateTeams}
              disabled={loading}
            >
              {loading ? 'Création...' : 'Créer les équipes'}
            </Button>
          )}
          
          {currentStep === 3 && (
            <Button onClick={() => onComplete(createdTeams)}>
              Continuer
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};