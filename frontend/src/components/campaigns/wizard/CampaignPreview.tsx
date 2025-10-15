import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/badge';
import {
  Eye,
  Send,
  Users,
  Calendar,
  FileText,
  Mail,
  Clock,
  CheckCircle,
  AlertTriangle,
  Smartphone,
  Monitor,
  Globe,
  Settings
} from 'lucide-react';
import { CampaignWizardData } from '../CampaignWizard';

interface CampaignPreviewProps {
  data: CampaignWizardData;
  organizationId: string;
}

export const CampaignPreview: React.FC<CampaignPreviewProps> = ({
  data,
  organizationId
}) => {
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [sendingTest, setSendingTest] = useState(false);

  const sendTestEmail = async () => {
    if (data.options.testEmails.length === 0) return;
    
    try {
      setSendingTest(true);
      // Simuler l'envoi de test
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Email de test envoyé avec succès !');
    } catch (error) {
      alert('Erreur lors de l\'envoi du test');
    } finally {
      setSendingTest(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      newsletter: 'Newsletter',
      announcement: 'Annonce',
      event_reminder: 'Rappel d\'événement',
      hr_communication: 'Communication RH',
      custom: 'Personnalisé'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getRecipientTypeLabel = (type: string) => {
    const labels = {
      criteria: 'Par critères',
      list: 'Liste existante',
      import: 'Import'
    };
    return labels[type as keyof typeof labels] || type;
  };

  // Vérifications avant envoi
  const getValidationChecks = () => {
    const checks = [
      {
        id: 'basic_info',
        label: 'Informations de base',
        valid: !!(data.name && data.subject),
        message: data.name && data.subject ? 'Nom et sujet définis' : 'Nom ou sujet manquant'
      },
      {
        id: 'content',
        label: 'Contenu',
        valid: !!(data.content.htmlContent || data.content.textContent),
        message: data.content.htmlContent || data.content.textContent ? 'Contenu défini' : 'Aucun contenu défini'
      },
      {
        id: 'recipients',
        label: 'Destinataires',
        valid: data.recipients.totalCount > 0,
        message: data.recipients.totalCount > 0 ? `${data.recipients.totalCount} destinataires` : 'Aucun destinataire sélectionné'
      },
      {
        id: 'scheduling',
        label: 'Programmation',
        valid: data.scheduling.type === 'immediate' || (data.scheduling.type === 'scheduled' && !!data.scheduling.scheduledAt),
        message: data.scheduling.type === 'immediate' 
          ? 'Envoi immédiat' 
          : data.scheduling.scheduledAt 
            ? 'Programmation définie' 
            : 'Programmation incomplète'
      }
    ];

    return checks;
  };

  const validationChecks = getValidationChecks();
  const allValid = validationChecks.every(check => check.valid);

  // Variables pour l'aperçu
  const previewVariables = {
    firstName: 'Marie',
    lastName: 'Dubois',
    email: 'marie.dubois@example.com',
    organizationName: 'Mon Entreprise',
    unsubscribeLink: '#unsubscribe',
    currentDate: new Date().toLocaleDateString('fr-FR')
  };

  const processedContent = data.content.htmlContent?.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return previewVariables[key as keyof typeof previewVariables] || match;
  }) || '';

  return (
    <div className="space-y-6">
      {/* Résumé de la campagne */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Résumé de la campagne
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700">Informations générales</h4>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Nom:</span>
                    <span className="text-sm font-medium">{data.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Sujet:</span>
                    <span className="text-sm font-medium">{data.subject}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Type:</span>
                    <Badge variant="outline">{getTypeLabel(data.type)}</Badge>
                  </div>
                  {data.tags.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Tags:</span>
                      <div className="flex gap-1">
                        {data.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700">Destinataires</h4>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Type:</span>
                    <span className="text-sm font-medium">{getRecipientTypeLabel(data.recipients.type)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total:</span>
                    <span className="text-sm font-medium">{data.recipients.totalCount} destinataires</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700">Programmation</h4>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Type:</span>
                    <span className="text-sm font-medium">
                      {data.scheduling.type === 'immediate' ? 'Envoi immédiat' : 'Programmé'}
                    </span>
                  </div>
                  {data.scheduling.scheduledAt && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Date:</span>
                      <span className="text-sm font-medium">
                        {formatDate(data.scheduling.scheduledAt)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700">Options</h4>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle className={`h-4 w-4 ${data.options.trackOpens ? 'text-green-500' : 'text-gray-300'}`} />
                    <span className="text-sm text-gray-600">Suivi des ouvertures</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className={`h-4 w-4 ${data.options.trackClicks ? 'text-green-500' : 'text-gray-300'}`} />
                    <span className="text-sm text-gray-600">Suivi des clics</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className={`h-4 w-4 ${data.options.enableUnsubscribe ? 'text-green-500' : 'text-gray-300'}`} />
                    <span className="text-sm text-gray-600">Lien de désabonnement</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vérifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Vérifications avant envoi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {validationChecks.map(check => (
              <div key={check.id} className="flex items-center gap-3">
                {check.valid ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                )}
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">{check.label}</span>
                  <p className="text-xs text-gray-500">{check.message}</p>
                </div>
              </div>
            ))}
          </div>

          {!allValid && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">
                  Veuillez corriger les erreurs avant de continuer
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aperçu de l'email */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Aperçu de l'email
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={previewDevice === 'desktop' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewDevice('desktop')}
              >
                <Monitor className="h-4 w-4 mr-2" />
                Desktop
              </Button>
              <Button
                variant={previewDevice === 'mobile' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewDevice('mobile')}
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Mobile
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={`border rounded-lg overflow-hidden mx-auto ${
            previewDevice === 'mobile' ? 'max-w-sm' : 'max-w-2xl'
          }`}>
            {/* En-tête de l'email */}
            <div className="bg-gray-100 p-3 border-b">
              <div className="text-xs text-gray-600 mb-1">De: Mon Entreprise &lt;noreply@monentreprise.com&gt;</div>
              <div className="text-xs text-gray-600 mb-1">À: marie.dubois@example.com</div>
              <div className="text-sm font-medium text-gray-900">{data.subject}</div>
            </div>
            
            {/* Contenu de l'email */}
            <div 
              className="bg-white p-4"
              style={{ 
                fontSize: previewDevice === 'mobile' ? '14px' : '16px',
                maxHeight: '500px',
                overflow: 'auto'
              }}
              dangerouslySetInnerHTML={{ __html: processedContent }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions de test */}
      {data.options.testEmails.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Test d'envoi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900">
                  Envoyer un test à: {data.options.testEmails.join(', ')}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Vérifiez le rendu et le contenu avant l'envoi final
                </p>
              </div>
              <Button
                onClick={sendTestEmail}
                disabled={sendingTest}
                variant="outline"
              >
                {sendingTest ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    Envoi...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Envoyer le test
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Résumé final */}
      <div className={`rounded-lg p-4 ${
        allValid ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
      }`}>
        <div className="flex items-center gap-2">
          {allValid ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
          )}
          <div>
            <p className={`text-sm font-medium ${
              allValid ? 'text-green-800' : 'text-yellow-800'
            }`}>
              {allValid 
                ? 'Campagne prête à être envoyée !' 
                : 'Veuillez corriger les erreurs avant de continuer'
              }
            </p>
            <p className={`text-xs ${
              allValid ? 'text-green-600' : 'text-yellow-600'
            }`}>
              {allValid 
                ? `${data.recipients.totalCount} destinataires • ${data.scheduling.type === 'immediate' ? 'Envoi immédiat' : 'Envoi programmé'}`
                : 'Retournez aux étapes précédentes pour corriger les problèmes'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};