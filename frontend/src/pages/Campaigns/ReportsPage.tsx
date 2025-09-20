import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';
import { ReportManager } from '../components/campaigns/reports/ReportManager';
import { ReportBuilder } from '../components/campaigns/reports/ReportBuilder';
import { ScheduledReports } from '../components/campaigns/reports/ScheduledReports';
import { ExecutiveSummary } from '../components/campaigns/reports/ExecutiveSummary';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AlertCircle, ArrowLeft, FileText, Settings, BarChart3, Calendar } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { organizationId } = useParams<{ organizationId: string }>();
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'summary' | 'manager' | 'builder' | 'scheduled'>('summary');
  const [editingReportId, setEditingReportId] = useState<string | null>(null);

  // Vérifier les permissions
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 max-w-md">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Vous devez être connecté pour gérer les rapports.</span>
          </div>
        </Card>
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 max-w-md">
          <div className="flex items-center gap-3 text-orange-600">
            <AlertCircle className="h-5 w-5" />
            <span>Organisation non trouvée. Veuillez vérifier l'URL.</span>
          </div>
        </Card>
      </div>
    );
  }

  // Vérifier les permissions de rôle
  const hasPermission = user.role === 'admin' ||
    user.role === 'manager' ||
    (Array.isArray(user.permissions) && user.permissions.includes('manage_reports'));

  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 max-w-md">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Vous n'avez pas les permissions nécessaires pour gérer les rapports.</span>
          </div>
        </Card>
      </div>
    );
  }

  const handleCreateReport = () => {
    setEditingReportId(null);
    setCurrentView('builder');
  };

  const handleEditReport = (reportId: string) => {
    setEditingReportId(reportId);
    setCurrentView('builder');
  };

  const handleRunReport = (reportId: string) => {
    // Naviguer vers la page d'analytics avec le rapport spécifique
    navigate(`/organization/${organizationId}/campaigns/analytics?report=${reportId}`);
  };

  const handleSaveReport = (report: any) => {
    console.log('Saving report:', report);
    // Logique de sauvegarde
    setCurrentView('manager');
  };

  const handleExportReport = (report: any, format: string) => {
    console.log('Exporting report:', report, 'as', format);
    // Logique d'export
  };

  const handleBackToMain = () => {
    setCurrentView('summary');
    setEditingReportId(null);
  };

  const handleExportSummary = (format: string) => {
    console.log('Exporting executive summary as:', format);
    // Logique d'export du résumé exécutif
  };

  const tabs = [
    { id: 'summary', label: 'Résumé Exécutif', icon: BarChart3 },
    { id: 'manager', label: 'Mes Rapports', icon: FileText },
    { id: 'scheduled', label: 'Programmés', icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'builder' ? (
          <div className="space-y-6">
            {/* Header avec bouton retour */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={handleBackToMain}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour aux rapports
              </Button>
            </div>

            <ReportBuilder
              onSaveReport={handleSaveReport}
              onExportReport={handleExportReport} 
              organizationId={organizationId}            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Navigation par onglets */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setCurrentView(tab.id as any)}
                      className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${currentView === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Contenu des onglets */}
            {currentView === 'summary' && (
              <ExecutiveSummary
                organizationId={organizationId}
                onExport={handleExportSummary}
              />
            )}

            {currentView === 'manager' && (
              <ReportManager
                organizationId={organizationId}
                onCreateReport={handleCreateReport}
                onEditReport={handleEditReport}
                onRunReport={handleRunReport}
              />
            )}

            {currentView === 'scheduled' && (
              <ScheduledReports
                organizationId={organizationId}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};