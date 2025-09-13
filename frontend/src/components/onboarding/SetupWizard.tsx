/**
 * Wizard de configuration pour l'onboarding
 * Interface multi-étapes pour configurer une nouvelle organisation
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Users,
  Building2,
  Settings,
  Database,
  Sparkles,
  Loader2,
  Plus,
  Trash2,
  Mail
} from 'lucide-react';

interface SetupWizardStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
  order: number;
}

interface SetupWizardStatus {
  tenantId: string;
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  steps: SetupWizardStep[];
  isComplete: boolean;
}

interface OrganizationProfile {
  name: string;
  description: string;
  website: string;
  industry: string;
  size: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  settings: {
    timezone: string;
    language: string;
    currency: string;
    dateFormat: string;
    timeFormat: string;
  };
}

interface UserInvitation {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string;
}

interface DemoDataOptions {
  generateUsers: boolean;
  generateEvents: boolean;
  generateAttendance: boolean;
  industry: string;
  userCount: number;
  eventCount: number;
}

const INDUSTRIES = [
  { value: 'education', label: 'Éducation' },
  { value: 'healthcare', label: 'Santé' },
  { value: 'corporate', label: 'Entreprise' },
  { value: 'government', label: 'Gouvernement' },
  { value: 'non_profit', label: 'Association' },
  { value: 'technology', label: 'Technologie' },
  { value: 'other', label: 'Autre' }
];

const SIZES = [
  { value: 'small', label: '1-10 employés' },
  { value: 'medium', label: '11-50 employés' },
  { value: 'large', label: '51-200 employés' },
  { value: 'enterprise', label: '200+ employés' }
];

const ROLES = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'manager', label: 'Manager' },
  { value: 'user', label: 'Utilisateur' },
  { value: 'viewer', label: 'Observateur' }
];

const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'de', label: 'Deutsch' }
];

const CURRENCIES = [
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'GBP', label: 'British Pound (£)' },
  { value: 'CAD', label: 'Canadian Dollar (C$)' }
];

export const SetupWizard: React.FC = () => {
  const [wizardStatus, setWizardStatus] = useState<SetupWizardStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStepData, setCurrentStepData] = useState<any>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<any>(null);

  // États pour chaque étape
  const [organizationProfile, setOrganizationProfile] = useState<OrganizationProfile>({
    name: '',
    description: '',
    website: '',
    industry: '',
    size: '',
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'FR'
    },
    settings: {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: 'fr',
      currency: 'EUR',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h'
    }
  });

  const [userInvitations, setUserInvitations] = useState<UserInvitation[]>([
    { email: '', firstName: '', lastName: '', role: 'user', department: '' }
  ]);

  const [demoDataOptions, setDemoDataOptions] = useState<DemoDataOptions>({
    generateUsers: true,
    generateEvents: true,
    generateAttendance: true,
    industry: '',
    userCount: 10,
    eventCount: 20
  });

  useEffect(() => {
    loadWizardStatus();
  }, []);

  useEffect(() => {
    if (organizationProfile.industry) {
      loadIndustrySuggestions(organizationProfile.industry);
    }
  }, [organizationProfile.industry]);

  const loadWizardStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/setup-wizard/status');
      const data = await response.json();
      
      if (data.success) {
        setWizardStatus(data.data);
      }
    } catch (error) {
      console.error('Error loading wizard status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadIndustrySuggestions = async (industry: string) => {
    try {
      const response = await fetch(`/api/setup-wizard/industry-suggestions/${industry}`);
      const data = await response.json();
      
      if (data.success) {
        setSuggestions(data.data);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const completeStep = async (stepId: string, stepData?: any) => {
    try {
      const response = await fetch('/api/setup-wizard/complete-step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stepId,
          stepData
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setWizardStatus(data.data);
        return true;
      } else {
        setErrors({ submit: data.error });
        return false;
      }
    } catch (error) {
      console.error('Error completing step:', error);
      setErrors({ submit: 'Erreur de connexion' });
      return false;
    }
  };

  const handleOrganizationProfileSubmit = async () => {
    try {
      const response = await fetch('/api/setup-wizard/organization-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(organizationProfile)
      });

      const data = await response.json();
      
      if (data.success) {
        await loadWizardStatus();
        return true;
      } else {
        setErrors({ submit: data.error });
        return false;
      }
    } catch (error) {
      console.error('Error saving organization profile:', error);
      setErrors({ submit: 'Erreur de connexion' });
      return false;
    }
  };

  const handleUserInvitationsSubmit = async () => {
    const validInvitations = userInvitations.filter(inv => 
      inv.email && inv.firstName && inv.lastName
    );

    if (validInvitations.length === 0) {
      // Passer cette étape si aucune invitation
      return await completeStep('user_invitations', { skipped: true });
    }

    try {
      const response = await fetch('/api/setup-wizard/invite-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitations: validInvitations
        })
      });

      const data = await response.json();
      
      if (data.success) {
        await loadWizardStatus();
        return true;
      } else {
        setErrors({ submit: data.error });
        return false;
      }
    } catch (error) {
      console.error('Error sending invitations:', error);
      setErrors({ submit: 'Erreur de connexion' });
      return false;
    }
  };

  const handleDemoDataSubmit = async () => {
    if (!demoDataOptions.generateUsers && !demoDataOptions.generateEvents) {
      // Passer cette étape si aucune donnée de démo
      return await completeStep('demo_data', { skipped: true });
    }

    try {
      const response = await fetch('/api/setup-wizard/generate-demo-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...demoDataOptions,
          industry: organizationProfile.industry
        })
      });

      const data = await response.json();
      
      if (data.success) {
        await loadWizardStatus();
        return true;
      } else {
        setErrors({ submit: data.error });
        return false;
      }
    } catch (error) {
      console.error('Error generating demo data:', error);
      setErrors({ submit: 'Erreur de connexion' });
      return false;
    }
  };

  const handleCompleteSetup = async () => {
    try {
      const response = await fetch('/api/setup-wizard/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      
      if (data.success) {
        // Rediriger vers le dashboard
        window.location.href = '/dashboard';
        return true;
      } else {
        setErrors({ submit: data.error });
        return false;
      }
    } catch (error) {
      console.error('Error completing setup:', error);
      setErrors({ submit: 'Erreur de connexion' });
      return false;
    }
  };

  const addUserInvitation = () => {
    setUserInvitations([
      ...userInvitations,
      { email: '', firstName: '', lastName: '', role: 'user', department: '' }
    ]);
  };

  const removeUserInvitation = (index: number) => {
    setUserInvitations(userInvitations.filter((_, i) => i !== index));
  };

  const updateUserInvitation = (index: number, field: keyof UserInvitation, value: string) => {
    const updated = [...userInvitations];
    updated[index] = { ...updated[index], [field]: value };
    setUserInvitations(updated);
  };

  if (loading) {
    return (
      <div className=\"flex items-center justify-center min-h-screen\">
        <Loader2 className=\"w-8 h-8 animate-spin\" />
      </div>
    );
  }

  if (!wizardStatus) {
    return (
      <div className=\"max-w-2xl mx-auto p-6\">
        <Alert>
          <AlertDescription>
            Impossible de charger le wizard de configuration.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const currentStep = wizardStatus.steps.find(step => step.order === wizardStatus.currentStep);
  const progress = (wizardStatus.completedSteps.length / wizardStatus.totalSteps) * 100;

  return (
    <div className=\"max-w-4xl mx-auto p-6\">
      {/* En-tête */}
      <div className=\"mb-8\">
        <h1 className=\"text-3xl font-bold text-center mb-2\">Configuration de votre organisation</h1>
        <p className=\"text-gray-600 text-center mb-6\">
          Configurons votre espace de travail ensemble
        </p>
        
        <div className=\"mb-6\">
          <Progress value={progress} className=\"h-3\" />
          <div className=\"flex justify-between mt-2 text-sm text-gray-600\">
            <span>Étape {wizardStatus.currentStep} sur {wizardStatus.totalSteps}</span>
            <span>{Math.round(progress)}% complété</span>
          </div>
        </div>

        {/* Navigation des étapes */}
        <div className=\"flex justify-center space-x-4 mb-8 overflow-x-auto\">
          {wizardStatus.steps.map((step) => {
            const isActive = step.order === wizardStatus.currentStep;
            const isCompleted = step.completed;
            
            return (
              <div key={step.id} className=\"flex items-center min-w-0\">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                  ${isActive ? 'bg-blue-600 text-white' : 
                    isCompleted ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}
                `}>
                  {isCompleted ? (
                    <CheckCircle className=\"w-5 h-5\" />
                  ) : (
                    <span className=\"text-sm font-medium\">{step.order}</span>
                  )}
                </div>
                <div className=\"ml-2 min-w-0\">
                  <div className={`text-sm font-medium truncate ${
                    isActive ? 'text-blue-600' : 
                    isCompleted ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {step.title}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className=\"flex items-center gap-2\">
            {currentStep?.id === 'welcome' && <Sparkles className=\"w-5 h-5\" />}
            {currentStep?.id === 'organization_profile' && <Building2 className=\"w-5 h-5\" />}
            {currentStep?.id === 'user_invitations' && <Users className=\"w-5 h-5\" />}
            {currentStep?.id === 'demo_data' && <Database className=\"w-5 h-5\" />}
            {currentStep?.id === 'preferences' && <Settings className=\"w-5 h-5\" />}
            {currentStep?.id === 'completion' && <CheckCircle className=\"w-5 h-5\" />}
            {currentStep?.title}
          </CardTitle>
          <CardDescription>
            {currentStep?.description}
          </CardDescription>
        </CardHeader>

        <CardContent className=\"space-y-6\">
          {/* Étape Bienvenue */}
          {currentStep?.id === 'welcome' && (
            <div className=\"text-center space-y-6\">
              <div className=\"w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto\">
                <Sparkles className=\"w-10 h-10 text-blue-600\" />
              </div>
              
              <div>
                <h2 className=\"text-2xl font-semibold mb-4\">Bienvenue dans votre nouvelle organisation !</h2>
                <p className=\"text-gray-600 mb-6\">
                  Nous allons vous guider à travers quelques étapes simples pour configurer votre espace de travail.
                  Cela ne prendra que quelques minutes.
                </p>
                
                <div className=\"bg-blue-50 p-4 rounded-lg mb-6\">
                  <h3 className=\"font-medium mb-2\">Ce que nous allons configurer :</h3>
                  <ul className=\"text-sm space-y-1 text-left\">
                    <li>✓ Profil de votre organisation</li>
                    <li>✓ Invitation de vos collaborateurs</li>
                    <li>✓ Données de démonstration (optionnel)</li>
                    <li>✓ Préférences personnelles</li>
                  </ul>
                </div>
              </div>
              
              <Button 
                onClick={() => completeStep('welcome')}
                size=\"lg\"
                className=\"px-8\"
              >
                Commencer la configuration
                <ArrowRight className=\"w-4 h-4 ml-2\" />
              </Button>
            </div>
          )}

          {/* Étape Profil Organisation */}
          {currentStep?.id === 'organization_profile' && (
            <div className=\"space-y-6\">
              <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
                <div>
                  <Label htmlFor=\"orgName\">Nom de l'organisation *</Label>
                  <Input
                    id=\"orgName\"
                    value={organizationProfile.name}
                    onChange={(e) => setOrganizationProfile({
                      ...organizationProfile,
                      name: e.target.value
                    })}
                    placeholder=\"Mon Entreprise\"
                  />
                </div>
                
                <div>
                  <Label htmlFor=\"website\">Site web</Label>
                  <Input
                    id=\"website\"
                    type=\"url\"
                    value={organizationProfile.website}
                    onChange={(e) => setOrganizationProfile({
                      ...organizationProfile,
                      website: e.target.value
                    })}
                    placeholder=\"https://mon-entreprise.com\"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor=\"description\">Description</Label>
                <Textarea
                  id=\"description\"
                  value={organizationProfile.description}
                  onChange={(e) => setOrganizationProfile({
                    ...organizationProfile,
                    description: e.target.value
                  })}
                  placeholder=\"Décrivez votre organisation...\"
                  rows={3}
                />
              </div>

              <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
                <div>
                  <Label htmlFor=\"industry\">Secteur d'activité *</Label>
                  <Select 
                    value={organizationProfile.industry} 
                    onValueChange={(value) => setOrganizationProfile({
                      ...organizationProfile,
                      industry: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder=\"Sélectionnez votre secteur\" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map(industry => (
                        <SelectItem key={industry.value} value={industry.value}>
                          {industry.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor=\"size\">Taille de l'organisation *</Label>
                  <Select 
                    value={organizationProfile.size} 
                    onValueChange={(value) => setOrganizationProfile({
                      ...organizationProfile,
                      size: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder=\"Sélectionnez la taille\" />
                    </SelectTrigger>
                    <SelectContent>
                      {SIZES.map(size => (
                        <SelectItem key={size.value} value={size.value}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4\">
                <div>
                  <Label htmlFor=\"language\">Langue</Label>
                  <Select 
                    value={organizationProfile.settings.language} 
                    onValueChange={(value) => setOrganizationProfile({
                      ...organizationProfile,
                      settings: { ...organizationProfile.settings, language: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(lang => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor=\"currency\">Devise</Label>
                  <Select 
                    value={organizationProfile.settings.currency} 
                    onValueChange={(value) => setOrganizationProfile({
                      ...organizationProfile,
                      settings: { ...organizationProfile.settings, currency: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(currency => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor=\"timezone\">Fuseau horaire</Label>
                  <Input
                    id=\"timezone\"
                    value={organizationProfile.settings.timezone}
                    onChange={(e) => setOrganizationProfile({
                      ...organizationProfile,
                      settings: { ...organizationProfile.settings, timezone: e.target.value }
                    })}
                    placeholder=\"Europe/Paris\"
                  />
                </div>
              </div>

              <div className=\"flex justify-between\">
                <Button variant=\"outline\" disabled>
                  <ArrowLeft className=\"w-4 h-4 mr-2\" />
                  Précédent
                </Button>
                
                <Button 
                  onClick={handleOrganizationProfileSubmit}
                  disabled={!organizationProfile.name || !organizationProfile.industry || !organizationProfile.size}
                >
                  Continuer
                  <ArrowRight className=\"w-4 h-4 ml-2\" />
                </Button>
              </div>
            </div>
          )}

          {/* Étape Invitations Utilisateurs */}
          {currentStep?.id === 'user_invitations' && (
            <div className=\"space-y-6\">
              <div>
                <h3 className=\"text-lg font-medium mb-2\">Invitez vos collaborateurs</h3>
                <p className=\"text-gray-600 mb-4\">
                  Invitez vos collègues à rejoindre votre organisation. Vous pourrez toujours ajouter plus d'utilisateurs plus tard.
                </p>
              </div>

              <div className=\"space-y-4\">
                {userInvitations.map((invitation, index) => (
                  <div key={index} className=\"border rounded-lg p-4\">
                    <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4\">
                      <div>
                        <Label htmlFor={`email-${index}`}>Email *</Label>
                        <Input
                          id={`email-${index}`}
                          type=\"email\"
                          value={invitation.email}
                          onChange={(e) => updateUserInvitation(index, 'email', e.target.value)}
                          placeholder=\"john.doe@example.com\"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`firstName-${index}`}>Prénom *</Label>
                        <Input
                          id={`firstName-${index}`}
                          value={invitation.firstName}
                          onChange={(e) => updateUserInvitation(index, 'firstName', e.target.value)}
                          placeholder=\"John\"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`lastName-${index}`}>Nom *</Label>
                        <Input
                          id={`lastName-${index}`}
                          value={invitation.lastName}
                          onChange={(e) => updateUserInvitation(index, 'lastName', e.target.value)}
                          placeholder=\"Doe\"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`role-${index}`}>Rôle</Label>
                        <Select 
                          value={invitation.role} 
                          onValueChange={(value) => updateUserInvitation(index, 'role', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map(role => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className=\"flex items-end\">
                        {userInvitations.length > 1 && (
                          <Button
                            variant=\"outline\"
                            size=\"sm\"
                            onClick={() => removeUserInvitation(index)}
                            className=\"w-full\"
                          >
                            <Trash2 className=\"w-4 h-4\" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                variant=\"outline\"
                onClick={addUserInvitation}
                className=\"w-full\"
              >
                <Plus className=\"w-4 h-4 mr-2\" />
                Ajouter une invitation
              </Button>

              {suggestions && (
                <div className=\"bg-blue-50 p-4 rounded-lg\">
                  <h4 className=\"font-medium mb-2\">Suggestions pour votre secteur :</h4>
                  <div className=\"text-sm space-y-1\">
                    <div><strong>Rôles suggérés :</strong> {suggestions.userRoles?.join(', ')}</div>
                    <div><strong>Départements :</strong> {suggestions.departments?.join(', ')}</div>
                  </div>
                </div>
              )}

              <div className=\"flex justify-between\">
                <Button variant=\"outline\" onClick={() => completeStep('organization_profile')}>
                  <ArrowLeft className=\"w-4 h-4 mr-2\" />
                  Précédent
                </Button>
                
                <div className=\"space-x-2\">
                  <Button 
                    variant=\"outline\"
                    onClick={() => completeStep('user_invitations', { skipped: true })}
                  >
                    Passer cette étape
                  </Button>
                  <Button onClick={handleUserInvitationsSubmit}>
                    <Mail className=\"w-4 h-4 mr-2\" />
                    Envoyer les invitations
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Étape Données de Démonstration */}
          {currentStep?.id === 'demo_data' && (
            <div className=\"space-y-6\">
              <div>
                <h3 className=\"text-lg font-medium mb-2\">Données de démonstration</h3>
                <p className=\"text-gray-600 mb-4\">
                  Nous pouvons générer des données d'exemple pour vous aider à découvrir les fonctionnalités de la plateforme.
                </p>
              </div>

              <div className=\"space-y-4\">
                <div className=\"flex items-center space-x-2\">
                  <Checkbox
                    id=\"generateUsers\"
                    checked={demoDataOptions.generateUsers}
                    onCheckedChange={(checked) => setDemoDataOptions({
                      ...demoDataOptions,
                      generateUsers: checked as boolean
                    })}
                  />
                  <Label htmlFor=\"generateUsers\">
                    Générer des utilisateurs de démonstration
                  </Label>
                </div>
                
                {demoDataOptions.generateUsers && (
                  <div className=\"ml-6\">
                    <Label htmlFor=\"userCount\">Nombre d'utilisateurs (1-100)</Label>
                    <Input
                      id=\"userCount\"
                      type=\"number\"
                      min=\"1\"
                      max=\"100\"
                      value={demoDataOptions.userCount}
                      onChange={(e) => setDemoDataOptions({
                        ...demoDataOptions,
                        userCount: parseInt(e.target.value) || 10
                      })}
                      className=\"w-32\"
                    />
                  </div>
                )}

                <div className=\"flex items-center space-x-2\">
                  <Checkbox
                    id=\"generateEvents\"
                    checked={demoDataOptions.generateEvents}
                    onCheckedChange={(checked) => setDemoDataOptions({
                      ...demoDataOptions,
                      generateEvents: checked as boolean
                    })}
                  />
                  <Label htmlFor=\"generateEvents\">
                    Générer des événements de démonstration
                  </Label>
                </div>
                
                {demoDataOptions.generateEvents && (
                  <div className=\"ml-6\">
                    <Label htmlFor=\"eventCount\">Nombre d'événements (1-200)</Label>
                    <Input
                      id=\"eventCount\"
                      type=\"number\"
                      min=\"1\"
                      max=\"200\"
                      value={demoDataOptions.eventCount}
                      onChange={(e) => setDemoDataOptions({
                        ...demoDataOptions,
                        eventCount: parseInt(e.target.value) || 20
                      })}
                      className=\"w-32\"
                    />
                  </div>
                )}

                <div className=\"flex items-center space-x-2\">
                  <Checkbox
                    id=\"generateAttendance\"
                    checked={demoDataOptions.generateAttendance}
                    onCheckedChange={(checked) => setDemoDataOptions({
                      ...demoDataOptions,
                      generateAttendance: checked as boolean
                    })}
                    disabled={!demoDataOptions.generateUsers || !demoDataOptions.generateEvents}
                  />
                  <Label htmlFor=\"generateAttendance\">
                    Générer des données de présence
                  </Label>
                </div>
              </div>

              {suggestions && (
                <div className=\"bg-green-50 p-4 rounded-lg\">
                  <h4 className=\"font-medium mb-2\">Données adaptées à votre secteur :</h4>
                  <div className=\"text-sm space-y-1\">
                    <div><strong>Types d'événements :</strong> {suggestions.eventTypes?.join(', ')}</div>
                    <div><strong>Rôles d'utilisateurs :</strong> {suggestions.userRoles?.join(', ')}</div>
                  </div>
                </div>
              )}

              <div className=\"flex justify-between\">
                <Button variant=\"outline\" onClick={() => completeStep('user_invitations')}>
                  <ArrowLeft className=\"w-4 h-4 mr-2\" />
                  Précédent
                </Button>
                
                <div className=\"space-x-2\">
                  <Button 
                    variant=\"outline\"
                    onClick={() => completeStep('demo_data', { skipped: true })}
                  >
                    Passer cette étape
                  </Button>
                  <Button onClick={handleDemoDataSubmit}>
                    <Database className=\"w-4 h-4 mr-2\" />
                    Générer les données
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Étape Finalisation */}
          {currentStep?.id === 'completion' && (
            <div className=\"text-center space-y-6\">
              <div className=\"w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto\">
                <CheckCircle className=\"w-10 h-10 text-green-600\" />
              </div>
              
              <div>
                <h2 className=\"text-2xl font-semibold mb-4\">Félicitations !</h2>
                <p className=\"text-gray-600 mb-6\">
                  Votre organisation est maintenant configurée et prête à être utilisée.
                </p>
                
                <div className=\"bg-green-50 p-4 rounded-lg mb-6\">
                  <h3 className=\"font-medium mb-2\">Ce qui a été configuré :</h3>
                  <ul className=\"text-sm space-y-1\">
                    {wizardStatus.completedSteps.includes('organization_profile') && (
                      <li>✓ Profil de l'organisation</li>
                    )}
                    {wizardStatus.completedSteps.includes('user_invitations') && (
                      <li>✓ Invitations utilisateurs envoyées</li>
                    )}
                    {wizardStatus.completedSteps.includes('demo_data') && (
                      <li>✓ Données de démonstration générées</li>
                    )}
                  </ul>
                </div>
                
                <div className=\"bg-blue-50 p-4 rounded-lg mb-6\">
                  <h3 className=\"font-medium mb-2\">Prochaines étapes :</h3>
                  <ul className=\"text-sm space-y-1 text-left\">
                    <li>• Explorez votre tableau de bord</li>
                    <li>• Créez vos premiers événements</li>
                    <li>• Invitez plus de collaborateurs</li>
                    <li>• Personnalisez vos paramètres</li>
                  </ul>
                </div>
              </div>
              
              <Button 
                onClick={handleCompleteSetup}
                size=\"lg\"
                className=\"px-8\"
              >
                Accéder au tableau de bord
                <ArrowRight className=\"w-4 h-4 ml-2\" />
              </Button>
            </div>
          )}

          {errors.submit && (
            <Alert className=\"mt-4\">
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SetupWizard;