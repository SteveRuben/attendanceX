import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/badge';
import {
  Mail,
  Monitor,
  Smartphone,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw
} from 'lucide-react';

interface EmailClientPreviewProps {
  campaignId?: string;
  htmlContent: string;
  subject: string;
}

interface ClientPreview {
  client: string;
  platform: string;
  icon: string;
  supported: boolean;
  issues: string[];
  screenshot?: string;
}

interface SpamScore {
  score: number;
  maxScore: number;
  status: 'good' | 'warning' | 'danger';
  issues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
    suggestion: string;
  }>;
}

export const EmailClientPreview: React.FC<EmailClientPreviewProps> = ({
  campaignId,
  htmlContent,
  subject
}) => {
  const [selectedClient, setSelectedClient] = useState<string>('gmail-web');
  const [loading, setLoading] = useState(false);
  const [spamScore, setSpamScore] = useState<SpamScore | null>(null);
  const [previews, setPreviews] = useState<ClientPreview[]>([]);

  useEffect(() => {
    loadPreviews();
    analyzeSpamScore();
  }, [htmlContent, subject]);

  const loadPreviews = async () => {
    setLoading(true);
    
    const mockPreviews: ClientPreview[] = [
      {
        client: 'Gmail',
        platform: 'Web',
        icon: 'gmail',
        supported: true,
        issues: []
      },
      {
        client: 'Gmail',
        platform: 'Mobile',
        icon: 'gmail',
        supported: true,
        issues: ['Images may be blocked by default']
      },
      {
        client: 'Outlook',
        platform: 'Desktop',
        icon: 'outlook',
        supported: true,
        issues: ['CSS animations not supported', 'Background images may not display']
      },
      {
        client: 'Outlook',
        platform: 'Web',
        icon: 'outlook',
        supported: true,
        issues: []
      },
      {
        client: 'Apple Mail',
        platform: 'Desktop',
        icon: 'apple',
        supported: true,
        issues: []
      },
      {
        client: 'Apple Mail',
        platform: 'iOS',
        icon: 'apple',
        supported: true,
        issues: []
      },
      {
        client: 'Yahoo Mail',
        platform: 'Web',
        icon: 'yahoo',
        supported: true,
        issues: ['Media queries limited']
      },
      {
        client: 'Thunderbird',
        platform: 'Desktop',
        icon: 'thunderbird',
        supported: true,
        issues: ['Some CSS3 properties not supported']
      }
    ];

    setPreviews(mockPreviews);
    setLoading(false);
  };

  const analyzeSpamScore = async () => {
    const mockScore: SpamScore = {
      score: 2.3,
      maxScore: 10,
      status: 'good',
      issues: [
        {
          type: 'subject_length',
          severity: 'low',
          message: 'Ligne d\'objet courte',
          suggestion: 'Considérez une ligne d\'objet entre 30-50 caractères pour un meilleur engagement'
        },
        {
          type: 'spam_words',
          severity: 'medium',
          message: '1 mot potentiellement spam détecté',
          suggestion: 'Évitez les mots comme "gratuit", "urgent", "cliquez ici"'
        }
      ]
    };

    setSpamScore(mockScore);
  };

  const getSpamScoreColor = (status: SpamScore['status']) => {
    const colors = {
      good: 'text-green-600 bg-green-50',
      warning: 'text-orange-600 bg-orange-50',
      danger: 'text-red-600 bg-red-50'
    };
    return colors[status];
  };

  const getSpamScoreIcon = (status: SpamScore['status']) => {
    const icons = {
      good: CheckCircle,
      warning: AlertTriangle,
      danger: XCircle
    };
    return icons[status];
  };

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-orange-100 text-orange-800',
      high: 'bg-red-100 text-red-800'
    };
    return colors[severity];
  };

  const getClientIcon = (icon: string) => {
    return Mail;
  };

  return (
    <div className="space-y-6">
      {spamScore && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Analyse anti-spam
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Score de spam</h4>
                  <p className="text-xs text-gray-500">Plus le score est bas, mieux c'est</p>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${getSpamScoreColor(spamScore.status)}`}>
                  {React.createElement(getSpamScoreIcon(spamScore.status), { className: 'h-5 w-5' })}
                  <span className="text-2xl font-bold">
                    {spamScore.score}/{spamScore.maxScore}
                  </span>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    spamScore.status === 'good' ? 'bg-green-600' :
                    spamScore.status === 'warning' ? 'bg-orange-600' : 'bg-red-600'
                  }`}
                  style={{ width: `${(spamScore.score / spamScore.maxScore) * 100}%` }}
                />
              </div>

              {spamScore.issues.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Problèmes détectés</h4>
                  {spamScore.issues.map((issue, index) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{issue.message}</span>
                        <Badge className={getSeverityColor(issue.severity)}>
                          {issue.severity === 'low' ? 'Faible' : issue.severity === 'medium' ? 'Moyen' : 'Élevé'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">{issue.suggestion}</p>
                    </div>
                  ))}
                </div>
              )}

              {spamScore.status === 'good' && spamScore.issues.length === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="text-sm text-green-900">
                      Excellent! Votre email a peu de chances d'être marqué comme spam.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Aperçu par client email
            </CardTitle>
            <Button size="sm" variant="outline" onClick={loadPreviews} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {previews.map((preview, index) => {
              const ClientIcon = getClientIcon(preview.icon);
              const isSelected = selectedClient === `${preview.client.toLowerCase()}-${preview.platform.toLowerCase()}`;
              
              return (
                <button
                  key={index}
                  onClick={() => setSelectedClient(`${preview.client.toLowerCase()}-${preview.platform.toLowerCase()}`)}
                  className={`p-3 border rounded-lg text-left transition-all ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <ClientIcon className="h-5 w-5 text-gray-600" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {preview.client}
                      </div>
                      <div className="text-xs text-gray-500">{preview.platform}</div>
                    </div>
                  </div>
                  
                  {preview.issues.length > 0 ? (
                    <div className="flex items-center gap-1 text-xs text-orange-600">
                      <AlertTriangle className="h-3 w-3" />
                      <span>{preview.issues.length} problème{preview.issues.length > 1 ? 's' : ''}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      <span>Compatible</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {selectedClient && (
            <div className="space-y-4">
              {previews
                .filter(p => `${p.client.toLowerCase()}-${p.platform.toLowerCase()}` === selectedClient)
                .map((preview, index) => (
                  <div key={index}>
                    {preview.issues.length > 0 && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-orange-900 mb-2">
                              Problèmes de compatibilité
                            </h4>
                            <ul className="space-y-1">
                              {preview.issues.map((issue, i) => (
                                <li key={i} className="text-sm text-orange-800">
                                  {issue}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="border rounded-lg overflow-hidden bg-white">
                      <div className="bg-gray-100 p-3 border-b">
                        <div className="text-xs text-gray-600 mb-1">Sujet:</div>
                        <div className="font-medium text-gray-900">{subject}</div>
                      </div>
                      
                      <div className="p-4 max-h-96 overflow-auto">
                        <div 
                          dangerouslySetInnerHTML={{ __html: htmlContent }}
                          className="prose max-w-none"
                        />
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-gray-500 text-center">
                      Aperçu simulé pour {preview.client} ({preview.platform})
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

