import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/badge';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Mail,
  Users,
  FileText,
  Send,
  Calendar,
  Eye
} from 'lucide-react';
import { CampaignBasicInfo } from './wizard/CampaignBasicInfo';
import { CampaignTemplateSelection } from './wizard/CampaignTemplateSelection';
import { CampaignRecipientSelection } from './wizard/CampaignRecipientSelection';
import { CampaignContentEditor } from './wizard/CampaignContentEditor';
import { CampaignScheduling } from './wizard/CampaignScheduling';
import { CampaignPreview } from './wizard/CampaignPreview';
import { useCampaigns } from '../../hooks/useCampaigns';
import { toast } from 'react-toastify';

interface CampaignWizardProps {
  organizationId: string;
  onComplete?: (campaignId: string) => void;
  onCancel?: () => void;
}

export interface CampaignWizardData {
  // Informations de base
  name: string;
  subject: string;
  type: 'newsletter' | 'announcement' | 'event_reminder' | 'hr_communication' | 'custom';
  tags: string[];
  
  // Template et contenu
  templateId?: string;
  useTemplate: boolean;
  content: {
    htmlContent?: string;
    textContent?: string;
    templateData?: Record<string, any>;
  };
  
  // Destinataires
  recipients: {
    type: 'criteria' | 'list' | 'import';
    criteria?: {
      teams?: string[];
      roles?: string[];
      departments?: string[];
      eventParticipants?: string[];
      customFilters?: any[];
      excludeUnsubscribed: boolean;
    };
    recipientListId?: string;
    externalRecipients?: Array<{
      email: string;
      firstName?: string;
      lastName?: string;
      personalizations?: Record<string, any>;
    }>;
    previewRecipients?: Array<{
      email: string;
      firstName: string;
      lastName: string;
    }>;
    totalCount: number;
  };
  
  // Programmation
  scheduling: {
    type: 'immediate' | 'scheduled';
    scheduledAt?: string;
    timezone?: string;
  };
  
  // Options avancées
  options: {
    trackOpens: boolean;
    trackClicks: boolean;
    enableUnsubscribe: boolean;
    testEmails: string[];
  };
}

const WIZARD_STEPS = [
  {
    id: 'basic',
    title: 'Informations de base',
    description: 'Nom, sujet et type de campagne',
    icon: Mail
  },
  {
    id: 'template',
    title: 'Template',
    description: 'Choisir un modèle ou créer du contenu',
    icon: FileText
  },
  {
    id: 'recipients',
    title: 'Destinataires',
    description: 'Sélectionner les destinataires',
    icon: Users
  },
  {
    id: 'content',
    title: 'Contenu',
    description: 'Personnaliser le contenu',
    icon: FileText
  },
  {
    id: 'scheduling',
    title: 'Programmation',
    description: 'Programmer l\'envoi',
    icon: Calendar
  },
  {
    id: 'preview',
    title: 'Aperçu',
    description: 'Vérifier et envoyer',
    icon: Eye
  }
];

export const CampaignWizard: React.FC<CampaignWizardProps> = ({
  organizationId,
  onComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState<CampaignWizardData>({
    name: '',
    subject: '',
    type: 'newsletter',
    tags: [],
    useTemplate: true,
    content: {},
    recipients: {
      type: 'criteria',
      criteria: {
        excludeUnsubscribed: true
      },
      totalCount: 0
    },
    scheduling: {
      type: 'immediate'
    },
    options: {
      trackOpens: true,
      trackClicks: true,
      enableUnsubscribe: true,
      testEmails: []
    }
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createCampaign } = useCampaigns({ autoLoad: false });

  const updateWizardData = useCallback((updates: Partial<CampaignWizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  }, []);

  const canProceedToNext = useCallback(() => {
    const step = WIZARD_STEPS[currentStep];
    
    switch (step.id) {
      case 'basic':
        return wizardData.name.trim() && wizardData.subject.trim();
      case 'template':
        return wizardData.useTemplate ? !!wizardData.templateId : true;
      case 'recipients':
        return wizardData.recipients.totalCount > 0;
      case 'content':
        return wizardData.content.htmlContent || wizardData.content.textContent;
      case 'scheduling':
        return wizardData.scheduling.type === 'immediate' || 
               (wizardData.scheduling.type === 'scheduled' && wizardData.scheduling.scheduledAt);
      case 'preview':
        return true;
      default:
        return true;
    }
  }, [currentStep, wizardData]);

  const handleNext = () => {
    if (canProceedToNext() && currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // Préparer les données pour l'API
      const campaignData = {
        name: wizardData.name,
        subject: wizardData.subject,
        type: wizardData.type,
        templateId: wizardData.templateId,
        content: wizardData.content,
        recipients: wizardData.recipients,
        scheduledAt: wizardData.scheduling.type === 'scheduled' 
          ? wizardData.scheduling.scheduledAt 
          : undefined,
        tags: wizardData.tags
      };

      const campaign = await createCampaign(campaignData);
      
      if (campaign) {
        toast.success('Campagne créée avec succès !');
        onComplete?.(campaign.id);
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Erreur lors de la création de la campagne');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    const step = WIZARD_STEPS[currentStep];
    
    switch (step.id) {
      case 'basic':
        return (
          <CampaignBasicInfo
            data={wizardData}
            onChange={updateWizardData}
          />
        );
      case 'template':
        return (
          <CampaignTemplateSelection
            data={wizardData}
            onChange={updateWizardData}
            organizationId={organizationId}
          />
        );
      case 'recipients':
        return (
          <CampaignRecipientSelection
            data={wizardData}
            onChange={updateWizardData}
            organizationId={organizationId}
          />
        );
      case 'content':
        return (
          <CampaignContentEditor
            data={wizardData}
            onChange={updateWizardData}
          />
        );
      case 'scheduling':
        return (
          <CampaignScheduling
            data={wizardData}
            onChange={updateWizardData}
          />
        );
      case 'preview':
        return (
          <CampaignPreview
            data={wizardData}
            organizationId={organizationId}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Créer une nouvelle campagne
              </h1>
              <p className="text-gray-600 mt-1">
                Suivez les étapes pour créer votre campagne email
              </p>
            </div>
            <Button
              variant="outline"
              onClick={onCancel}
            >
              Annuler
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar avec les étapes */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Étapes</h3>
              <div className="space-y-4">
                {WIZARD_STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = index === currentStep;
                  const isCompleted = index < currentStep;
                  const isAccessible = index <= currentStep;

                  return (
                    <div
                      key={step.id}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-blue-50 border border-blue-200'
                          : isCompleted
                          ? 'bg-green-50 border border-green-200'
                          : isAccessible
                          ? 'hover:bg-gray-50'
                          : 'opacity-50 cursor-not-allowed'
                      }`}
                      onClick={() => isAccessible && setCurrentStep(index)}
                    >
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : isCompleted
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {isCompleted ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${
                          isActive ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-gray-900'
                        }`}>
                          {step.title}
                        </p>
                        <p className={`text-xs ${
                          isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Contenu principal */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {React.createElement(WIZARD_STEPS[currentStep].icon, { className: "h-5 w-5" })}
                      {WIZARD_STEPS[currentStep].title}
                    </CardTitle>
                    <p className="text-gray-600 mt-1">
                      {WIZARD_STEPS[currentStep].description}
                    </p>
                  </div>
                  <Badge variant="outline">
                    Étape {currentStep + 1} sur {WIZARD_STEPS.length}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                {renderStepContent()}
              </CardContent>
              
              {/* Navigation */}
              <div className="flex items-center justify-between p-6 border-t">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Précédent
                </Button>
                
                <div className="flex items-center gap-3">
                  {currentStep === WIZARD_STEPS.length - 1 ? (
                    <Button
                      onClick={handleSubmit}
                      disabled={!canProceedToNext() || isSubmitting}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Création...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Créer la campagne
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNext}
                      disabled={!canProceedToNext()}
                    >
                      Suivant
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};