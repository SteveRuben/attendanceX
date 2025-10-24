/**
 * Formulaire d'enregistrement de tenant
 * Interface complète pour créer une nouvelle organisation
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import { 
  Building2, 
  User, 
  CreditCard, 
  Check, 
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Mail
} from 'lucide-react';

interface RegistrationFormData {
  // Organisation
  organizationName: string;
  organizationSector: string;
  organizationSize: string;
  
  // Administrateur
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  adminPassword: string;
  adminPasswordConfirm: string;
  
  // Abonnement
  selectedPlan: string;
  billingCycle: 'monthly' | 'yearly';
  
  // Préférences
  timezone: string;
  language: string;
  currency: string;
  
  // Consentements
  termsAccepted: boolean;
  privacyAccepted: boolean;
  marketingOptIn: boolean;
}

interface FormErrors {
  [key: string]: string;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  features: string[];
  limits: {
    maxUsers: number;
    maxEvents: number;
    maxStorage: number;
  };
  popular: boolean;
}

const STEPS = [
  { id: 'organization', title: 'Organisation', icon: Building2 },
  { id: 'admin', title: 'Administrateur', icon: User },
  { id: 'plan', title: 'Abonnement', icon: CreditCard },
  { id: 'confirmation', title: 'Confirmation', icon: Check }
];

const SECTORS = [
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

export const TenantRegistrationForm: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<RegistrationFormData>({
    organizationName: '',
    organizationSector: '',
    organizationSize: '',
    adminEmail: '',
    adminFirstName: '',
    adminLastName: '',
    adminPassword: '',
    adminPasswordConfirm: '',
    selectedPlan: 'free',
    billingCycle: 'monthly',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: 'fr',
    currency: 'EUR',
    termsAccepted: false,
    privacyAccepted: false,
    marketingOptIn: false
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [registrationResult, setRegistrationResult] = useState<any>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const response = await fetch('/api/public/plans');
      const data = await response.json();
      
      if (data.success) {
        setPlans(data.data.plans);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const checkSlugAvailability = async (organizationName: string) => {
    if (!organizationName || organizationName.length < 3) return;
    
    const slug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    try {
      setSlugChecking(true);
      const response = await fetch(`/api/public/check-slug/${slug}`);
      const data = await response.json();
      
      if (data.success) {
        setSlugAvailable(data.data.available);
        
        if (!data.data.available) {
          setErrors(prev => ({
            ...prev,
            organizationName: 'Ce nom d\'organisation n\'est pas disponible'
          }));
        } else {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.organizationName;
            return newErrors;
          });
        }
      }
    } catch (error) {
      console.error('Error checking slug:', error);
    } finally {
      setSlugChecking(false);
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {};

    switch (step) {
      case 0: // Organisation
        if (!formData.organizationName.trim()) {
          newErrors.organizationName = 'Le nom de l\'organisation est requis';
        } else if (slugAvailable === false) {
          newErrors.organizationName = 'Ce nom d\'organisation n\'est pas disponible';
        }
        if (!formData.organizationSector) {
          newErrors.organizationSector = 'Veuillez sélectionner un secteur';
        }
        if (!formData.organizationSize) {
          newErrors.organizationSize = 'Veuillez sélectionner la taille';
        }
        break;

      case 1: // Administrateur
        if (!formData.adminEmail.trim()) {
          newErrors.adminEmail = 'L\'email est requis';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
          newErrors.adminEmail = 'Format d\'email invalide';
        }
        if (!formData.adminFirstName.trim()) {
          newErrors.adminFirstName = 'Le prénom est requis';
        }
        if (!formData.adminLastName.trim()) {
          newErrors.adminLastName = 'Le nom est requis';
        }
        if (!formData.adminPassword) {
          newErrors.adminPassword = 'Le mot de passe est requis';
        } else if (formData.adminPassword.length < 8) {
          newErrors.adminPassword = 'Le mot de passe doit contenir au moins 8 caractères';
        } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.adminPassword)) {
          newErrors.adminPassword = 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre';
        }
        if (formData.adminPassword !== formData.adminPasswordConfirm) {
          newErrors.adminPasswordConfirm = 'Les mots de passe ne correspondent pas';
        }
        break;

      case 2: // Plan
        if (!formData.selectedPlan) {
          newErrors.selectedPlan = 'Veuillez sélectionner un plan';
        }
        break;

      case 3: // Confirmation
        if (!formData.termsAccepted) {
          newErrors.termsAccepted = 'Vous devez accepter les conditions d\'utilisation';
        }
        if (!formData.privacyAccepted) {
          newErrors.privacyAccepted = 'Vous devez accepter la politique de confidentialité';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    try {
      setLoading(true);
      
      const response = await fetch('/api/public/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationName: formData.organizationName,
          organizationSector: formData.organizationSector,
          organizationSize: formData.organizationSize,
          adminEmail: formData.adminEmail,
          adminFirstName: formData.adminFirstName,
          adminLastName: formData.adminLastName,
          adminPassword: formData.adminPassword,
          selectedPlan: formData.selectedPlan,
          billingCycle: formData.billingCycle,
          timezone: formData.timezone,
          language: formData.language,
          currency: formData.currency,
          termsAccepted: formData.termsAccepted,
          privacyAccepted: formData.privacyAccepted,
          marketingOptIn: formData.marketingOptIn
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setRegistrationResult(result.data);
      } else {
        if (result.code === 'EMAIL_ALREADY_EXISTS') {
          setErrors({ adminEmail: 'Cette adresse email est déjà utilisée' });
          setCurrentStep(1); // Retourner à l'étape administrateur
        } else {
          setErrors({ submit: result.error || 'Erreur lors de l\'enregistrement' });
        }
      }
      
    } catch (error: any) {
      console.error('Registration error:', error);
      setErrors({ submit: 'Erreur de connexion. Veuillez réessayer.' });
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof RegistrationFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Supprimer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Vérifier la disponibilité du slug pour le nom d'organisation
    if (field === 'organizationName') {
      checkSlugAvailability(value);
    }
  };

  const selectedPlan = plans.find(plan => plan.id === formData.selectedPlan);
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  // Écran de succès
  if (registrationResult) {
    return (
      <div className=\"max-w-2xl mx-auto p-6\">
        <Card>
          <CardHeader className=\"text-center\">
            <div className=\"w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4\">
              <Mail className=\"w-8 h-8 text-green-600\" />
            </div>
            <CardTitle className=\"text-2xl\">Inscription réussie !</CardTitle>
            <CardDescription>
              Votre organisation a été créée avec succès.
            </CardDescription>
          </CardHeader>
          <CardContent className=\"space-y-4\">
            <Alert>
              <AlertCircle className=\"h-4 w-4\" />
              <AlertDescription>
                Un email de vérification a été envoyé à <strong>{formData.adminEmail}</strong>.
                Cliquez sur le lien dans l'email pour activer votre compte.
              </AlertDescription>
            </Alert>
            
            <div className=\"bg-blue-50 p-4 rounded-lg\">
              <h3 className=\"font-medium mb-2\">Prochaines étapes :</h3>
              <ol className=\"list-decimal list-inside space-y-1 text-sm\">
                <li>Vérifiez votre boîte email (et les spams)</li>
                <li>Cliquez sur le lien de vérification</li>
                <li>Complétez la configuration de votre organisation</li>
                <li>Invitez vos premiers collaborateurs</li>
              </ol>
            </div>
            
            <div className=\"flex gap-3\">
              <Button 
                onClick={() => window.location.href = '/login'}
                className=\"flex-1\"
              >
                Aller à la connexion
              </Button>
              <Button 
                variant=\"outline\" 
                onClick={() => window.location.reload()}
              >
                Nouvelle inscription
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className=\"max-w-4xl mx-auto p-6\">
      {/* En-tête avec progression */}
      <div className=\"mb-8\">
        <h1 className=\"text-3xl font-bold text-center mb-2\">Créer votre organisation</h1>
        <p className=\"text-gray-600 text-center mb-6\">
          Configurez votre espace de travail en quelques étapes simples
        </p>
        
        <div className=\"mb-4\">
          <Progress value={progress} className=\"h-2\" />
          <div className=\"flex justify-between mt-2 text-sm text-gray-600\">
            <span>Étape {currentStep + 1} sur {STEPS.length}</span>
            <span>{Math.round(progress)}% complété</span>
          </div>
        </div>

        {/* Navigation des étapes */}
        <div className=\"flex justify-center space-x-8 mb-8\">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div key={step.id} className=\"flex items-center\">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  ${isActive ? 'bg-blue-600 text-white' : 
                    isCompleted ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}
                `}>
                  {isCompleted ? <Check className=\"w-5 h-5\" /> : <Icon className=\"w-5 h-5\" />}
                </div>
                <span className={`ml-2 text-sm ${
                  isActive ? 'text-blue-600 font-medium' : 
                  isCompleted ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <Card>
        <CardContent className=\"p-8\">
          {/* Étape 1: Organisation */}
          {currentStep === 0 && (
            <div className=\"space-y-6\">
              <div>
                <h2 className=\"text-xl font-semibold mb-4\">Informations de l'organisation</h2>
                
                <div className=\"space-y-4\">
                  <div>
                    <Label htmlFor=\"organizationName\">Nom de l'organisation *</Label>
                    <div className=\"relative\">
                      <Input
                        id=\"organizationName\"
                        value={formData.organizationName}
                        onChange={(e) => updateFormData('organizationName', e.target.value)}
                        placeholder=\"Mon Entreprise\"
                        className={errors.organizationName ? 'border-red-500' : ''}
                      />
                      {slugChecking && (
                        <Loader2 className=\"absolute right-3 top-3 h-4 w-4 animate-spin\" />
                      )}
                      {!slugChecking && slugAvailable === true && (
                        <Check className=\"absolute right-3 top-3 h-4 w-4 text-green-500\" />
                      )}
                      {!slugChecking && slugAvailable === false && (
                        <AlertCircle className=\"absolute right-3 top-3 h-4 w-4 text-red-500\" />
                      )}
                    </div>
                    {errors.organizationName && (
                      <p className=\"text-red-500 text-sm mt-1\">{errors.organizationName}</p>
                    )}
                    {formData.organizationName && (
                      <p className=\"text-gray-500 text-sm mt-1\">
                        URL: attendance-x.com/{formData.organizationName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')}
                      </p>
                    )}
                  </div>

                  <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
                    <div>
                      <Label htmlFor=\"organizationSector\">Secteur d'activité *</Label>
                      <Select value={formData.organizationSector} onValueChange={(value) => updateFormData('organizationSector', value)}>
                        <SelectTrigger className={errors.organizationSector ? 'border-red-500' : ''}>
                          <SelectValue placeholder=\"Sélectionnez votre secteur\" />
                        </SelectTrigger>
                        <SelectContent>
                          {SECTORS.map(sector => (
                            <SelectItem key={sector.value} value={sector.value}>
                              {sector.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.organizationSector && (
                        <p className=\"text-red-500 text-sm mt-1\">{errors.organizationSector}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor=\"organizationSize\">Taille de l'entreprise *</Label>
                      <Select value={formData.organizationSize} onValueChange={(value) => updateFormData('organizationSize', value)}>
                        <SelectTrigger className={errors.organizationSize ? 'border-red-500' : ''}>
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
                      {errors.organizationSize && (
                        <p className=\"text-red-500 text-sm mt-1\">{errors.organizationSize}</p>
                      )}
                    </div>
                  </div>

                  <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4\">
                    <div>
                      <Label htmlFor=\"language\">Langue</Label>
                      <Select value={formData.language} onValueChange={(value) => updateFormData('language', value)}>
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
                      <Select value={formData.currency} onValueChange={(value) => updateFormData('currency', value)}>
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
                        value={formData.timezone}
                        onChange={(e) => updateFormData('timezone', e.target.value)}
                        placeholder=\"Europe/Paris\"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Étape 2: Administrateur */}
          {currentStep === 1 && (
            <div className=\"space-y-6\">
              <div>
                <h2 className=\"text-xl font-semibold mb-4\">Compte administrateur</h2>
                
                <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
                  <div>
                    <Label htmlFor=\"adminFirstName\">Prénom *</Label>
                    <Input
                      id=\"adminFirstName\"
                      value={formData.adminFirstName}
                      onChange={(e) => updateFormData('adminFirstName', e.target.value)}
                      placeholder=\"John\"
                      className={errors.adminFirstName ? 'border-red-500' : ''}
                    />
                    {errors.adminFirstName && (
                      <p className=\"text-red-500 text-sm mt-1\">{errors.adminFirstName}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor=\"adminLastName\">Nom *</Label>
                    <Input
                      id=\"adminLastName\"
                      value={formData.adminLastName}
                      onChange={(e) => updateFormData('adminLastName', e.target.value)}
                      placeholder=\"Doe\"
                      className={errors.adminLastName ? 'border-red-500' : ''}
                    />
                    {errors.adminLastName && (
                      <p className=\"text-red-500 text-sm mt-1\">{errors.adminLastName}</p>
                    )}
                  </div>
                </div>

                <div className=\"mt-4\">
                  <Label htmlFor=\"adminEmail\">Email *</Label>
                  <Input
                    id=\"adminEmail\"
                    type=\"email\"
                    value={formData.adminEmail}
                    onChange={(e) => updateFormData('adminEmail', e.target.value)}
                    placeholder=\"john.doe@example.com\"
                    className={errors.adminEmail ? 'border-red-500' : ''}
                  />
                  {errors.adminEmail && (
                    <p className=\"text-red-500 text-sm mt-1\">{errors.adminEmail}</p>
                  )}
                </div>

                <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4 mt-4\">
                  <div>
                    <Label htmlFor=\"adminPassword\">Mot de passe *</Label>
                    <div className=\"relative\">
                      <Input
                        id=\"adminPassword\"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.adminPassword}
                        onChange={(e) => updateFormData('adminPassword', e.target.value)}
                        placeholder=\"Minimum 8 caractères\"
                        className={errors.adminPassword ? 'border-red-500' : ''}
                      />
                      <button
                        type=\"button\"
                        onClick={() => setShowPassword(!showPassword)}
                        className=\"absolute right-3 top-3 text-gray-400 hover:text-gray-600\"
                      >
                        {showPassword ? <EyeOff className=\"h-4 w-4\" /> : <Eye className=\"h-4 w-4\" />}
                      </button>
                    </div>
                    {errors.adminPassword && (
                      <p className=\"text-red-500 text-sm mt-1\">{errors.adminPassword}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor=\"adminPasswordConfirm\">Confirmer le mot de passe *</Label>
                    <Input
                      id=\"adminPasswordConfirm\"
                      type=\"password\"
                      value={formData.adminPasswordConfirm}
                      onChange={(e) => updateFormData('adminPasswordConfirm', e.target.value)}
                      placeholder=\"Confirmez votre mot de passe\"
                      className={errors.adminPasswordConfirm ? 'border-red-500' : ''}
                    />
                    {errors.adminPasswordConfirm && (
                      <p className=\"text-red-500 text-sm mt-1\">{errors.adminPasswordConfirm}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Étape 3: Plan */}
          {currentStep === 2 && (
            <div className=\"space-y-6\">
              <div>
                <h2 className=\"text-xl font-semibold mb-4\">Choisissez votre plan</h2>
                
                <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4\">
                  {plans.map(plan => (
                    <div
                      key={plan.id}
                      onClick={() => updateFormData('selectedPlan', plan.id)}
                      className={`
                        border-2 rounded-lg p-4 cursor-pointer transition-all relative
                        ${formData.selectedPlan === plan.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      {plan.popular && (
                        <div className=\"absolute -top-2 left-1/2 transform -translate-x-1/2\">
                          <span className=\"bg-orange-500 text-white text-xs px-2 py-1 rounded\">
                            Populaire
                          </span>
                        </div>
                      )}
                      
                      <div className=\"text-center\">
                        <h3 className=\"font-semibold text-lg\">{plan.name}</h3>
                        <div className=\"text-2xl font-bold mt-2\">
                          {plan.price === 0 ? 'Gratuit' : `${plan.price}€`}
                          {plan.price > 0 && (
                            <span className=\"text-sm font-normal text-gray-600\">/mois</span>
                          )}
                        </div>
                        <p className=\"text-sm text-gray-600 mt-2\">{plan.description}</p>
                        
                        <div className=\"mt-4 space-y-2 text-sm text-left\">
                          {plan.features.map((feature, index) => (
                            <div key={index} className=\"flex items-center\">
                              <Check className=\"w-4 h-4 text-green-500 mr-2 flex-shrink-0\" />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {selectedPlan && selectedPlan.price > 0 && (
                  <div className=\"mt-6\">
                    <Label>Cycle de facturation</Label>
                    <div className=\"flex gap-4 mt-2\">
                      <label className=\"flex items-center\">
                        <input
                          type=\"radio\"
                          name=\"billingCycle\"
                          value=\"monthly\"
                          checked={formData.billingCycle === 'monthly'}
                          onChange={(e) => updateFormData('billingCycle', e.target.value)}
                          className=\"mr-2\"
                        />
                        Mensuel
                      </label>
                      <label className=\"flex items-center\">
                        <input
                          type=\"radio\"
                          name=\"billingCycle\"
                          value=\"yearly\"
                          checked={formData.billingCycle === 'yearly'}
                          onChange={(e) => updateFormData('billingCycle', e.target.value)}
                          className=\"mr-2\"
                        />
                        Annuel (20% de réduction)
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Étape 4: Confirmation */}
          {currentStep === 3 && (
            <div className=\"space-y-6\">
              <div>
                <h2 className=\"text-xl font-semibold mb-4\">Confirmation</h2>
                
                {/* Résumé */}
                <div className=\"bg-gray-50 p-4 rounded-lg mb-6\">
                  <h3 className=\"font-medium mb-3\">Résumé de votre organisation</h3>
                  <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4 text-sm\">
                    <div>
                      <strong>Organisation:</strong> {formData.organizationName}
                    </div>
                    <div>
                      <strong>Secteur:</strong> {SECTORS.find(s => s.value === formData.organizationSector)?.label}
                    </div>
                    <div>
                      <strong>Administrateur:</strong> {formData.adminFirstName} {formData.adminLastName}
                    </div>
                    <div>
                      <strong>Email:</strong> {formData.adminEmail}
                    </div>
                    <div>
                      <strong>Plan:</strong> {selectedPlan?.name}
                    </div>
                    <div>
                      <strong>Prix:</strong> {selectedPlan?.price === 0 ? 'Gratuit' : `${selectedPlan?.price}€/${formData.billingCycle === 'yearly' ? 'an' : 'mois'}`}
                    </div>
                  </div>
                </div>

                {/* Consentements */}
                <div className=\"space-y-4\">
                  <div className=\"flex items-start space-x-2\">
                    <Checkbox
                      id=\"termsAccepted\"
                      checked={formData.termsAccepted}
                      onCheckedChange={(checked) => updateFormData('termsAccepted', checked)}
                    />
                    <Label htmlFor=\"termsAccepted\" className=\"text-sm\">
                      J'accepte les <a href=\"/terms\" className=\"text-blue-600 hover:underline\" target=\"_blank\">conditions d'utilisation</a> *
                    </Label>
                  </div>
                  {errors.termsAccepted && (
                    <p className=\"text-red-500 text-sm\">{errors.termsAccepted}</p>
                  )}
                  
                  <div className=\"flex items-start space-x-2\">
                    <Checkbox
                      id=\"privacyAccepted\"
                      checked={formData.privacyAccepted}
                      onCheckedChange={(checked) => updateFormData('privacyAccepted', checked)}
                    />
                    <Label htmlFor=\"privacyAccepted\" className=\"text-sm\">
                      J'accepte la <a href=\"/privacy\" className=\"text-blue-600 hover:underline\" target=\"_blank\">politique de confidentialité</a> *
                    </Label>
                  </div>
                  {errors.privacyAccepted && (
                    <p className=\"text-red-500 text-sm\">{errors.privacyAccepted}</p>
                  )}
                  
                  <div className=\"flex items-start space-x-2\">
                    <Checkbox
                      id=\"marketingOptIn\"
                      checked={formData.marketingOptIn}
                      onCheckedChange={(checked) => updateFormData('marketingOptIn', checked)}
                    />
                    <Label htmlFor=\"marketingOptIn\" className=\"text-sm\">
                      Je souhaite recevoir des informations sur les nouveautés et offres spéciales
                    </Label>
                  </div>
                </div>

                {errors.submit && (
                  <Alert className=\"mt-4\">
                    <AlertCircle className=\"h-4 w-4\" />
                    <AlertDescription>{errors.submit}</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

          {/* Boutons de navigation */}
          <div className=\"flex justify-between mt-8\">
            <Button
              variant=\"outline\"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              Précédent
            </Button>
            
            {currentStep < STEPS.length - 1 ? (
              <Button onClick={handleNext}>
                Suivant
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={loading}
                className=\"min-w-[120px]\"
              >
                {loading ? (
                  <>
                    <Loader2 className=\"w-4 h-4 mr-2 animate-spin\" />
                    Création...
                  </>
                ) : (
                  'Créer l\'organisation'
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TenantRegistrationForm;