import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Search,
  Calendar,
  Download,
  Edit,
  Trash2,
  Copy,
  Share2,
  Play,
  MoreHorizontal,
  Plus,
  Filter,
  BarChart3,
  Clock
} from 'lucide-react';

interface ReportManagerProps {
  organizationId: string;
  onCreateReport?: () => void;
  onEditReport?: (reportId: string) => void;
  onRunReport?: (reportId: string) => void;
}

interface SavedReport {
  id: string;
  name: string;
  description: string;
  type: 'performance' | 'engagement' | 'delivery' | 'custom';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastRun?: string;
  runCount: number;
  isScheduled: boolean;
  scheduleFrequency?: 'daily' | 'weekly' | 'monthly';
  tags: string[];
  metrics: string[];
  chartType: string;
}

export const ReportManager: React.FC<ReportManagerProps> = ({
  organizationId,
  onCreateReport,
  onEditReport,
  onRunReport
}) => {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  useEffect(() => {
    loadSavedReports();
  }, [organizationId]);

  const loadSavedReports = async () => {
    try {
      setLoading(true);
      
      // Mock data
      const mockReports: SavedReport[] = [
        {
          id: 'report-1',
          name: 'Rapport Performance Mensuel',
          description: 'Analyse complète des performances de toutes les campagnes du mois',
          type: 'performance',
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-28T14:30:00Z',
          createdBy: 'Marie Dubois',
          lastRun: '2024-01-28T14:30:00Z',
          runCount: 12,
          isScheduled: true,
          scheduleFrequency: 'monthly',
          tags: ['mensuel', 'performance', 'complet'],
          metrics: ['deliveryRate', 'openRate', 'clickRate', 'bounceRate'],
          chartType: 'bar'
        },
        {
          id: 'report-2',
          name: 'Analyse Engagement Newsletter',
          description: 'Focus sur l\'engagement des newsletters uniquement',
          type: 'engagement',
          createdAt: '2024-01-10T09:15:00Z',
          updatedAt: '2024-01-25T11:20:00Z',
          createdBy: 'Jean Martin',
          lastRun: '2024-01-25T11:20:00Z',
          runCount: 8,
          isScheduled: false,
          tags: ['newsletter', 'engagement'],
          metrics: ['openRate', 'clickRate', 'engagementScore'],
          chartType: 'line'
        },
        {
          id: 'report-3',
          name: 'Rapport Livraison Hebdomadaire',
          description: 'Suivi des taux de livraison et des erreurs par semaine',
          type: 'delivery',
          createdAt: '2024-01-05T16:45:00Z',
          updatedAt: '2024-01-29T08:15:00Z',
          createdBy: 'Sophie Bernard',
          lastRun: '2024-01-29T08:15:00Z',
          runCount: 24,
          isScheduled: true,
          scheduleFrequency: 'weekly',
          tags: ['livraison', 'hebdomadaire', 'erreurs'],
          metrics: ['deliveryRate', 'bounceRate', 'failureRate'],
          chartType: 'pie'
        },
        {
          id: 'report-4',
          name: 'Comparaison Campagnes Q1',
          description: 'Comparaison des performances entre les différents types de campagnes',
          type: 'custom',
          createdAt: '2024-01-03T13:30:00Z',
          updatedAt: '2024-01-20T10:45:00Z',
          createdBy: 'Marie Dubois',
          runCount: 5,
          isScheduled: false,
          tags: ['comparaison', 'trimestre'],
          metrics: ['deliveryRate', 'openRate', 'clickRate'],
          chartType: 'table'
        }
      ];
      
      setReports(mockReports);
    } catch (error) {
      console.error('Error loading saved reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = selectedType === 'all' || report.type === selectedType;
    
    return matchesSearch && matchesType;
  });

  const handleReportAction = (reportId: string, action: string) => {
    switch (action) {
      case 'run':
        onRunReport?.(reportId);
        break;
      case 'edit':
        onEditReport?.(reportId);
        break;
      case 'duplicate':
        duplicateReport(reportId);
        break;
      case 'delete':
        deleteReport(reportId);
        break;
      case 'export':
        exportReport(reportId);
        break;
      default:
        break;
    }
  };

  const duplicateReport = async (reportId: string) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    const duplicatedReport: SavedReport = {
      ...report,
      id: `report-${Date.now()}`,
      name: `${report.name} (Copie)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      runCount: 0,
      lastRun: undefined,
      isScheduled: false
    };

    setReports(prev => [duplicatedReport, ...prev]);
  };

  const deleteReport = async (reportId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce rapport ?')) {
      setReports(prev => prev.filter(r => r.id !== reportId));
    }
  };

  const exportReport = async (reportId: string) => {
    console.log('Exporting report:', reportId);
    // Logique d'export
  };

  const getTypeLabel = (type: SavedReport['type']) => {
    const labels = {
      performance: 'Performance',
      engagement: 'Engagement',
      delivery: 'Livraison',
      custom: 'Personnalisé'
    };
    return labels[type];
  };

  const getTypeColor = (type: SavedReport['type']) => {
    const colors = {
      performance: 'bg-blue-100 text-blue-800',
      engagement: 'bg-green-100 text-green-800',
      delivery: 'bg-orange-100 text-orange-800',
      custom: 'bg-purple-100 text-purple-800'
    };
    return colors[type];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScheduleLabel = (frequency?: string) => {
    const labels = {
      daily: 'Quotidien',
      weekly: 'Hebdomadaire',
      monthly: 'Mensuel'
    };
    return frequency ? labels[frequency as keyof typeof labels] : '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports Sauvegardés</h1>
          <p className="text-gray-600">
            Gérez et exécutez vos rapports personnalisés
          </p>
        </div>
        <Button onClick={onCreateReport}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Rapport
        </Button>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher un rapport..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              {['all', 'performance', 'engagement', 'delivery', 'custom'].map(type => (
                <Button
                  key={type}
                  variant={selectedType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType(type)}
                >
                  {type === 'all' ? 'Tous' : getTypeLabel(type as SavedReport['type'])}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <span className="text-sm text-gray-600">
              {filteredReports.length} rapport{filteredReports.length > 1 ? 's' : ''} trouvé{filteredReports.length > 1 ? 's' : ''}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Liste des rapports */}
      {filteredReports.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Aucun rapport trouvé
            </h3>
            <p className="text-gray-600 mb-4">
              Créez votre premier rapport ou modifiez vos critères de recherche
            </p>
            <Button onClick={onCreateReport}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un rapport
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map(report => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{report.name}</CardTitle>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {report.description}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {/* Type et tags */}
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${getTypeColor(report.type)}`}>
                      {getTypeLabel(report.type)}
                    </Badge>
                    {report.isScheduled && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {getScheduleLabel(report.scheduleFrequency)}
                      </Badge>
                    )}
                  </div>

                  {/* Tags */}
                  {report.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {report.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {report.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{report.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Métriques */}
                  <div className="text-xs text-gray-500">
                    <div className="flex items-center gap-1 mb-1">
                      <BarChart3 className="h-3 w-3" />
                      <span>{report.metrics.length} métriques • {report.chartType}</span>
                    </div>
                    <div>Exécuté {report.runCount} fois</div>
                    {report.lastRun && (
                      <div>Dernière exécution: {formatDate(report.lastRun)}</div>
                    )}
                  </div>

                  {/* Informations */}
                  <div className="text-xs text-gray-500 border-t pt-3">
                    <div>Créé par {report.createdBy}</div>
                    <div>Le {formatDate(report.createdAt)}</div>
                    {report.updatedAt !== report.createdAt && (
                      <div>Modifié le {formatDate(report.updatedAt)}</div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      onClick={() => handleReportAction(report.id, 'run')}
                      className="flex-1"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Exécuter
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReportAction(report.id, 'edit')}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReportAction(report.id, 'export')}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReportAction(report.id, 'duplicate')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};