/**
 * Interface de génération de rapports de présence
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  FileText,
  Download,
  Clock,
  BarChart3,
  RefreshCw,
  Settings,
  Eye,
  Save,
  Trash2,
  PlayCircle,
  StopCircle
} from 'lucide-react';
import { usePresenceReports } from '@/hooks/usePresenceReports';
import { useAuth } from '@/hooks/use-auth';

// Local type definitions since they're not available in shared package
interface PresenceReport {
  id: string;
  organizationId: string;
  title: string;
  description?: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  period: {
    startDate: Date;
    endDate: Date;
  };
  createdAt: Date;
  createdBy: string;
}

interface ReportFilter {
  startDate: Date;
  endDate: Date;
  employeeIds?: string[];
  departments?: string[];
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
}

interface ReportSchedule {
  id?: string;
  name: string;
  templateId: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  isActive: boolean;
  organizationId: string;
  createdAt?: string;
}
import { formatDate } from '@/utils/dateUtils';

export const PresenceReports: React.FC = () => {
  const { user } = useAuth();
  const {
    reports,
    reportTemplates,
    scheduledReports,
    loading,
    error,
    generateReport,
    exportReport,
    saveReportTemplate,
    scheduleReport,
    deleteScheduledReport,
    refresh
  } = usePresenceReports();

  const [activeTab, setActiveTab] = useState('generate');
  const [reportFilter, setReportFilter] = useState<ReportFilter>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 jours
    endDate: new Date(),
    employeeIds: [],
    departments: [],
    type: 'custom'
  });

  const [selectedReport, setSelectedReport] = useState<PresenceReport | null>(null);
  const [previewDialog, setPreviewDialog] = useState(false);
  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [templateDialog, setTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  const [scheduleConfig, setScheduleConfig] = useState({
    name: '',
    templateId: '',
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    isActive: true
  });

  // Types de rapports disponibles
  const reportTypes = [
    { value: 'daily', label: 'Rapport quotidien', description: 'Rapport des présences du jour' },
    { value: 'weekly', label: 'Rapport hebdomadaire', description: 'Rapport des présences de la semaine' },
    { value: 'monthly', label: 'Rapport mensuel', description: 'Rapport des présences du mois' },
    { value: 'custom', label: 'Rapport personnalisé', description: 'Rapport sur une période personnalisée' }
  ];

  // Formats d'export disponibles
  const exportFormats = [
    { value: 'pdf', label: 'PDF', icon: FileText },
    { value: 'excel', label: 'Excel', icon: FileText },
    { value: 'csv', label: 'CSV', icon: FileText }
  ];

  // Générer un rapport
  const handleGenerateReport = async () => {
    try {
      const report = await generateReport(reportFilter);
      setSelectedReport(report);
      setPreviewDialog(true);
    } catch (err) {
      console.error('Failed to generate report:', err);
    }
  };

  // Exporter un rapport
  const handleExportReport = async (format: string) => {
    if (!selectedReport) return;

    try {
      await exportReport(selectedReport.id!, format);
    } catch (err) {
      console.error('Failed to export report:', err);
    }
  };

  // Sauvegarder comme modèle
  const handleSaveTemplate = async () => {
    try {
      await saveReportTemplate({
        name: templateName,
        description: templateDescription,
        filters: reportFilter,
        organizationId: user?.organizationId!
      });

      setTemplateDialog(false);
      setTemplateName('');
      setTemplateDescription('');
      refresh();
    } catch (err) {
      console.error('Failed to save template:', err);
    }
  };

  // Programmer un rapport
  const handleScheduleReport = async () => {
    try {
      await scheduleReport({
        name: scheduleConfig.name || 'Rapport programmé',
        templateId: scheduleConfig.templateId || 'default',
        frequency: scheduleConfig.frequency,
        isActive: scheduleConfig.isActive,
        organizationId: user?.organizationId!
      });

      setScheduleDialog(false);
      setScheduleConfig({
        name: '',
        templateId: '',
        frequency: 'weekly',
        isActive: true
      });
      refresh();
    } catch (err) {
      console.error('Failed to schedule report:', err);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rapports de présence</h1>
          <p className="text-muted-foreground">
            Générez et planifiez des rapports de présence détaillés
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="generate" className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            Générer
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Modèles ({reportTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            Programmés ({scheduledReports.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Historique ({reports.length})
          </TabsTrigger>
        </TabsList>

        {/* Génération de rapports */}
        <TabsContent value="generate" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Configuration du rapport */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    Configuration du rapport
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Type de rapport */}
                  <div className="space-y-2">
                    <Label>Type de rapport</Label>
                    <Select
                      value={reportFilter.type}
                      onValueChange={(value) => setReportFilter(prev => ({ ...prev, type: value as 'daily' | 'weekly' | 'monthly' | 'custom' }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                      <SelectContent>
                        {reportTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div>
                              <div className="font-medium">{type.label}</div>
                              <div className="text-sm text-muted-foreground">{type.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Période */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date de début</Label>
                      <Input
                        type="date"
                        value={reportFilter.startDate.toISOString().split('T')[0]}
                        onChange={(e) => setReportFilter(prev => ({ ...prev, startDate: new Date(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date de fin</Label>
                      <Input
                        type="date"
                        value={reportFilter.endDate.toISOString().split('T')[0]}
                        onChange={(e) => setReportFilter(prev => ({ ...prev, endDate: new Date(e.target.value) }))}
                      />
                    </div>
                  </div>

                  {/* Filtres avancés */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Filtres avancés</h4>
                    <p className="text-sm text-muted-foreground">
                      Les filtres avancés seront disponibles dans une prochaine version
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setTemplateDialog(true)}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Sauvegarder comme modèle
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setScheduleDialog(true)}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Programmer
                      </Button>
                    </div>

                    <Button
                      onClick={handleGenerateReport}
                      disabled={loading}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Générer le rapport
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Aperçu des paramètres */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Eye className="h-5 w-5 mr-2" />
                    Aperçu
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm font-medium">Type</div>
                    <div className="text-sm text-muted-foreground">
                      {reportTypes.find(t => t.value === reportFilter.type)?.label}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium">Période</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(reportFilter.startDate)} - {formatDate(reportFilter.endDate)}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium">Employés</div>
                    <div className="text-sm text-muted-foreground">
                      {reportFilter.employeeIds?.length || 0} sélectionné(s)
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Modèles de rapports */}
        <TabsContent value="templates" className="space-y-6">
          <ReportTemplatesList
            templates={reportTemplates}
            onUseTemplate={(template) => {
              setReportFilter(template.filter);
              setActiveTab('generate');
            }}
            onDeleteTemplate={(templateId) => {
              // Implémenter la suppression de modèle
            }}
          />
        </TabsContent>

        {/* Rapports programmés */}
        <TabsContent value="scheduled" className="space-y-6">
          <ScheduledReportsList
            scheduledReports={scheduledReports}
            onToggleSchedule={(scheduleId, isActive) => {
              // Implémenter l'activation/désactivation
            }}
            onDeleteSchedule={deleteScheduledReport}
          />
        </TabsContent>

        {/* Historique des rapports */}
        <TabsContent value="history" className="space-y-6">
          <ReportHistoryList
            reports={reports}
            onViewReport={(report) => {
              setSelectedReport(report);
              setPreviewDialog(true);
            }}
            onExportReport={handleExportReport}
          />
        </TabsContent>
      </Tabs>

      {/* Dialog de prévisualisation */}
      <Dialog open={previewDialog} onOpenChange={setPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aperçu du rapport</DialogTitle>
            <DialogDescription>
              {selectedReport && (
                <div className="flex items-center space-x-4 text-sm">
                  <span>Généré le {formatDate(selectedReport.createdAt)}</span>
                  <Badge variant="outline">{selectedReport.type}</Badge>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              <ReportPreview report={selectedReport} />
            </div>
          )}

          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                {exportFormats.map((format) => (
                  <Button
                    key={format.value}
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportReport(format.value)}
                  >
                    <format.icon className="h-4 w-4 mr-2" />
                    {format.label}
                  </Button>
                ))}
              </div>
              <Button onClick={() => setPreviewDialog(false)}>
                Fermer
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de sauvegarde de modèle */}
      <Dialog open={templateDialog} onOpenChange={setTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sauvegarder comme modèle</DialogTitle>
            <DialogDescription>
              Créez un modèle réutilisable avec les paramètres actuels
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Nom du modèle</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Ex: Rapport mensuel équipe"
              />
            </div>
            <div>
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Description du modèle..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={!templateName.trim()}
            >
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de programmation */}
      <Dialog open={scheduleDialog} onOpenChange={setScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Programmer le rapport</DialogTitle>
            <DialogDescription>
              Configurez l'envoi automatique de ce rapport
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom du rapport programmé</Label>
              <Input
                value={scheduleConfig.name}
                onChange={(e) => setScheduleConfig(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Rapport hebdomadaire équipe"
              />
            </div>

            <div>
              <Label>Fréquence</Label>
              <Select
                value={scheduleConfig.frequency}
                onValueChange={(value) => setScheduleConfig(prev => ({ ...prev, frequency: value as 'daily' | 'weekly' | 'monthly' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Quotidien</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleScheduleReport}
              disabled={!scheduleConfig.name.trim()}
            >
              Programmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

// Composants auxiliaires
interface ReportTemplatesListProps {
  templates: any[];
  onUseTemplate: (template: any) => void;
  onDeleteTemplate: (templateId: string) => void;
}

const ReportTemplatesList: React.FC<ReportTemplatesListProps> = ({
  templates,
  onUseTemplate,
  onDeleteTemplate
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Modèles de rapports</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {templates.map((template) => (
            <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">{template.name}</div>
                <div className="text-sm text-muted-foreground">{template.description}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Créé le {formatDate(new Date(template.createdAt))}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUseTemplate(template)}
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Utiliser
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteTemplate(template.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {templates.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2" />
              <p>Aucun modèle de rapport</p>
              <p className="text-sm">Créez votre premier modèle depuis l'onglet Générer</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface ScheduledReportsListProps {
  scheduledReports: any[];
  onToggleSchedule: (scheduleId: string, isActive: boolean) => void;
  onDeleteSchedule: (scheduleId: string) => void;
}

const ScheduledReportsList: React.FC<ScheduledReportsListProps> = ({
  scheduledReports,
  onToggleSchedule,
  onDeleteSchedule
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rapports programmés</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {scheduledReports.map((schedule) => (
            <div key={schedule.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">{schedule.name || 'Rapport programmé'}</div>
                <div className="text-sm text-muted-foreground">
                  {schedule.frequency} - {schedule.time}
                  {schedule.frequency === 'weekly' && ` (${['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][schedule.dayOfWeek]})`}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {schedule.recipients?.length} destinataire(s)
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleSchedule(schedule.id, !schedule.isActive)}
                >
                  {schedule.isActive ? (
                    <StopCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <PlayCircle className="h-4 w-4 text-green-600" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteSchedule(schedule.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {scheduledReports.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2" />
              <p>Aucun rapport programmé</p>
              <p className="text-sm">Programmez votre premier rapport depuis l'onglet Générer</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface ReportHistoryListProps {
  reports: PresenceReport[];
  onViewReport: (report: PresenceReport) => void;
  onExportReport: (format: string) => void;
}

const ReportHistoryList: React.FC<ReportHistoryListProps> = ({
  reports,
  onViewReport,
  onExportReport
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des rapports</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Période</TableHead>
              <TableHead>Créé le</TableHead>
              <TableHead>Créé par</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((report) => (
              <TableRow key={report.id}>
                <TableCell>
                  <Badge variant="outline">{report.type}</Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {formatDate(report.period.startDate)} - {formatDate(report.period.endDate)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {formatDate(report.createdAt)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {report.createdBy}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewReport(report)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onExportReport('pdf')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {reports.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2" />
            <p>Aucun rapport généré</p>
            <p className="text-sm">Générez votre premier rapport depuis l'onglet Générer</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface ReportPreviewProps {
  report: PresenceReport;
}

const ReportPreview: React.FC<ReportPreviewProps> = ({ report }) => {
  return (
    <div className="space-y-4">
      <div className="border-b pb-4">
        <h3 className="text-lg font-semibold">{report.title}</h3>
        <p className="text-sm text-muted-foreground">
          Période: {formatDate(report.period.startDate)} - {formatDate(report.period.endDate)}
        </p>
        {report.description && (
          <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
        )}
      </div>

      <div className="space-y-4">
        {/* Informations du rapport */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-lg font-bold">{report.type}</div>
            <div className="text-sm text-muted-foreground">Type de rapport</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-lg font-bold">{formatDate(report.createdAt)}</div>
            <div className="text-sm text-muted-foreground">Date de création</div>
          </div>
        </div>

        {/* Aperçu des données */}
        <div className="text-center py-8 text-muted-foreground">
          <BarChart3 className="h-8 w-8 mx-auto mb-2" />
          <p>Aperçu détaillé du rapport</p>
          <p className="text-sm">Les données complètes seront disponibles lors de l'export</p>
        </div>
      </div>
    </div>
  );
};