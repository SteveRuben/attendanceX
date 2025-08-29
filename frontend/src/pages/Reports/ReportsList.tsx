// src/pages/Reports/ReportsList.tsx - Liste des rapports avec génération
import { useState, useEffect } from 'react';
import { useAuth, usePermissions } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  BarChart3, 
  Search, 
  Plus, 
  Download,
  FileText,
  Calendar,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Filter
} from 'lucide-react';
import { reportService } from '@/services';
import type { Report, ReportType, ReportFormat, ReportStatus } from '@/services/reportService';
import { toast } from 'react-toastify';

interface ReportFilters {
  search: string;
  type: ReportType | 'all';
  status: ReportStatus | 'all';
  format: ReportFormat | 'all';
}

interface GenerateReportForm {
  type: ReportType;
  format: ReportFormat;
  filters: {
    startDate: string;
    endDate: string;
    eventId: string;
    userId: string;
    department: string;
  };
  options: {
    includeCharts: boolean;
    includeInsights: boolean;
    language: 'fr' | 'en';
  };
}

const ReportsList = () => {
  const { user } = useAuth();
  const { canViewReports, canManageReports } = usePermissions();
  
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({
    search: '',
    type: 'all',
    status: 'all',
    format: 'all'
  });
  const [generateForm, setGenerateForm] = useState<GenerateReportForm>({
    type: 'attendance_summary',
    format: 'pdf',
    filters: {
      startDate: '',
      endDate: '',
      eventId: '',
      userId: '',
      department: ''
    },
    options: {
      includeCharts: true,
      includeInsights: true,
      language: 'fr'
    }
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    loadReports();
  }, [filters, pagination.page]);

  const loadReports = async () => {
    try {
      setLoading(true);
      
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      if (filters.search) params.search = filters.search;
      if (filters.type !== 'all') params.type = filters.type;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.format !== 'all') params.format = filters.format;

      const response = await reportService.getReports(params);
      
      if (response.success && response.data) {
        setReports(response.data.data);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination?.total || 0,
          totalPages: response.data.pagination?.totalPages || 0
        }));
      }
    } catch (error: any) {
      console.error('Error loading reports:', error);
      toast.error('Erreur lors du chargement des rapports');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof ReportFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getStatusBadge = (status: ReportStatus) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'En attente', icon: Clock },
      processing: { variant: 'default' as const, label: 'En cours', icon: Loader2 },
      completed: { variant: 'default' as const, label: 'Terminé', icon: CheckCircle },
      failed: { variant: 'destructive' as const, label: 'Échec', icon: XCircle }
    };

    const config = statusConfig[status] || { variant: 'outline' as const, label: status, icon: AlertCircle };
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className={`w-3 h-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
        {config.label}
      </Badge>
    );
  };

  const getTypeLabel = (type: ReportType) => {
    const typeLabels = {
      attendance_summary: 'Résumé des présences',
      event_detail: 'Détail d\'événement',
      user_attendance: 'Présences utilisateur',
      department_analytics: 'Analytics département',
      monthly_summary: 'Résumé mensuel',
      custom: 'Personnalisé'
    };
    return typeLabels[type] || type;
  };

  const getFormatBadge = (format: ReportFormat) => {
    const formatConfig = {
      pdf: { variant: 'destructive' as const, label: 'PDF' },
      excel: { variant: 'default' as const, label: 'Excel' },
      csv: { variant: 'secondary' as const, label: 'CSV' },
      json: { variant: 'outline' as const, label: 'JSON' }
    };

    const config = formatConfig[format] || { variant: 'outline' as const, label: format };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleGenerateReport = async () => {
    try {
      setGenerating(true);
      
      const response = await reportService.generateReport({
        type: generateForm.type,
        format: generateForm.format,
        filters: generateForm.filters,
        options: generateForm.options
      });

      if (response.success) {
        toast.success('Génération du rapport lancée');
        setShowGenerateDialog(false);
        loadReports();
      }
    } catch (error: any) {
      toast.error('Erreur lors de la génération du rapport');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadReport = async (reportId: string) => {
    try {
      const response = await reportService.downloadReport(reportId);
      if (response.success) {
        toast.success('Téléchargement en cours');
        // Handle file download
      }
    } catch (error: any) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      await reportService.deleteReport(reportId);
      toast.success('Rapport supprimé');
      loadReports();
    } catch (error: any) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading && reports.length === 0) {
    return (
      <div className="container-fluid py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Rapports</h1>
          <p className="text-muted-foreground mt-1">
            Générez et consultez vos rapports d'analyse
          </p>
        </div>
        {canViewReports && (
          <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Générer un rapport
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Générer un nouveau rapport</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Type de rapport</Label>
                    <Select 
                      value={generateForm.type} 
                      onValueChange={(value) => setGenerateForm(prev => ({ ...prev, type: value as ReportType }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="attendance_summary">Résumé des présences</SelectItem>
                        <SelectItem value="event_detail">Détail d'événement</SelectItem>
                        <SelectItem value="user_attendance">Présences utilisateur</SelectItem>
                        <SelectItem value="department_analytics">Analytics département</SelectItem>
                        <SelectItem value="monthly_summary">Résumé mensuel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="format">Format</Label>
                    <Select 
                      value={generateForm.format} 
                      onValueChange={(value) => setGenerateForm(prev => ({ ...prev, format: value as ReportFormat }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="excel">Excel</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Date de début</Label>
                    <Input
                      type="date"
                      value={generateForm.filters.startDate}
                      onChange={(e) => setGenerateForm(prev => ({
                        ...prev,
                        filters: { ...prev.filters, startDate: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">Date de fin</Label>
                    <Input
                      type="date"
                      value={generateForm.filters.endDate}
                      onChange={(e) => setGenerateForm(prev => ({
                        ...prev,
                        filters: { ...prev.filters, endDate: e.target.value }
                      }))}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={generateForm.options.includeCharts}
                      onChange={(e) => setGenerateForm(prev => ({
                        ...prev,
                        options: { ...prev.options, includeCharts: e.target.checked }
                      }))}
                    />
                    <span>Inclure les graphiques</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={generateForm.options.includeInsights}
                      onChange={(e) => setGenerateForm(prev => ({
                        ...prev,
                        options: { ...prev.options, includeInsights: e.target.checked }
                      }))}
                    />
                    <span>Inclure les insights</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleGenerateReport} disabled={generating}>
                    {generating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <BarChart3 className="w-4 h-4 mr-2" />
                    )}
                    Générer
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Rechercher des rapports..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="attendance_summary">Résumé présences</SelectItem>
                <SelectItem value="event_detail">Détail événement</SelectItem>
                <SelectItem value="user_attendance">Présences utilisateur</SelectItem>
                <SelectItem value="department_analytics">Analytics département</SelectItem>
                <SelectItem value="monthly_summary">Résumé mensuel</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="processing">En cours</SelectItem>
                <SelectItem value="completed">Terminé</SelectItem>
                <SelectItem value="failed">Échec</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <div className="space-y-4">
        {reports.length > 0 ? (
          reports.map((report) => (
            <Card key={report.id} className="card-interactive">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <FileText className="w-8 h-8 text-blue-600" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {report.title || getTypeLabel(report.type)}
                        </h3>
                        {getStatusBadge(report.status)}
                        {getFormatBadge(report.format)}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          Généré le {formatDate(report.generatedAt)}
                        </div>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          Par {report.generatedBy}
                        </div>
                        {report.fileSize && (
                          <div className="flex items-center">
                            <Download className="w-4 h-4 mr-1" />
                            {formatFileSize(report.fileSize)}
                          </div>
                        )}
                        {report.completedAt && (
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            Terminé le {formatDate(report.completedAt)}
                          </div>
                        )}
                      </div>
                      
                      {report.description && (
                        <p className="text-muted-foreground text-sm mt-2">
                          {report.description}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {report.status === 'completed' && report.downloadUrl && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDownloadReport(report.id)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Télécharger
                      </Button>
                    )}
                    
                    {canManageReports && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteReport(report.id)}
                      >
                        Supprimer
                      </Button>
                    )}
                  </div>
                </div>
                
                {report.error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">
                      <AlertCircle className="w-4 h-4 inline mr-2" />
                      Erreur: {report.error}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Aucun rapport trouvé
              </h3>
              <p className="text-muted-foreground mb-4">
                {Object.values(filters).some(f => f && f !== 'all')
                  ? 'Aucun rapport ne correspond à vos critères de recherche.'
                  : 'Vous n\'avez pas encore généré de rapport.'
                }
              </p>
              {canViewReports && (
                <Button onClick={() => setShowGenerateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Générer votre premier rapport
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Affichage de {((pagination.page - 1) * pagination.limit) + 1} à{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} sur {pagination.total} rapports
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsList;