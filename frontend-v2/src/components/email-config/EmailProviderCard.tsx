import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Mail, 
  Edit, 
  Trash2, 
  TestTube, 
  Loader2, 
  CheckCircle, 
  XCircle,
  Globe,
  Building,
  Eye,
  EyeOff
} from 'lucide-react';
import { EmailProvider, EmailProviderType } from '@/services/emailConfigService';

interface EmailProviderCardProps {
  provider: EmailProvider;
  onEdit?: () => void;
  onDelete?: () => void;
  onTest?: (testEmail: string) => void;
  testing?: boolean;
  readonly?: boolean;
}

const getProviderIcon = (type: EmailProviderType) => {
  switch (type) {
    case EmailProviderType.SENDGRID:
      return '📧';
    case EmailProviderType.MAILGUN:
      return '🔫';
    case EmailProviderType.AWS_SES:
      return '☁️';
    case EmailProviderType.SMTP:
      return '📮';
    default:
      return '📧';
  }
};

const getProviderColor = (type: EmailProviderType) => {
  switch (type) {
    case EmailProviderType.SENDGRID:
      return 'bg-blue-500';
    case EmailProviderType.MAILGUN:
      return 'bg-orange-500';
    case EmailProviderType.AWS_SES:
      return 'bg-yellow-500';
    case EmailProviderType.SMTP:
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
};

const maskSensitiveValue = (value: string, show: boolean) => {
  if (show || !value) return value;
  if (value.length <= 8) return '••••••••';
  return value.substring(0, 4) + '••••••••' + value.substring(value.length - 4);
};

export const EmailProviderCard: React.FC<EmailProviderCardProps> = ({
  provider,
  onEdit,
  onDelete,
  onTest,
  testing = false,
  readonly = false
}) => {
  const [showTest, setShowTest] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [showSensitive, setShowSensitive] = useState(false);

  const handleTest = () => {
    if (!testEmail.trim()) {
      alert('Veuillez saisir un email de test');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      alert('Veuillez saisir un email valide');
      return;
    }

    onTest?.(testEmail);
    setShowTest(false);
    setTestEmail('');
  };

  const renderConfigValue = (key: string, value: any) => {
    if (typeof value === 'object' && value !== null) {
      return (
        <div className="ml-4 space-y-1">
          {Object.entries(value).map(([subKey, subValue]) => (
            <div key={subKey} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{subKey}:</span>
              <span className="font-mono">
                {subKey.toLowerCase().includes('pass') || subKey.toLowerCase().includes('secret') || subKey.toLowerCase().includes('key') 
                  ? maskSensitiveValue(String(subValue), showSensitive)
                  : String(subValue)
                }
              </span>
            </div>
          ))}
        </div>
      );
    }

    const isSensitive = key.toLowerCase().includes('pass') || 
                      key.toLowerCase().includes('secret') || 
                      key.toLowerCase().includes('key');

    return (
      <span className="font-mono text-sm">
        {isSensitive ? maskSensitiveValue(String(value), showSensitive) : String(value)}
      </span>
    );
  };

  return (
    <Card className={`${provider.isGlobal ? 'border-gray-300 bg-gray-50/50 dark:bg-gray-900/50' : ''}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-lg flex items-center justify-center text-2xl ${getProviderColor(provider.type)} text-white`}>
              {getProviderIcon(provider.type)}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold">{provider.name}</h3>
                {provider.isGlobal ? (
                  <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    Global
                  </span>
                ) : (
                  <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    Tenant
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="capitalize">{provider.type.replace('_', ' ')}</span>
                <span>•</span>
                <span>Priorité: {provider.priority}</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  {provider.isActive ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-green-600">Actif</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-red-600">Inactif</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle sensitive data visibility */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSensitive(!showSensitive)}
              title={showSensitive ? 'Masquer les données sensibles' : 'Afficher les données sensibles'}
            >
              {showSensitive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>

            {/* Test button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTest(!showTest)}
              disabled={testing}
            >
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4" />
              )}
            </Button>

            {/* Edit button (only for tenant providers) */}
            {!readonly && onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
            )}

            {/* Delete button (only for tenant providers) */}
            {!readonly && onDelete && (
              <Button variant="outline" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Configuration details */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Configuration
          </h4>
          <div className="space-y-2">
            {Object.entries(provider.config).map(([key, value]) => (
              <div key={key} className="flex justify-between items-start">
                <span className="text-sm text-muted-foreground capitalize">
                  {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                </span>
                <div className="text-right max-w-xs">
                  {renderConfigValue(key, value)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Test section */}
        {showTest && (
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <h4 className="text-sm font-medium mb-3 text-blue-900 dark:text-blue-100">
              Tester la configuration
            </h4>
            <div className="flex gap-2">
              <Input
                placeholder="email@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1"
                type="email"
              />
              <Button onClick={handleTest} disabled={testing}>
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Envoyer test'
                )}
              </Button>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              Un email de test sera envoyé à cette adresse pour vérifier la configuration.
            </p>
          </div>
        )}

        {/* Metadata */}
        <div className="flex justify-between text-xs text-muted-foreground mt-4 pt-4 border-t">
          <span>Créé le {new Date(provider.createdAt).toLocaleDateString()}</span>
          <span>Modifié le {new Date(provider.updatedAt).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
};