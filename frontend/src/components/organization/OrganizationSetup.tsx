/**
 * Composant pour la configuration initiale de l'organisation
 * et la redirection automatique vers l'organisation d'appartenance
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Building,
  CheckCircle,
  ArrowRight,
  Loader2
} from 'lucide-react';
import {
  organizationService,
  teamService,
  userService
} from '@/services';
import {
  OrganizationSector,
  type CreateOrganizationRequest
} from '@attendance-x/shared';

// Local interface for user organization membership response
interface UserOrganizationMembership {
  organizationId: string;
  organizationName: string;
  role: string;
  isActive: boolean;
  joinedAt: Date;
}
import { useToast } from '@/hooks/use-toast';
import { useErrorHandler } from '@/hooks/use-error-handler';


interface OrganizationSetupProps {
  userId: string;
  userEmail: string;
  initialOrganizationName?: string;
}

interface SetupStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export const OrganizationSetup: React.FC<OrganizationSetupProps> = ({
  userId,
  userEmail,
  initialOrganizationName
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { executeWithErrorHandling, isError, error, clearError } = useErrorHandler();

  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [userOrganizations, setUserOrganizations] = useState<UserOrganizationMembership[]>([]);
  const [creatingOrganization, setCreatingOrganization] = useState(false);

  // Données du formulaire d'organisation
  const [organizationData, setOrganizationData] = useState<Partial<CreateOrganizationRequest>>({
    name: initialOrganizationName || '',
    displayName: initialOrganizationName || '',
    description: '',
    sector: OrganizationSector.OTHER,
    contactInfo: {
      email: userEmail,
      phone: '',
      address: {
        street: '',
        city: '',
        postalCode: '',
        country: 'France'
      }
    }
  });

  // Données des équipes par défaut
  const [defaultTeams, setDefaultTeams] = useState<Array<{
    name: string;
    description: string;
    department: string;
  }>>([]);

  const steps: SetupStep[] = [
    {
      id: 'check-membership',
      title: 'Vérification des Appartenances',
      description: 'Vérification de vos organisations existantes',
      completed: false
    },
    {
      id: 'organization-info',
      title: 'Informations de l\'Organisation',
      description: 'Nom, secteur et informations de contact',
      completed: false
    },
    {
      id: 'teams-setup',
      title: 'Configuration des Équipes',
      description: 'Création des équipes par défaut',
      completed: false
    },
    {
      id: 'completion',
      title: 'Finalisation',
      description: 'Configuration terminée',
      completed: false
    }
  ];

  useEffect(() => {
    checkUserOrganizations();
  }, [userId]);

  /**
   * Vérifier si l'utilisateur appartient déjà à des organisations
   */
  const checkUserOrganizations = async () => {
    // Vérifier s'il y a un nom d'organisation en attente dans le localStorage
    const pendingOrgName = localStorage.getItem("pendingOrganizationName");
    if (pendingOrgName && !organizationData.name) {
      setOrganizationData(prev => ({
        ...prev,
        name: pendingOrgName,
        displayName: pendingOrgName
      }));
    }

    // Utiliser le gestionnaire d'erreurs pour récupérer les organisations
    const response = await executeWithErrorHandling(
      () => userService.getUserOrganizations(userId),
      {
        showToast: false, // Ne pas afficher de toast pour cette vérification
        logError: false,  // Ne pas logger comme erreur, c'est un cas normal
        fallbackMessage: 'Impossible de vérifier les organisations existantes'
      }
    );

    if (response?.success && response.data && response.data.length > 0) {
      setUserOrganizations(response.data);

      // Si l'utilisateur n'appartient qu'à une organisation, rediriger automatiquement
      if (response.data.length === 1) {
        console.log(response);
        console.log(response.data);
        const organization = response.data[0];
        toast({
          title: "Redirection automatique",
          description: `Vous êtes redirigé vers ${organization.organizationName}`
        });

        setTimeout(() => {
          navigate(`/organization/${organization.organizationId}/dashboard`);
        }, 2000);
        return;
      }

      // Si plusieurs organisations, laisser l'utilisateur choisir
      setCurrentStep(0);
    } else {
      // Aucune organisation trouvée ou erreur API, permettre la création
      console.info('Aucune organisation trouvée pour l\'utilisateur, passage à la création');
      setCurrentStep(1);
    }

    setLoading(false);
  };

  /**
   * Créer une nouvelle organisation
   */
  const createOrganization = async () => {
    // Validation des données
    if (!organizationData.name || !organizationData.sector) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    setCreatingOrganization(true);

    const result = await executeWithErrorHandling(
      async () => {
        // Créer l'organisation
        const organization = await organizationService.createOrganization(organizationData as CreateOrganizationRequest);

        toast({
          title: "Organisation créée",
          description: `${organization.name} a été créée avec succès`
        });

        // Passer à l'étape suivante
        setCurrentStep(2);

        // Créer les équipes par défaut si configurées
        if (defaultTeams.length > 0) {
          await createDefaultTeams(organization.id);
        }

        // Finaliser la configuration
        setCurrentStep(3);

        // Rediriger vers l'organisation
        setTimeout(() => {
          navigate(`/organization/${organization.id}/dashboard`);
        }, 2000);

        return organization;
      },
      {
        showToast: false, // Nous gérons les toasts manuellement
        logError: true,
        fallbackMessage: 'Erreur lors de la création de l\'organisation'
      }
    );

    // Gestion spéciale pour le cas "utilisateur déjà membre"
    if (!result && error) {
      if (error.message?.includes('appartient déjà') ||
        error.message?.includes('already member') ||
        error.message?.includes('USER_ALREADY_MEMBER') ||
        error.message?.includes('isExistingMembership')) {

        await handleExistingMembership();
      } else {
        // Autres erreurs
        toast({
          title: "Erreur de création",
          description: error.message || "Impossible de créer l'organisation",
          variant: "destructive"
        });
      }
    }

    setCreatingOrganization(false);
  };

  /**
   * Gérer le cas où l'utilisateur appartient déjà à une organisation
   */
  const handleExistingMembership = async () => {
    toast({
      title: "Organisation existante détectée",
      description: "Finalisation de votre inscription en cours..."
    });

    const response = await executeWithErrorHandling(
      () => userService.getUserOrganizations(userId),
      {
        showToast: false,
        logError: true,
        fallbackMessage: 'Impossible de récupérer les organisations existantes'
      }
    );

    if (response?.success && response.data && response.data.length > 0) {
      const organization = response.data[0];


      toast({
        title: "Inscription finalisée",
        description: `Bienvenue dans ${organization.organizationName} !`
      });

      // Rediriger vers l'organisation
      setTimeout(() => {
        navigate(`/organization/${organization.organizationId}/dashboard`);
      }, 1500);

      return;
    }

    // Si on ne peut pas récupérer les organisations, afficher un message générique
    toast({
      title: "Organisation existante",
      description: "Vous appartenez déjà à une organisation. Redirection vers le dashboard...",
      variant: "default"
    });

    setTimeout(() => {
      navigate('/dashboard');
    }, 2000);
  };

  /**
   * Créer les équipes par défaut
   */
  const createDefaultTeams = async (organizationId: string) => {
    try {
      for (const teamData of defaultTeams) {
        await teamService.createTeam(organizationId, {
          name: teamData.name,
          description: teamData.description,
          department: teamData.department,
          managerId: userId, // The user creating the organization becomes the manager
          settings: {
            canValidateAttendance: teamData.name.toLowerCase().includes('manager') ||
              teamData.name.toLowerCase().includes('admin'),
            canCreateEvents: teamData.name.toLowerCase().includes('manager') ||
              teamData.name.toLowerCase().includes('admin') ||
              teamData.name.toLowerCase().includes('direction'),
            canInviteParticipants: true,
            canViewAllEvents: teamData.name.toLowerCase().includes('manager') ||
              teamData.name.toLowerCase().includes('admin') ||
              teamData.name.toLowerCase().includes('direction'),
            canExportData: teamData.name.toLowerCase().includes('manager') ||
              teamData.name.toLowerCase().includes('admin'),
            maxEventsPerMonth: teamData.name.toLowerCase().includes('admin') ? undefined : 10
          }
        });
      }

      toast({
        title: "Équipes créées",
        description: `${defaultTeams.length} équipes ont été créées`
      });
    } catch (error) {
      console.error('Erreur lors de la création des équipes:', error);
      toast({
        title: "Erreur",
        description: "Certaines équipes n'ont pas pu être créées",
        variant: "destructive"
      });
    }
  };

  /**
   * Obtenir les équipes par défaut selon le secteur
   */
  const getDefaultTeamsForSector = (sector: OrganizationSector) => {
    const teamTemplates: Record<OrganizationSector, Array<{ name: string; description: string; department: string }>> = {
      [OrganizationSector.EDUCATION]: [
        { name: 'Administration', description: 'Équipe administrative', department: 'Administration' },
        { name: 'Enseignants', description: 'Corps enseignant', department: 'Pédagogie' },
        { name: 'Support Technique', description: 'Support informatique', department: 'IT' }
      ],
      [OrganizationSector.HEALTHCARE]: [
        { name: 'Médecins', description: 'Personnel médical', department: 'Médical' },
        { name: 'Infirmiers', description: 'Personnel infirmier', department: 'Soins' },
        { name: 'Administration', description: 'Administration hospitalière', department: 'Administration' }
      ],
      [OrganizationSector.CORPORATE]: [
        { name: 'Direction', description: 'Équipe de direction', department: 'Management' },
        { name: 'Ressources Humaines', description: 'Gestion RH', department: 'RH' },
        { name: 'IT', description: 'Équipe informatique', department: 'Technique' },
        { name: 'Commercial', description: 'Équipe commerciale', department: 'Ventes' }
      ],
      [OrganizationSector.GOVERNMENT]: [
        { name: 'Administration', description: 'Administration publique', department: 'Administration' },
        { name: 'Services aux Citoyens', description: 'Accueil du public', department: 'Service Public' }
      ],
      [OrganizationSector.NON_PROFIT]: [
        { name: 'Direction', description: 'Équipe dirigeante', department: 'Management' },
        { name: 'Bénévoles', description: 'Équipe bénévole', department: 'Bénévolat' },
        { name: 'Communication', description: 'Communication et fundraising', department: 'Communication' }
      ],
      [OrganizationSector.OTHER]: [
        { name: 'Équipe Principale', description: 'Équipe principale', department: 'Général' }
      ],
      [OrganizationSector.TECHNOLOGY]: [
        { name: 'Direction', description: 'Équipe de direction', department: 'Management' },
        { name: 'Ressources Humaines', description: 'Gestion RH', department: 'RH' },
        { name: 'IT', description: 'Équipe informatique', department: 'Technique' },
        { name: 'Commercial', description: 'Équipe commerciale', department: 'Ventes' }
      ],
      [OrganizationSector.FINANCE]: [],
      [OrganizationSector.RETAIL]: [],
      [OrganizationSector.MANUFACTURING]: [],
      [OrganizationSector.HOSPITALITY]: [],
      [OrganizationSector.CONSULTING]: [],
      [OrganizationSector.SERVICES]: [],
      [OrganizationSector.ASSOCIATION]: []
    };

    return teamTemplates[sector] || teamTemplates[OrganizationSector.OTHER];
  };

  useEffect(() => {
    if (organizationData.sector) {
      setDefaultTeams(getDefaultTeamsForSector(organizationData.sector));
    }
  }, [organizationData.sector]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building className="h-8 w-8 text-blue-600" />
            </div>
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-4 text-blue-600" />
            <h3 className="text-lg font-semibold mb-2">Initialisation...</h3>
            <p className="text-muted-foreground text-sm">
              Préparation de votre espace de travail AttendanceX
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Étape 0: Choix de l'organisation si plusieurs
  if (currentStep === 0 && userOrganizations.length > 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Building className="h-6 w-6 text-blue-600" />
              Sélectionner votre Organisation
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              Vous appartenez à {userOrganizations.length} organisations. Choisissez celle que vous souhaitez utiliser :
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {userOrganizations.map((membership) => (
                <div
                  key={membership.organizationId}
                  className="p-4 border-2 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all duration-200 group"
                  onClick={() => {
                    toast({
                      title: "Redirection en cours",
                      description: `Accès à ${membership.organizationName}...`
                    });
                    navigate(`/organization/${membership.organizationId}/dashboard`);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Building className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-900">
                            {membership.organizationName}
                          </h3>
                          <div className="flex items-center gap-4 mt-1">
                            <p className="text-sm text-muted-foreground">
                              Rôle: <span className="font-medium capitalize">{membership.role}</span>
                            </p>
                            <div className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${membership.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                              <span className="text-xs text-muted-foreground">
                                {membership.isActive ? 'Actif' : 'Inactif'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-600 transition-colors" />
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Créer une nouvelle organisation</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Vous pouvez également créer une nouvelle organisation si vous gérez plusieurs entreprises.
              </p>
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="w-full"
              >
                <Building className="w-4 h-4 mr-2" />
                Créer une nouvelle organisation
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Affichage d'erreur si nécessaire
  if (isError && error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-xl text-gray-900">
              Erreur de configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">
                {error.message || 'Une erreur inattendue s\'est produite'}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={clearError} className="w-full">
                Réessayer
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="w-full"
              >
                Retour au tableau de bord
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Étapes de création d'organisation
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Indicateur de progression */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${index <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                      }`}
                  >
                    {index < currentStep ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-4 ${index < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contenu de l'étape actuelle */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Créer votre Organisation
              </CardTitle>
              <p className="text-muted-foreground mt-2">
                Configurez votre organisation pour commencer à gérer les présences de vos équipes.
              </p>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Building className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 mb-2">
                      🚀 Bienvenue dans AttendanceX !
                    </h4>
                    <p className="text-sm text-blue-700 mb-2">
                      Vous êtes sur le point de créer votre première organisation. Cette étape vous permettra de :
                    </p>
                    <ul className="text-sm text-blue-700 space-y-1 ml-4">
                      <li>• Gérer les présences de vos équipes</li>
                      <li>• Organiser des événements et réunions</li>
                      <li>• Suivre les statistiques de présence</li>
                      <li>• Créer des équipes et assigner des rôles</li>
                    </ul>
                    <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-800">
                      💡 <strong>Astuce :</strong> Vous pouvez passer cette étape et explorer l'application d'abord, puis revenir configurer votre organisation plus tard.
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-1">
                    Nom de l'organisation
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={organizationData.name}
                    onChange={(e) => setOrganizationData({
                      ...organizationData,
                      name: e.target.value,
                      displayName: e.target.value // Auto-remplir le nom d'affichage
                    })}
                    placeholder="Ex: Mon Entreprise, École Centrale, Hôpital Saint-Jean..."
                    className={!organizationData.name ? 'border-red-200 focus:border-red-500' : ''}
                  />
                  {initialOrganizationName && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Nom récupéré depuis votre inscription
                    </p>
                  )}
                  {!organizationData.name && (
                    <p className="text-sm text-red-600">Ce champ est obligatoire</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">Nom d'affichage</Label>
                  <Input
                    id="displayName"
                    value={organizationData.displayName}
                    onChange={(e) => setOrganizationData({
                      ...organizationData,
                      displayName: e.target.value
                    })}
                    placeholder="Nom affiché publiquement (optionnel)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Si vide, le nom de l'organisation sera utilisé
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sector" className="flex items-center gap-1">
                  Secteur d'activité
                  <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={organizationData.sector}
                  onValueChange={(value) => setOrganizationData({
                    ...organizationData,
                    sector: value as OrganizationSector
                  })}
                >
                  <SelectTrigger className={!organizationData.sector ? 'border-red-200 focus:border-red-500' : ''}>
                    <SelectValue placeholder="Choisissez votre secteur d'activité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={OrganizationSector.EDUCATION}>🎓 Éducation</SelectItem>
                    <SelectItem value={OrganizationSector.HEALTHCARE}>🏥 Santé</SelectItem>
                    <SelectItem value={OrganizationSector.CORPORATE}>🏢 Entreprise</SelectItem>
                    <SelectItem value={OrganizationSector.TECHNOLOGY}>💻 Technologie</SelectItem>
                    <SelectItem value={OrganizationSector.GOVERNMENT}>🏛️ Administration publique</SelectItem>
                    <SelectItem value={OrganizationSector.NON_PROFIT}>🤝 Association / ONG</SelectItem>
                    <SelectItem value={OrganizationSector.FINANCE}>💰 Finance</SelectItem>
                    <SelectItem value={OrganizationSector.RETAIL}>🛍️ Commerce</SelectItem>
                    <SelectItem value={OrganizationSector.MANUFACTURING}>🏭 Industrie</SelectItem>
                    <SelectItem value={OrganizationSector.HOSPITALITY}>🏨 Hôtellerie</SelectItem>
                    <SelectItem value={OrganizationSector.CONSULTING}>📊 Conseil</SelectItem>
                    <SelectItem value={OrganizationSector.SERVICES}>🔧 Services</SelectItem>
                    <SelectItem value={OrganizationSector.OTHER}>🔹 Autre</SelectItem>
                  </SelectContent>
                </Select>
                {!organizationData.sector && (
                  <p className="text-sm text-red-600">Veuillez sélectionner un secteur</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Le secteur détermine les équipes par défaut qui seront créées
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={organizationData.description}
                  onChange={(e) => setOrganizationData({
                    ...organizationData,
                    description: e.target.value
                  })}
                  placeholder="Description de votre organisation"
                  rows={3}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Informations de Contact</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={organizationData.contactInfo?.email}
                      onChange={(e) => setOrganizationData({
                        ...organizationData,
                        contactInfo: {
                          ...organizationData.contactInfo!,
                          email: e.target.value
                        }
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      value={organizationData.contactInfo?.phone}
                      onChange={(e) => setOrganizationData({
                        ...organizationData,
                        contactInfo: {
                          ...organizationData.contactInfo!,
                          phone: e.target.value
                        }
                      })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input
                    id="address"
                    value={organizationData.contactInfo?.address?.street}
                    onChange={(e) => setOrganizationData({
                      ...organizationData,
                      contactInfo: {
                        ...organizationData.contactInfo!,
                        address: {
                          ...organizationData.contactInfo!.address!,
                          street: e.target.value
                        }
                      }
                    })}
                    placeholder="Adresse complète"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Ville</Label>
                    <Input
                      id="city"
                      value={organizationData.contactInfo?.address?.city}
                      onChange={(e) => setOrganizationData({
                        ...organizationData,
                        contactInfo: {
                          ...organizationData.contactInfo!,
                          address: {
                            ...organizationData.contactInfo!.address!,
                            city: e.target.value
                          }
                        }
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Code postal</Label>
                    <Input
                      id="postalCode"
                      value={organizationData.contactInfo?.address?.postalCode}
                      onChange={(e) => setOrganizationData({
                        ...organizationData,
                        contactInfo: {
                          ...organizationData.contactInfo!,
                          address: {
                            ...organizationData.contactInfo!.address!,
                            postalCode: e.target.value
                          }
                        }
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Pays</Label>
                    <Input
                      id="country"
                      value={organizationData.contactInfo?.address?.country}
                      onChange={(e) => setOrganizationData({
                        ...organizationData,
                        contactInfo: {
                          ...organizationData.contactInfo!,
                          address: {
                            ...organizationData.contactInfo!.address!,
                            country: e.target.value
                          }
                        }
                      })}
                    />
                  </div>
                </div>
              </div>

              {/* Aperçu des équipes par défaut */}
              {defaultTeams.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">🏗️ Équipes par Défaut</h3>
                      <Badge variant="secondary" className="text-xs">
                        {defaultTeams.length} équipe{defaultTeams.length > 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-700">
                        ✨ <strong>Génial !</strong> Nous allons créer automatiquement {defaultTeams.length} équipe{defaultTeams.length > 1 ? 's' : ''} adaptée{defaultTeams.length > 1 ? 's' : ''} à votre secteur d'activité.
                        Vous pourrez les modifier ou en ajouter d'autres plus tard.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {defaultTeams.map((team, index) => (
                        <div key={index} className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg hover:shadow-sm transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-blue-900">{team.name}</h4>
                              <p className="text-sm text-blue-700 mt-1">{team.description}</p>
                            </div>
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                          </div>
                          <Badge variant="outline" className="mt-2 text-xs bg-white">
                            📁 {team.department}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                   
                    toast({
                      title: "Configuration reportée",
                      description: "Vous pourrez configurer votre organisation plus tard depuis votre profil"
                    });
                    // Rediriger vers le dashboard sans organisation
                    navigate('/dashboard', {
                      state: {
                        skipOrganizationSetup: true,
                        message: "Vous pouvez explorer l'application et configurer votre organisation plus tard."
                      }
                    });
                  }}
                  className="sm:w-auto w-full"
                >
                  ⏭️ Explorer d'abord l'application
                </Button>

                <Button
                  onClick={createOrganization}
                  disabled={creatingOrganization || !organizationData.name || !organizationData.sector}
                  className="sm:w-auto w-full"
                  size="lg"
                >
                  {creatingOrganization ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      🏢 Créer mon Organisation
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Étape de finalisation */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Configuration Terminée
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="text-green-600">
                <CheckCircle className="h-16 w-16 mx-auto mb-4" />
              </div>
              <h3 className="text-xl font-semibold">
                Félicitations ! Votre organisation est prête.
              </h3>
              <p className="text-muted-foreground">
                {organizationData.name} a été configurée avec succès.
                Vous allez être redirigé vers votre tableau de bord.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Redirection en cours...
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};