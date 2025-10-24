import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Download, 
  Calendar, 
  Users, 
  TrendingUp, 
  Clock,
  BarChart3,
  PieChart,
  FileText,
  Filter,
  RefreshCw
} from 'lucide-react';
import { usePresenceReports } from '../hooks/usePresenceReports';
import { useAuth } from '../hooks/use-auth';

interface ReportFilters {
  startDate: string;
  endDate: string;
  employeeIds?: string[];
  departments?: string[];
  reportType: 'daily' | 'weekly' | 'monthly' | 'custom';
}

const PresenceReports: React.FC = () => {
  const { user } = useAuth();
  const { 
    reports, 
    generateReport, 
    downloadReport,
    isLoading,
    employees,
    departments
  } = usePresenceReports();

  const [filters, setFilters] = useState<ReportFilters>({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reportType: 'weekly'
  });

  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const report = await generateReport(filters);
      setSelectedReport(report);
    } catch (error) {
      console.error('Erreur lors de la génération du rapport:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadReport = async (reportId: string, format: 'pdf' | 'excel' | 'csv') => {
    try {
      await downloadReport(reportId, format);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
    }
  };

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case 'daily': return 'Quotidien';
      case 'weekly': return 'Hebdomadaire';
      case 'monthly': return 'Mensuel';
      case 'custom': return 'Personnalisé';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rapports de Présence</h1>
          <p className="text-muted-foreground">
            Générez et consultez les rapports de présence de votre organisation
          </p>
        </div>
      </div>

      <Tabs defaultValue="generate" className="w-full">
        <TabsList>
          <TabsTrigger value="generate">Générer un Rapport</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
          <TabsTrigger value="analytics">Analyses</TabsTrigger>
        </TabsList>

        {/* Génération de rapport */}
        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres du Rapport</CardTitle>
              <CardDescription>
                Configurez les paramètres pour générer votre rapport de présence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Type de rapport</label>
                  <select
                    value={filters.reportType}
                    onChange={(e) => setFilters({...filters, reportType: e.target.value as any})}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="daily">Quotidien</option>
                    <option value="weekly">Hebdomadaire</option>
                    <option value="monthly">Mensuel</option>
                    <option value="custom">Personnalisé</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Date de début</label>
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Date de fin</label>
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  />
                </div>

                <div className="flex items-end">
                  <Button 
                    onClick={handleGenerateReport}
                    disabled={isGenerating}
                    className="w-full flex items-center gap-2"
                  >
                    {isGenerating ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <BarChart3 className="h-4 w-4" />
                    )}
                    Générer
                  </Button>
                </div>
              </div>

              {/* Filtres avancés */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium mb-4">Filtres Avancés</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Employés</label>
                    <select 
                      multiple 
                      className="w-full px-3 py-2 border rounded-md h-32"
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                        setFilters({...filters, employeeIds: selected});
                      }}
                    >
                      {employees?.map(employee => (
                        <option key={employee.id} value={employee.id}>
                          {employee.firstName} {employee.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Départements</label>
                    <select 
                      multiple 
                      className="w-full px-3 py-2 border rounded-md h-32"
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                        setFilters({...filters, departments: selected});
                      }}
                    >
                      {departments?.map(dept => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aperçu du rapport généré */}
          {selectedReport && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Aperçu du Rapport
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDownloadReport(selectedReport.id, 'pdf')}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      PDF
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDownloadReport(selectedReport.id, 'excel')}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Excel
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDownloadReport(selectedReport.id, 'csv')}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      CSV
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  Rapport {getReportTypeLabel(selectedReport.type)} - 
                  {new Date(selectedReport.startDate).toLocaleDateString('fr-FR')} au {new Date(selectedReport.endDate).toLocaleDateString('fr-FR')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Statistiques générales */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedReport.summary?.totalEmployees || 0}
                    </div>
                    <div className="text-sm text-blue-600">Employés</div>
                  </div>
                  
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {selectedReport.summary?.averageAttendanceRate || 0}%
                    </div>
                    <div className="text-sm text-green-600">Taux de présence</div>
                  </div>
                  
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {selectedReport.summary?.totalHours || 0}h
                    </div>
                    <div className="text-sm text-yellow-600">Heures totales</div>
                  </div>
                  
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {selectedReport.summary?.totalLateArrivals || 0}
                    </div>
                    <div className="text-sm text-red-600">Retards</div>
                  </div>
                </div>

                {/* Tableau des données */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-4 py-2 text-left">Employé</th>
                        <th className="border border-gray-200 px-4 py-2 text-left">Département</th>
                        <th className="border border-gray-200 px-4 py-2 text-center">Jours présents</th>
                        <th className="border border-gray-200 px-4 py-2 text-center">Heures totales</th>
                        <th className="border border-gray-200 px-4 py-2 text-center">Retards</th>
                        <th className="border border-gray-200 px-4 py-2 text-center">Taux présence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReport.entries?.map((entry: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-4 py-2">
                            {entry.employeeName}
                          </td>
                          <td className="border border-gray-200 px-4 py-2">
                            {entry.department}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-center">
                            {entry.daysPresent}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-center">
                            {entry.totalHours?.toFixed(1)}h
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-center">
                            {entry.lateCount}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-center">
                            {entry.attendanceRate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Historique des rapports */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rapports Précédents</CardTitle>
              <CardDescription>
                Consultez et téléchargez vos rapports générés précédemment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reports?.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <FileText className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="font-medium">
                          Rapport {getReportTypeLabel(report.type)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(report.startDate).toLocaleDateString('fr-FR')} - 
                          {new Date(report.endDate).toLocaleDateString('fr-FR')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Généré le {new Date(report.createdAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedReport(report)}
                      >
                        Voir
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDownloadReport(report.id, 'pdf')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {(!reports || reports.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun rapport généré pour le moment.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analyses */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Tendances de Présence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Graphique des tendances à implémenter
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Répartition par Département
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Graphique en secteurs à implémenter
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Heures de Pointe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Analyse des heures de pointe à implémenter
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Performance par Équipe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Comparaison des équipes à implémenter
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PresenceReports;