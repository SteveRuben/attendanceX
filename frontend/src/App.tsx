/**
 * Composant App principal avec gestion de l'authentification multi-tenant
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/toaster';
import { MultiTenantAuthProvider } from './contexts/MultiTenantAuthContext';
import { ProtectedRoute } from './components/auth';
import {
  Login,
  SimpleRegister,
  OnboardingFlow,
  InvitationAcceptance,
  VerifyEmail,
  ForgotPassword,
  ResetPassword,
  AuthRedirect,
  ChooseOrganization
} from './components/auth';
import { OnboardingChoice } from './components/auth/OnboardingChoice';
import { PostRegistrationOnboarding } from './components/auth/PostRegistrationOnboarding';
import { TenantOnboarding } from './components/tenant/TenantOnboarding';
import { Loader2 } from 'lucide-react';

// Pages publiques
import Landing from './pages/Landing/Landing';
import Pricing from './pages/Pricing/Pricing';
import FAQ from './pages/FAQ/FAQ';
import Features from './pages/Features/Features';
import Contact from './pages/Contact/Contact';
import SystemStatus from './pages/System/Status';

// Pages protégées multi-tenant
import { MultiTenantDashboard } from './components/organization/MultiTenantDashboard';
import { AppLayout } from './components/layout/AppLayout';

import AdminDashboard from './pages/Admin/Dashboard';
import MLDashboard from './pages/Analytics/MLDashboard';
import IntegrationsDashboard from './pages/Integrations/IntegrationsDashboard';
import UsersList from './pages/Users/UsersList';
import PresenceDashboard from './pages/Presence/PresenceDashboard';
import QRCheckIn from './pages/CheckIn/QRCheckIn';
import ReportsList from './pages/Reports/ReportsList';
import { ManagerDashboard } from './pages/manager/ManagerDashboard';

import { CampaignDashboard } from './components/campaigns/CampaignDashboard';
import { CampaignWizard } from './components/campaigns/CampaignWizard';
import { TemplateManager } from './components/campaigns/templates/TemplateManager';
import { TemplateEditor } from './components/campaigns/templates/TemplateEditor';
import { CampaignAnalyticsDashboard } from './components/campaigns/analytics/CampaignAnalyticsDashboard';
import { useTenant } from './contexts/MultiTenantAuthContext';
import { useParams } from 'react-router-dom';

import EventsList from './pages/Events/EventsList';
import CreateEvent from './pages/Events/CreateEvent';
import EditEvent from './pages/Events/EditEvent';
import EventDetails from './pages/Events/EventDetails';
import EventCalendarPage from './pages/Events/EventCalendarPage';
import EventDashboard from './pages/Events/EventDashboard';

const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
      <p className="text-muted-foreground">Chargement de l'application...</p>
    </div>
  </div>
);

const WithOrgId: React.FC<{ title: string; children: (orgId: string) => React.ReactNode }>
  = ({ title, children }) => {
  const { tenant } = useTenant();
  const orgId = tenant?.id || 'dev-org';
  return (
    <AppLayout title={title}>
      {children(orgId)}
    </AppLayout>
  );
};

const CampaignWizardWithParams: React.FC<{ organizationId: string }> = ({ organizationId }) => {
  const { campaignId } = useParams<{ campaignId?: string }>();
  return <CampaignWizard organizationId={organizationId} campaignId={campaignId} />;
};



const App: React.FC = () => {
  return (
    <MultiTenantAuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Pages publiques - accessibles sans authentification */}
          <Route path="/" element={<Landing />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/features" element={<Features />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/status" element={<SystemStatus />} />

          {/* Pages d'authentification simplifiées */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<SimpleRegister />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Redirections intelligentes */}
          <Route path="/auth/redirect" element={<AuthRedirect />} />
          <Route path="/choose-organization" element={<ChooseOrganization />} />

          {/* Flows spécialisés - onboarding temporairement désactivé, redirection vers le dashboard */}
          <Route path="/onboarding" element={<Navigate to="/dashboard" replace />} />
          <Route path="/onboarding/choice" element={<Navigate to="/dashboard" replace />} />
          <Route path="/onboarding/create" element={<Navigate to="/dashboard" replace />} />
          <Route path="/accept-invitation" element={<InvitationAcceptance />} />
          {/* Onboarding tenant redirigé */}
          <Route path="/onboarding/tenant" element={<Navigate to="/dashboard" replace />} />

          {/* Onboarding tenant pour nouveaux utilisateurs */}
          <Route
            path="/onboarding/tenant"
            element={
              <ProtectedRoute
                requireAuth={true}
                requireTenant={false}
                allowTransitioning={true}
                loadingComponent={<LoadingScreen />}
                onTransitionError={(error) => {
                  console.error('Transition error during onboarding:', error);
                  // Rediriger vers une page d'erreur ou afficher un message
                }}
                transitionFallback={() => (
                  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                      <p className="text-lg font-medium text-gray-900 mb-2">Setting up your organization...</p>
                      <p className="text-muted-foreground">Please wait while we prepare your workspace</p>
                    </div>
                  </div>
                )}
              >
                <TenantOnboarding
                  onComplete={() => {
                    // La redirection est maintenant gérée par le service PostOnboardingRedirectService
                    // dans le composant TenantOnboarding lui-même
                  }}
                />
              </ProtectedRoute>
            }
          />

          {/* Routes protégées multi-tenant */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute
                requireAuth={true}
                requireTenant={false} // Temporary: allow access without tenant to bypass onboarding
                loadingComponent={<LoadingScreen />}
              >
                <MultiTenantDashboard />
              </ProtectedRoute>
            }
          />

          {/* Administration - nécessite des permissions spéciales */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute
                requireAuth={true}
                requireTenant={true}
                requiredPermissions={['admin_access']}
                loadingComponent={<LoadingScreen />}
              >
                <AppLayout title="Admin">
                  <AdminDashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute
                requireAuth={true}
                requireTenant={true}
                requiredPermissions={['manage_users']}
                loadingComponent={<LoadingScreen />}
              >
                <AppLayout title="Users">
                  <UsersList />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/integrations"
            element={
              <ProtectedRoute
                requireAuth={true}
                requireTenant={true}
                requiredPermissions={['manage_integrations']}
                loadingComponent={<LoadingScreen />}
              >
                <AppLayout title="Integrations">
                  <IntegrationsDashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute
                requireAuth={true}
                requireTenant={true}
                requiredPermissions={['view_reports']}
                loadingComponent={<LoadingScreen />}
              >
                <AppLayout title="Reports">
                  <ReportsList />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Analytics ML - nécessite la fonctionnalité avancée */}
          <Route
            path="/analytics/ml"
            element={
              <ProtectedRoute
                requireAuth={true}
                requireTenant={true}
                requiredFeatures={['advancedAnalytics']}
                fallbackPath="/upgrade"
                loadingComponent={<LoadingScreen />}
              >
                <AppLayout title="ML Analytics">
                  <MLDashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Attendance management */}
          <Route
            path="/presence"
            element={
              <ProtectedRoute
                requireAuth={true}
                requireTenant={true}
                requiredPermissions={['view_attendance']}
                loadingComponent={<LoadingScreen />}
              >
                <AppLayout title="Attendance">
                  <PresenceDashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/presence/qr"
            element={
              <ProtectedRoute
                requireAuth={true}
                requireTenant={true}
                requiredPermissions={['check_attendance']}
                loadingComponent={<LoadingScreen />}
              >
                <AppLayout title="QR Check-in">
                  <QRCheckIn />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaigns"
            element={
              <ProtectedRoute requireAuth={true} requireTenant={true} loadingComponent={<LoadingScreen />}>
                <WithOrgId title="Campaigns">{(orgId) => (
                  <CampaignDashboard organizationId={orgId} />
                )}</WithOrgId>
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaigns/new"
            element={
              <ProtectedRoute requireAuth={true} requireTenant={true} loadingComponent={<LoadingScreen />}>
                <WithOrgId title="New Campaign">{(orgId) => (
                  <CampaignWizard organizationId={orgId} />
                )}</WithOrgId>
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaigns/:campaignId/edit"
            element={
              <ProtectedRoute requireAuth={true} requireTenant={true} loadingComponent={<LoadingScreen />}>
                <WithOrgId title="Edit Campaign">{(orgId) => (
                  <CampaignWizardWithParams organizationId={orgId} />
                )}</WithOrgId>
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaigns/templates"
            element={
              <ProtectedRoute requireAuth={true} requireTenant={true} loadingComponent={<LoadingScreen />}>
                <WithOrgId title="Templates">{(orgId) => (
                  <TemplateManager organizationId={orgId} />
                )}</WithOrgId>
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaigns/templates/new"
            element={
              <ProtectedRoute requireAuth={true} requireTenant={true} loadingComponent={<LoadingScreen />}>
                <WithOrgId title="New Template">{(orgId) => (
                  <TemplateEditor organizationId={orgId} />
                )}</WithOrgId>
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaigns/templates/:templateId/edit"
            element={
              <ProtectedRoute requireAuth={true} requireTenant={true} loadingComponent={<LoadingScreen />}>
                <WithOrgId title="Edit Template">{(orgId) => (
                  <TemplateEditor organizationId={orgId} />
                )}</WithOrgId>
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaigns/analytics"
            element={
              <ProtectedRoute requireAuth={true} requireTenant={true} loadingComponent={<LoadingScreen />}>
                <WithOrgId title="Campaign Analytics">{(orgId) => (
                  <CampaignAnalyticsDashboard organizationId={orgId} />
                )}</WithOrgId>
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaigns/analytics/:campaignId"
            element={
              <ProtectedRoute requireAuth={true} requireTenant={true} loadingComponent={<LoadingScreen />}>
                <WithOrgId title="Campaign Analytics">{(orgId) => (
                  <CampaignAnalyticsDashboard organizationId={orgId} />
                )}</WithOrgId>
              </ProtectedRoute>
            }
          />

          <Route
            path="/organization/:organizationId/campaigns"
            element={
              <ProtectedRoute requireAuth={true} requireTenant={true} loadingComponent={<LoadingScreen />}>
                <AppLayout title="Campaigns">
                  <CampaignDashboard organizationId={':organizationId'} />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/organization/:organizationId/campaigns/new"
            element={
              <ProtectedRoute requireAuth={true} requireTenant={true} loadingComponent={<LoadingScreen />}>
                <AppLayout title="New Campaign">
                  <CampaignWizard organizationId={':organizationId'} />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/organization/:organizationId/campaigns/templates"
            element={
              <ProtectedRoute requireAuth={true} requireTenant={true} loadingComponent={<LoadingScreen />}>
                <AppLayout title="Templates">
                  <TemplateManager organizationId={':organizationId'} />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/organization/:organizationId/campaigns/templates/new"
            element={
              <ProtectedRoute requireAuth={true} requireTenant={true} loadingComponent={<LoadingScreen />}>
                <AppLayout title="New Template">
                  <TemplateEditor organizationId={':organizationId'} />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/organization/:organizationId/campaigns/templates/:templateId/edit"
            element={
              <ProtectedRoute requireAuth={true} requireTenant={true} loadingComponent={<LoadingScreen />}>
                <AppLayout title="Edit Template">
                  <TemplateEditor organizationId={':organizationId'} />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/organization/:organizationId/campaigns/analytics"
            element={
              <ProtectedRoute requireAuth={true} requireTenant={true} loadingComponent={<LoadingScreen />}>
                <AppLayout title="Campaign Analytics">
                  <CampaignAnalyticsDashboard organizationId={':organizationId'} />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/organization/:organizationId/campaigns/analytics/:campaignId"
            element={
              <ProtectedRoute requireAuth={true} requireTenant={true} loadingComponent={<LoadingScreen />}>
                <AppLayout title="Campaign Analytics">
                  <CampaignAnalyticsDashboard organizationId={':organizationId'} />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Manager Dashboard */}
          <Route
            path="/manager"
            element={
              <ProtectedRoute
                requireAuth={true}
                requireTenant={true}
                requiredPermissions={['manager_access']}
                loadingComponent={<LoadingScreen />}
              >
                <AppLayout title="Manager">
                  <ManagerDashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Event Management Routes */}
          <Route
            path="/events"
            element={
              <ProtectedRoute
                requireAuth={true}
                requireTenant={true}
                loadingComponent={<LoadingScreen />}
              >
                <AppLayout title="Events">
                  <EventsList />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/dashboard"
            element={
              <ProtectedRoute
                requireAuth={true}
                requireTenant={true}
                loadingComponent={<LoadingScreen />}
              >
                <AppLayout title="Event Dashboard">
                  <EventDashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/calendar"
            element={
              <ProtectedRoute
                requireAuth={true}
                requireTenant={true}
                loadingComponent={<LoadingScreen />}
              >
                <AppLayout title="Event Calendar">
                  <EventCalendarPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/create"
            element={
              <ProtectedRoute
                requireAuth={true}
                requireTenant={true}
                loadingComponent={<LoadingScreen />}
              >
                <AppLayout title="Create Event">
                  <CreateEvent />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/:id"
            element={
              <ProtectedRoute
                requireAuth={true}
                requireTenant={true}
                loadingComponent={<LoadingScreen />}
              >
                <AppLayout title="Event Details">
                  <EventDetails />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/:id/edit"
            element={
              <ProtectedRoute
                requireAuth={true}
                requireTenant={true}
                loadingComponent={<LoadingScreen />}
              >
                <AppLayout title="Edit Event">
                  <EditEvent />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Pages d'erreur et redirection */}
          <Route
            path="/unauthorized"
            element={
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
                  <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
                  <button
                    onClick={() => window.history.back()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            }
          />
          <Route
            path="/upgrade"
            element={
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-gray-900 mb-4">Upgrade Required</h1>
                  <p className="text-gray-600 mb-4">This feature requires a higher plan.</p>
                  <button
                    onClick={() => window.location.href = '/pricing'}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    View Plans
                  </button>
                </div>
              </div>
            }
          />

          {/* Route par défaut */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Toast notifications */}
        <Toaster />
      </div>
    </MultiTenantAuthProvider>
  );
};



export default App;