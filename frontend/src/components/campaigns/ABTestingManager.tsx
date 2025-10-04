import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/badge';
import {
  FlaskConical,
  Plus,
  Trash2,
  Play,
  Trophy,
  TrendingUp,
  Users,
  MailOpen,
  MousePointerClick,
  AlertCircle
} from 'lucide-react';

interface ABTestVariant {
  id: string;
  name: string;
  subject: string;
  content?: string;
  sampleSize: number;
  recipients?: number;
  sent?: number;
  opened?: number;
  clicked?: number;
  openRate?: number;
  clickRate?: number;
  isWinner?: boolean;
}

interface ABTestConfig {
  testName: string;
  variants: ABTestVariant[];
  testDuration: number;
  samplePercentage: number;
  winnerMetric: 'open_rate' | 'click_rate' | 'conversion_rate';
  autoSelectWinner: boolean;
  status: 'draft' | 'running' | 'completed';
  startedAt?: string;
  completedAt?: string;
}

interface ABTestingManagerProps {
  campaignId?: string;
  onSave?: (config: ABTestConfig) => void;
}

export const ABTestingManager: React.FC<ABTestingManagerProps> = ({ campaignId, onSave }) => {
  const [config, setConfig] = useState<ABTestConfig>({
    testName: 'Test A/B - Ligne d\'objet',
    variants: [
      {
        id: 'variant-a',
        name: 'Variante A',
        subject: 'Découvrez nos nouveautés',
        sampleSize: 50
      },
      {
        id: 'variant-b',
        name: 'Variante B',
        subject: 'Nouveautés exclusives pour vous',
        sampleSize: 50
      }
    ],
    testDuration: 24,
    samplePercentage: 20,
    winnerMetric: 'open_rate',
    autoSelectWinner: true,
    status: 'draft'
  });

  const [showResults, setShowResults] = useState(false);

  const addVariant = () => {
    const newVariant: ABTestVariant = {
      id: `variant-${Date.now()}`,
      name: `Variante ${String.fromCharCode(65 + config.variants.length)}`,
      subject: '',
      sampleSize: Math.floor(100 / (config.variants.length + 1))
    };

    const updatedVariants = config.variants.map(v => ({
      ...v,
      sampleSize: Math.floor(100 / (config.variants.length + 1))
    }));

    setConfig({
      ...config,
      variants: [...updatedVariants, newVariant]
    });
  };

  const removeVariant = (variantId: string) => {
    if (config.variants.length <= 2) return;

    const updatedVariants = config.variants.filter(v => v.id !== variantId);
    const equalSize = Math.floor(100 / updatedVariants.length);

    setConfig({
      ...config,
      variants: updatedVariants.map(v => ({ ...v, sampleSize: equalSize }))
    });
  };

  const updateVariant = (variantId: string, updates: Partial<ABTestVariant>) => {
    setConfig({
      ...config,
      variants: config.variants.map(v => (v.id === variantId ? { ...v, ...updates } : v))
    });
  };

  const updateSampleSize = (variantId: string, size: number) => {
    const totalOthers = config.variants
      .filter(v => v.id !== variantId)
      .reduce((sum, v) => sum + v.sampleSize, 0);

    if (size + totalOthers > 100) return;

    updateVariant(variantId, { sampleSize: size });
  };

  const startTest = () => {
    setConfig({
      ...config,
      status: 'running',
      startedAt: new Date().toISOString()
    });

    setTimeout(() => {
      const mockResults = config.variants.map(v => ({
        ...v,
        recipients: Math.floor(Math.random() * 500) + 100,
        sent: Math.floor(Math.random() * 500) + 100,
        opened: Math.floor(Math.random() * 300) + 50,
        clicked: Math.floor(Math.random() * 100) + 20
      }));

      const withRates = mockResults.map(v => ({
        ...v,
        openRate: v.sent ? (v.opened! / v.sent) * 100 : 0,
        clickRate: v.sent ? (v.clicked! / v.sent) * 100 : 0
      }));

      const winner = withRates.reduce((prev, current) => {
        const prevMetric = config.winnerMetric === 'open_rate' ? prev.openRate! : prev.clickRate!;
        const currentMetric = config.winnerMetric === 'open_rate' ? current.openRate! : current.clickRate!;
        return currentMetric > prevMetric ? current : prev;
      });

      setConfig({
        ...config,
        status: 'completed',
        completedAt: new Date().toISOString(),
        variants: withRates.map(v => ({
          ...v,
          isWinner: v.id === winner.id
        }))
      });

      setShowResults(true);
    }, 3000);
  };

  const getMetricLabel = (metric: ABTestConfig['winnerMetric']) => {
    const labels = {
      open_rate: 'Taux d\'ouverture',
      click_rate: 'Taux de clic',
      conversion_rate: 'Taux de conversion'
    };
    return labels[metric];
  };

  const getStatusBadge = () => {
    const badges = {
      draft: <Badge variant="secondary">Brouillon</Badge>,
      running: <Badge variant="default" className="animate-pulse">En cours</Badge>,
      completed: <Badge variant="default" className="bg-green-600">Terminé</Badge>
    };
    return badges[config.status];
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              Configuration du test A/B
            </CardTitle>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom du test
            </label>
            <Input
              value={config.testName}
              onChange={e => setConfig({ ...config, testName: e.target.value })}
              disabled={config.status !== 'draft'}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Durée du test (heures)
              </label>
              <Input
                type="number"
                value={config.testDuration}
                onChange={e => setConfig({ ...config, testDuration: parseInt(e.target.value) })}
                disabled={config.status !== 'draft'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Échantillon (%)
              </label>
              <Input
                type="number"
                value={config.samplePercentage}
                onChange={e => setConfig({ ...config, samplePercentage: parseInt(e.target.value) })}
                disabled={config.status !== 'draft'}
                min={1}
                max={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Métrique gagnante
              </label>
              <select
                value={config.winnerMetric}
                onChange={e => setConfig({ ...config, winnerMetric: e.target.value as any })}
                disabled={config.status !== 'draft'}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="open_rate">Taux d'ouverture</option>
                <option value="click_rate">Taux de clic</option>
                <option value="conversion_rate">Taux de conversion</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.autoSelectWinner}
              onChange={e => setConfig({ ...config, autoSelectWinner: e.target.checked })}
              disabled={config.status !== 'draft'}
              className="rounded border-gray-300"
            />
            <label className="text-sm text-gray-700">
              Sélectionner automatiquement le gagnant et envoyer au reste des destinataires
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Variantes</CardTitle>
            {config.status === 'draft' && (
              <Button onClick={addVariant} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une variante
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {config.variants.map((variant, index) => (
            <div key={variant.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900">{variant.name}</h4>
                  {variant.isWinner && (
                    <Badge variant="default" className="bg-yellow-500">
                      <Trophy className="h-3 w-3 mr-1" />
                      Gagnant
                    </Badge>
                  )}
                </div>
                {config.status === 'draft' && config.variants.length > 2 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeVariant(variant.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ligne d'objet
                </label>
                <Input
                  value={variant.subject}
                  onChange={e => updateVariant(variant.id, { subject: e.target.value })}
                  disabled={config.status !== 'draft'}
                  placeholder="Entrez la ligne d'objet..."
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Taille de l'échantillon (%)
                  </label>
                  <Input
                    type="number"
                    value={variant.sampleSize}
                    onChange={e => updateSampleSize(variant.id, parseInt(e.target.value))}
                    disabled={config.status !== 'draft'}
                    min={0}
                    max={100}
                  />
                </div>

                {showResults && variant.sent && (
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <div className="text-xs text-gray-600">Envoyés</div>
                      <div className="text-lg font-bold text-gray-900">{variant.sent}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-600">Taux ouv.</div>
                      <div className="text-lg font-bold text-purple-600">
                        {variant.openRate?.toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-600">Taux clic</div>
                      <div className="text-lg font-bold text-orange-600">
                        {variant.clickRate?.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm text-blue-900">
                <p className="font-medium mb-1">À propos du test A/B</p>
                <p>
                  {config.samplePercentage}% de vos destinataires recevront les variantes de test.
                  Après {config.testDuration}h, {config.autoSelectWinner ? 'la variante gagnante sera automatiquement envoyée' : 'vous pourrez choisir la variante gagnante'} aux {100 - config.samplePercentage}% restants.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {config.status === 'draft' && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onSave?.(config)}>
            Sauvegarder
          </Button>
          <Button onClick={startTest}>
            <Play className="h-4 w-4 mr-2" />
            Démarrer le test
          </Button>
        </div>
      )}

      {config.status === 'running' && (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p className="text-sm text-gray-600">Test en cours...</p>
          </CardContent>
        </Card>
      )}

      {config.status === 'completed' && showResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Résultats du test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Le test s'est terminé avec succès. La variante gagnante a été déterminée selon le critère: {getMetricLabel(config.winnerMetric)}
              </p>

              {config.autoSelectWinner && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-900">
                    La variante gagnante sera automatiquement envoyée aux destinataires restants.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

