// src/App.tsx - Version moderne avec nouveau layout et dashboard
import { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from '@/hooks/use-auth';
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
const EventsList = lazy(() => import('@/pages/Events/EventsList'));
const EventDetails = lazy(() => import('@/pages/Events/EventDetails'));
const CreateEvent = lazy(() => import('@/pages/Events/CreateEvent'));
const EditEvent = lazy(() => import('@/pages/Events/EditEvent'));
const MarkAttendance = lazy(() => import('@/pages/Attendance/MarkAttendance'));
const AttendanceList = lazy(() => import('@/pages/Attendance/AttendanceList'));
const UsersList = lazy(() => import('@/pages/Users/UsersList'));
const UserProfile = lazy(() => import('@/pages/Users/UserProfile'));
const UserSettings = lazy(() => import('@/pages/Users/UserSettings'));
const ReportsList = lazy(() => import('@/pages/Reports/ReportsList'));
const NotificationCenter = lazy(() => import('@/pages/Notifications/NotificationCenter'));
const AdminDashboard = lazy(() => import('@/pages/Admin/Dashboard'));

// ML/Analytics pages
const MLDashboard = lazy(() => import('@/pages/Analytics/MLDashboard'));
const PredictionsPage = lazy(() => import('@/pages/Analytics/PredictionsPage'));

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
            
            {/* Protected Routes with Layout */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
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
            
            <Route path="/users" element={
              <ProtectedRoute requiredPermissions={['manage_users']}>
                <AppLayout>
                  <UsersList />
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
    </AuthProvider>
  );
};

export default App;