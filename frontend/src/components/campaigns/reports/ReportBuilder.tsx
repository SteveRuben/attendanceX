import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  BarChart3,
  PieChart,
  TrendingUp,
  Mail,
  Users,
  Eye,
  MousePointer,
  Save,
  Check
} from 'lucide-react';

interface ReportBuilderProps {
  organizationId: string;
  onSaveReport?: (report: CustomReport) => void;
  onExportReport?: (report: CustomReport, format: string) => void;
}

interface CustomReport {
  id?: string;
  name: string;
  description: string;
  filters: ReportFilters;
  metrics: string[];
  groupBy: string[];
  chartType: 'bar' | 'line' | 'pie' | 'table';
  dateRange: {
    start: string;
    end: string;
    preset?: string;
  };
  campaigns?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface ReportFilters {
  campaignTypes: string[];
  campaignStatuses: string[];
  minRecipients?: number;
  maxRecipients?: number;
  minOpenRate?: number;
  minClickRate?: number;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  config: Partial<CustomReport>;
  category: string;
}

export const ReportBuilder: React.FC<ReportBuilderProps> = ({
  onSaveReport,
  onExportReport
}) => {
  const [report, setReport] = useState<CustomReport>({
    name: '',
    description: '',
    filters: {
      campaignTypes: [],
      campaignStatuses: []
    },
    metrics: ['deliveryRate', 'openRate', 'clickRate'],
    groupBy: ['campaignType'],
    chartType: 'bar',
    dateRange: {
      start: '',
      end: '',
      preset: '30d'
    }
  });

  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [previewData, setPreviewData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadReportTemplates();
    setDefaultDateRange();
  }, []);

  useEffect(() => {
    generatePreview();
  }, [report.metrics, report.groupBy, report.filters, report.dateRange]);

  const loadReportTemplates = async () => {
    // Mock templates
    const mockTemplates: ReportTemplate[] = [
      {
        id: 'performance-overview',
        name: 'Vue d\'ensemble des performances',
        description: 'Rapport complet sur les performances de toutes les campagnes',
        category: 'performance',
        config: {
          metrics: ['deliveryRate', 'openRate', 'clickRate', 'bounceRate'],
          groupBy: ['campaignType', 'month'],
          chartType: 'bar'
        }
      },
      {
        id: 'executive-summary',
        name: 'Résumé Exécutif',
        description: 'Rapport de synthèse avec insights et recommandations',
        category: 'executive',
        config: {
          metrics: ['deliveryRate', 'openRate', 'clickRate', 'engagementScore'],
          groupBy: ['campaignType'],
          chartType: 'table'
        }
      },
      {
        id: 'engagement-analysis',
        name: 'Analyse d\'engagement',
        description: 'Focus sur les métriques d\'engagement et d\'interaction',
        category: 'engagement',
        config: {
          metrics: ['openRate', 'clickRate', 'engagementScore'],
          groupBy: ['campaignType'],
          chartType: 'line'
        }
      },
      {
        id: 'delivery-report',
        name: 'Rapport de livraison',
        description: 'Analyse détaillée des taux de livraison et des erreurs',
        category: 'delivery',
        config: {
          metrics: ['deliveryRate', 'bounceRate', 'failureRate'],
          groupBy: ['provider', 'campaignType'],
          chartType: 'pie'
        }
      }
    ];
    
    setTemplates(mockTemplates);
  };

  const setDefaultDateRange = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    setReport(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      }
    }));
  };

  const generatePreview = async () => {
    if (!report.metrics.length) return;
    
    try {
      setLoading(true);
      
      // Mock preview data
      const mockData = {
        summary: {
          totalCampaigns: 15,
          totalRecipients: 18750,
          avgDeliveryRate: 95.2,
          avgOpenRate: 62.8,
          avgClickRate: 24.1
        },
        chartData: [
          { name: 'Newsletter', deliveryRate: 95.8, openRate: 63.1, clickRate: 25.0 },
          { name: 'Annonce', deliveryRate: 97.2, openRate: 71.4, clickRate: 32.6 },
          { name: 'Événement', deliveryRate: 94.1, openRate: 58.9, clickRate: 19.8 },
          { name: 'RH', deliveryRate: 93.7, openRate: 55.2, clickRate: 18.4 }
        ],
        tableData: [
          {
            campaign: 'Newsletter Janvier',
            type: 'Newsletter',
            recipients: 1250,
            deliveryRate: 95.8,
            openRate: 63.1,
            clickRate: 25.0,
            sentAt: '2024-01-15'
          },
          {
            campaign: 'Annonce Produit',
            type: 'Annonce',
            recipients: 890,
            deliveryRate: 97.2,
            openRate: 71.4,
            clickRate: 32.6,
            sentAt: '2024-01-10'
          }
        ]
      };
      
      setPreviewData(mockData);
    } catch (error) {
      console.error('Error generating preview:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template: ReportTemplate) => {
    setReport(prev => ({
      ...prev,
      ...template.config,
      name: template.name,
      description: template.description
    }));
  };

  const handleMetricToggle = (metric: string) => {
    setReport(prev => ({
      ...prev,
      metrics: prev.metrics.includes(metric)
        ? prev.metrics.filter(m => m !== metric)
        : [...prev.metrics, metric]
    }));
  };

  const handleGroupByToggle = (groupBy: string) => {
    setReport(prev => ({
      ...prev,
      groupBy: prev.groupBy.includes(groupBy)
        ? prev.groupBy.filter(g => g !== groupBy)
        : [...prev.groupBy, groupBy]
    }));
  };

  const handleFilterChange = (filterType: keyof ReportFilters, value: any) => {
    setReport(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [filterType]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!report.name.trim()) {
      alert('Veuillez donner un nom au rapport');
      return;
    }
    
    try {
      setSaving(true);
      
      const savedReport = {
        ...report,
        id: report.id || `report-${Date.now()}`,
        updatedAt: new Date().toISOString()
      };
      
      onSaveReport?.(savedReport);
    } catch (error) {
      console.error('Error saving report:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = (format: string) => {
    if (!previewData) {
      alert('Aucune donnée à exporter');
      return;
    }
    
    onExportReport?.(report, format);
  };

  const availableMetrics = [
    { key: 'deliveryRate', label: 'Taux de livraison', icon: Mail },
    { key: 'openRate', label: 'Taux d\'ouverture', icon: Eye },
    { key: 'clickRate', label: 'Taux de clic', icon: MousePointer },
    { key: 'bounceRate', label: 'Taux de rebond', icon: TrendingUp },
    { key: 'unsubscribeRate', label: 'Taux de désabonnement', icon: Users },
    { key: 'engagementScore', label: 'Score d\'engagement', icon: BarChart3 }
  ];

  const availableGroupBy = [
    { key: 'campaignType', label: 'Type de campagne' },
    { key: 'month', label: 'Mois' },
    { key: 'week', label: 'Semaine' },
    { key: 'day', label: 'Jour' },
    { key: 'provider', label: 'Fournisseur email' },
    { key: 'template', label: 'Template utilisé' }
  ];

  const campaignTypes = [
    'newsletter', 'announcement', 'event_reminder', 'hr_communication', 'custom'
  ];

  const campaignStatuses = [
    'draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled', 'failed'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Générateur de Rapports</h1>
          <p className="text-gray-600">
            Créez des rapports personnalisés pour analyser vos campagnes
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" onClick={() => handleExport('excel')}>
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration du rapport */}
        <div className="lg:col-span-1 space-y-6">
          {/* Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Templates de rapport</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {templates.map(template => (
                <div
                  key={template.id}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <h4 className="font-medium text-gray-900 text-sm">{template.name}</h4>
                  <p className="text-xs text-gray-600 mt-1">{template.description}</p>
                  <Badge variant="outline" className="mt-2 text-xs">
                    {template.category}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Informations de base */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations du rapport</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du rapport
                </label>
                <Input
                  value={report.name}
                  onChange={(e) => setReport(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Mon rapport personnalisé"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={report.description}
                  onChange={(e) => setReport(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description du rapport..."
                  className="w-full p-2 text-sm border rounded-lg resize-none"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Période */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Période
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select 
                value={report.dateRange.preset} 
                onValueChange={(value) => {
                  const end = new Date();
                  let start = new Date();
                  
                  switch (value) {
                    case '7d':
                      start.setDate(start.getDate() - 7);
                      break;
                    case '30d':
                      start.setDate(start.getDate() - 30);
                      break;
                    case '90d':
                      start.setDate(start.getDate() - 90);
                      break;
                    case '1y':
                      start.setFullYear(start.getFullYear() - 1);
                      break;
                  }
                  
                  setReport(prev => ({
                    ...prev,
                    dateRange: {
                      preset: value,
                      start: start.toISOString().split('T')[0],
                      end: end.toISOString().split('T')[0]
                    }
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 derniers jours</SelectItem>
                  <SelectItem value="30d">30 derniers jours</SelectItem>
                  <SelectItem value="90d">90 derniers jours</SelectItem>
                  <SelectItem value="1y">1 an</SelectItem>
                  <SelectItem value="custom">Personnalisé</SelectItem>
                </SelectContent>
              </Select>
              
              {report.dateRange.preset === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Début
                    </label>
                    <Input
                      type="date"
                      value={report.dateRange.start}
                      onChange={(e) => setReport(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, start: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Fin
                    </label>
                    <Input
                      type="date"
                      value={report.dateRange.end}
                      onChange={(e) => setReport(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, end: e.target.value }
                      }))}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Filtres */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtres
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Types de campagne
                </label>
                <div className="flex flex-wrap gap-1">
                  {campaignTypes.map(type => (
                    <Badge
                      key={type}
                      variant={report.filters.campaignTypes.includes(type) ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => {
                        const newTypes = report.filters.campaignTypes.includes(type)
                          ? report.filters.campaignTypes.filter(t => t !== type)
                          : [...report.filters.campaignTypes, type];
                        handleFilterChange('campaignTypes', newTypes);
                      }}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statuts de campagne
                </label>
                <div className="flex flex-wrap gap-1">
                  {campaignStatuses.map(status => (
                    <Badge
                      key={status}
                      variant={report.filters.campaignStatuses.includes(status) ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => {
                        const newStatuses = report.filters.campaignStatuses.includes(status)
                          ? report.filters.campaignStatuses.filter(s => s !== status)
                          : [...report.filters.campaignStatuses, status];
                        handleFilterChange('campaignStatuses', newStatuses);
                      }}
                    >
                      {status}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Min. destinataires
                  </label>
                  <Input
                    type="number"
                    value={report.filters.minRecipients || ''}
                    onChange={(e) => handleFilterChange('minRecipients', parseInt(e.target.value) || undefined)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Max. destinataires
                  </label>
                  <Input
                    type="number"
                    value={report.filters.maxRecipients || ''}
                    onChange={(e) => handleFilterChange('maxRecipients', parseInt(e.target.value) || undefined)}
                    placeholder="∞"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Configuration des métriques et aperçu */}
        <div className="lg:col-span-2 space-y-6">
          {/* Métriques */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Métriques à inclure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableMetrics.map(metric => {
                  const Icon = metric.icon;
                  const isSelected = report.metrics.includes(metric.key);
                  
                  return (
                    <div
                      key={metric.key}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => handleMetricToggle(metric.key)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`h-4 w-4 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                        {isSelected && <Check className="h-3 w-3 text-blue-600" />}
                      </div>
                      <p className="text-sm font-medium text-gray-900">{metric.label}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Groupement */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Grouper par</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableGroupBy.map(group => {
                  const isSelected = report.groupBy.includes(group.key);
                  
                  return (
                    <div
                      key={group.key}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => handleGroupByToggle(group.key)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">{group.label}</span>
                        {isSelected && <Check className="h-3 w-3 text-blue-600" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Type de graphique */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Type de visualisation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { key: 'bar', label: 'Barres', icon: BarChart3 },
                  { key: 'line', label: 'Ligne', icon: TrendingUp },
                  { key: 'pie', label: 'Secteurs', icon: PieChart },
                  { key: 'table', label: 'Tableau', icon: FileText }
                ].map(chart => {
                  const Icon = chart.icon;
                  const isSelected = report.chartType === chart.key;
                  
                  return (
                    <div
                      key={chart.key}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors text-center ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => setReport(prev => ({ ...prev, chartType: chart.key as any }))}
                    >
                      <Icon className={`h-6 w-6 mx-auto mb-2 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                      <p className="text-sm font-medium text-gray-900">{chart.label}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Aperçu */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Aperçu du rapport</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : previewData ? (
                <div className="space-y-4">
                  {/* Résumé */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-gray-900">
                        {previewData.summary.totalCampaigns}
                      </div>
                      <div className="text-sm text-gray-600">Campagnes</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-gray-900">
                        {previewData.summary.totalRecipients.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">Destinataires</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-gray-900">
                        {previewData.summary.avgOpenRate.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">Taux d'ouverture</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-gray-900">
                        {previewData.summary.avgClickRate.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">Taux de clic</div>
                    </div>
                  </div>

                  {/* Aperçu des données */}
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                      Données du rapport ({report.chartType})
                    </h4>
                    
                    {report.chartType === 'table' ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">Campagne</th>
                              <th className="text-left py-2">Type</th>
                              <th className="text-center py-2">Destinataires</th>
                              <th className="text-center py-2">Livraison</th>
                              <th className="text-center py-2">Ouverture</th>
                              <th className="text-center py-2">Clic</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.tableData.slice(0, 3).map((row: any, index: number) => (
                              <tr key={index} className="border-b">
                                <td className="py-2">{row.campaign}</td>
                                <td className="py-2">{row.type}</td>
                                <td className="text-center py-2">{row.recipients.toLocaleString()}</td>
                                <td className="text-center py-2">{row.deliveryRate.toFixed(1)}%</td>
                                <td className="text-center py-2">{row.openRate.toFixed(1)}%</td>
                                <td className="text-center py-2">{row.clickRate.toFixed(1)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                        <p>Aperçu du graphique {report.chartType}</p>
                        <p className="text-xs mt-1">
                          {previewData.chartData.length} points de données
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>Configurez votre rapport pour voir l'aperçu</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};