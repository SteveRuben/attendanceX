// src/App.tsx - Version moderne avec nouveau layout et dashboard
import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from '@/hooks/use-auth';
import { OrganizationOnboardingProvider } from '@/contexts/OrganizationOnboardingContext';
import { OrganizationOnboardingGuard } from '@/components/organization/OrganizationOnboardingGuard';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Loader2 } from 'lucide-react';

// Lazy-loaded pages - Public
const Landing = lazy(() => import('@/pages/Landing/Landing'));
const Features = lazy(() => import('@/pages/Features/Features'));
const Pricing = lazy(() => import('@/pages/Pricing/Pricing'));
const Contact = lazy(() => import('@/pages/Contact/Contact'));
const FAQ = lazy(() => import('@/pages/FAQ/FAQ'));

// Auth pages
const Login = lazy(() => import('@/pages/Auth/Login'));
const Register = lazy(() => import('@/pages/Auth/Register'));
const ForgotPassword = lazy(() => import('@/pages/Auth/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/Auth/ResetPassword'));
const VerifyEmail = lazy(() => import('@/pages/Auth/VerifyEmail'));
const VerifyEmailRequired = lazy(() => import('@/pages/Auth/VerifyEmailRequired'));

// Protected pages
const Dashboard = lazy(() => import('@/pages/Dashboard/Dashboard'));
const OrganizationOnboarding = lazy(() => import('@/components/organization/OrganizationOnboardingFlow'));
const EventsList = lazy(() => import('@/pages/Events/EventsList'));
const EventDetails = lazy(() => import('@/pages/Events/EventDetails'));
const CreateEvent = lazy(() => import('@/pages/Events/CreateEvent'));
const EditEvent = lazy(() => import('@/pages/Events/EditEvent'));
const MarkAttendance = lazy(() => import('@/pages/Attendance/MarkAttendance'));
const AttendanceList = lazy(() => import('@/pages/Attendance/AttendanceList'));

// Integrations pages
const IntegrationsDashboard = lazy(() => import('@/pages/Integrations/IntegrationsDashboard'));

// Presence pages
const PresenceDashboard = lazy(() => import('@/pages/Presence/PresenceDashboard'));
const PresenceManagement = lazy(() => import('@/pages/Presence/PresenceManagement'));
const PresenceReports = lazy(() => import('@/pages/Presence/PresenceReports'));

const UsersList = lazy(() => import('@/pages/Users/UsersList'));
const CreateUser = lazy(() => import('@/pages/Users/CreateUser'));
const EditUser = lazy(() => import('@/pages/Users/EditUser'));
const UserProfile = lazy(() => import('@/pages/Users/UserProfile'));
const UserSettings = lazy(() => import('@/pages/Users/UserSettings'));
const ReportsList = lazy(() => import('@/pages/Reports/ReportsList'));
const NotificationCenter = lazy(() => import('@/pages/Notifications/NotificationCenter'));
const AdminDashboard = lazy(() => import('@/pages/Admin/Dashboard'));

// OAuth pages
const OAuthCallback = lazy(() => import('@/pages/OAuth/OAuthCallback'));

// ML/Analytics pages
const MLDashboard = lazy(() => import('@/pages/Analytics/MLDashboard'));
const PredictionsPage = lazy(() => import('@/pages/Analytics/PredictionsPage'));

// Coming Soon pages
const ComingSoon = lazy(() => import('@/pages/ComingSoon/ComingSoon'));

// System pages
const Status = lazy(() => import('@/pages/System/Status'));
const ApiReference = lazy(() => import('@/pages/System/ApiReference'));

// Error pages
const NotFound = lazy(() => import('@/pages/ErrorPages/NotFound'));
const Unauthorized = lazy(() => import('@/pages/ErrorPages/Unauthorized'));

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
      <p className="text-muted-foreground">Chargement...</p>
    </div>
  </div>
);

const App = () => {
  return (
    <AuthProvider>
      <OrganizationOnboardingProvider>
        <OrganizationOnboardingGuard>
          <div className="min-h-screen bg-background">
            <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/features" element={<Features />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
            
            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/verify-email-required" element={<VerifyEmailRequired />} />
            
            {/* OAuth Callback Route */}
            <Route path="/oauth/callback" element={<OAuthCallback />} />
            
            {/* Protected Routes with Layout */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            {/* Organization Onboarding Route */}
            <Route path="/organization/onboarding" element={
              <ProtectedRoute>
                <OrganizationOnboarding onComplete={() => window.location.href = '/dashboard'} />
              </ProtectedRoute>
            } />
            
            <Route path="/events" element={
              <ProtectedRoute>
                <AppLayout>
                  <EventsList />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/events/:id" element={
              <ProtectedRoute>
                <AppLayout>
                  <EventDetails />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/events/create" element={
              <ProtectedRoute requiredPermissions={['create_events']}>
                <AppLayout>
                  <CreateEvent />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/events/:id/edit" element={
              <ProtectedRoute requiredPermissions={['create_events']}>
                <AppLayout>
                  <EditEvent />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/attendances" element={
              <ProtectedRoute>
                <AppLayout>
                  <AttendanceList />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/attendances/mark/:eventId" element={
              <ProtectedRoute>
                <AppLayout>
                  <MarkAttendance />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            {/* Presence Routes */}
            <Route path="/presence" element={
              <ProtectedRoute>
                <AppLayout>
                  <PresenceDashboard />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/presence/management" element={
              <ProtectedRoute requiredPermissions={['manage_presence']}>
                <AppLayout>
                  <PresenceManagement />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/presence/reports" element={
              <ProtectedRoute requiredPermissions={['view_reports']}>
                <AppLayout>
                  <PresenceReports />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/users" element={
              <ProtectedRoute requiredPermissions={['manage_users']}>
                <AppLayout>
                  <UsersList />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/users/create" element={
              <ProtectedRoute requiredPermissions={['manage_users']}>
                <AppLayout>
                  <CreateUser />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/users/:id/edit" element={
              <ProtectedRoute requiredPermissions={['manage_users']}>
                <AppLayout>
                  <EditUser />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/users/:id" element={
              <ProtectedRoute>
                <AppLayout>
                  <UserProfile />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/profile" element={
              <ProtectedRoute>
                <AppLayout>
                  <UserProfile />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/settings" element={
              <ProtectedRoute>
                <AppLayout>
                  <UserSettings />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/reports" element={
              <ProtectedRoute requiredPermissions={['view_reports']}>
                <AppLayout>
                  <ReportsList />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/notifications" element={
              <ProtectedRoute>
                <AppLayout>
                  <NotificationCenter />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/admin" element={
              <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
                <AppLayout>
                  <AdminDashboard />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/admin/organization" element={
              <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
                <AppLayout>
                  <AdminDashboard />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/admin/users" element={
              <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
                <AppLayout>
                  <AdminDashboard />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/admin/system" element={
              <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
                <AppLayout>
                  <AdminDashboard />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/admin/security" element={
              <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
                <AppLayout>
                  <AdminDashboard />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            {/* Integrations Routes */}
            <Route path="/integrations" element={
              <ProtectedRoute>
                <AppLayout>
                  <IntegrationsDashboard />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            {/* Coming Soon Routes - Phase 3 */}
            <Route path="/appointments" element={
              <ProtectedRoute>
                <AppLayout>
                  <ComingSoon feature="Gestion des Rendez-vous" phase="Phase 3" />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/clients" element={
              <ProtectedRoute>
                <AppLayout>
                  <ComingSoon feature="Gestion des Clients (CRM)" phase="Phase 3" />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/opportunities" element={
              <ProtectedRoute>
                <AppLayout>
                  <ComingSoon feature="Gestion des Opportunités" phase="Phase 3" />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/billing" element={
              <ProtectedRoute requiredPermissions={['manage_billing']}>
                <AppLayout>
                  <ComingSoon feature="Facturation et Paiements" phase="Phase 3" />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/sales" element={
              <ProtectedRoute requiredPermissions={['manage_sales']}>
                <AppLayout>
                  <ComingSoon feature="Gestion des Ventes" phase="Phase 3" />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            {/* Coming Soon Routes - Phase 4 */}
            <Route path="/marketing" element={
              <ProtectedRoute requiredPermissions={['manage_marketing']}>
                <AppLayout>
                  <ComingSoon feature="Marketing Automation" phase="Phase 4" />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/ai-recommendations" element={
              <ProtectedRoute requiredPermissions={['view_reports']}>
                <AppLayout>
                  <ComingSoon feature="Assistant IA et Recommandations" phase="Phase 4" />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            {/* ML/Analytics Routes */}
            <Route path="/analytics" element={
              <ProtectedRoute requiredPermissions={['view_reports']}>
                <AppLayout>
                  <MLDashboard />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/predictions" element={
              <ProtectedRoute requiredPermissions={['view_reports']}>
                <AppLayout>
                  <PredictionsPage />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            {/* System Routes */}
            <Route path="/system/status" element={
              <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
                <AppLayout>
                  <Status />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/system/api-reference" element={
              <ProtectedRoute>
                <AppLayout>
                  <ApiReference />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            {/* Error Routes */}
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          className="!z-[9999]"
        />
          </div>
        </OrganizationOnboardingGuard>
      </OrganizationOnboardingProvider>
    </AuthProvider>
  );
};

export default App;