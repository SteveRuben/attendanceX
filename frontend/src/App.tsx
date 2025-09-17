/**
 * Composant App principal avec gestion de l'authentification multi-tenant
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { MultiTenantAuthProvider } from '@/contexts/MultiTenantAuthContext';
import { ProtectedRoute } from '@/components/auth';
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
} from '@/components/auth';
import { TenantOnboarding } from '@/components/tenant/TenantOnboarding';
import { Loader2 } from 'lucide-react';

// Pages publiques
import Landing from '@/pages/Landing/Landing';
import Pricing from '@/pages/Pricing/Pricing';
import FAQ from '@/pages/FAQ/FAQ';
import Features from '@/pages/Features/Features';
import Contact from '@/pages/Contact/Contact';
import SystemStatus from '@/pages/System/Status';

// Pages protégées multi-tenant
import { MultiTenantDashboard } from '@/components/organization/MultiTenantDashboard';
import AdminDashboard from '@/pages/Admin/Dashboard';
import MLDashboard from '@/pages/Analytics/MLDashboard';
import IntegrationsDashboard from '@/pages/Integrations/IntegrationsDashboard';
import UsersList from '@/pages/Users/UsersList';
import PresenceDashboard from '@/pages/Presence/PresenceDashboard';
import QRCheckIn from '@/pages/CheckIn/QRCheckIn';
import ReportsList from '@/pages/Reports/ReportsList';
import { ManagerDashboard } from './pages/manager/ManagerDashboard';

// Composant de chargement
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
      <p className="text-muted-foreground">Chargement de l'application...</p>
    </div>
  </div>
);



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
          
          {/* Flows spécialisés */}
          <Route path="/onboarding" element={<OnboardingFlow />} />
          <Route path="/accept-invitation" element={<InvitationAcceptance />} />

          {/* Onboarding tenant pour nouveaux utilisateurs */}
          <Route
            path="/onboarding/tenant"
            element={
              <ProtectedRoute
                requireAuth={true}
                requireTenant={false}
                loadingComponent={<LoadingScreen />}
              >
                <TenantOnboarding onComplete={() => window.location.href = '/dashboard'} />
              </ProtectedRoute>
            }
          />

          {/* Routes protégées multi-tenant */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute
                requireAuth={true}
                requireTenant={true}
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
                <AdminDashboard />
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
                <UsersList />
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
                <IntegrationsDashboard />
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
                <ReportsList />
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
                <MLDashboard />
              </ProtectedRoute>
            }
          />

          {/* Gestion de présence */}
          <Route
            path="/presence"
            element={
              <ProtectedRoute
                requireAuth={true}
                requireTenant={true}
                requiredPermissions={['view_attendance']}
                loadingComponent={<LoadingScreen />}
              >
                <PresenceDashboard />
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
                <QRCheckIn />
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
                <ManagerDashboard />
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