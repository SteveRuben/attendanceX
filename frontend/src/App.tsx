// src/App.tsx - Version harmonisée avec nouveau CSS
import { useEffect, Suspense, lazy, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import 'react-toastify/dist/ReactToastify.css';

import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import Loading from '@/components/common/Loading';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import { ToastContainer } from 'react-toastify';

// Lazy-loaded pages
const Landing = lazy(() => import('@/pages/Landing/Landing'));
const Features = lazy(() => import('@/pages/Features/Features'));
const Pricing = lazy(() => import('@/pages/Pricing/Pricing'));
const Contact = lazy(() => import('@/pages/Contact/Contact'));
const FAQ = lazy(() => import('@/pages/FAQ/FAQ'));
const Login = lazy(() => import('@/pages/Auth/Login'));
const Register = lazy(() => import('@/pages/Auth/Register'));
const ForgotPassword = lazy(() => import('@/pages/Auth/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/Auth/ResetPassword'));
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
const NotFound = lazy(() => import('@/pages/ErrorPages/NotFound'));

const App = () => {
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Apply theme class to root HTML element
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  if (authLoading) {
    return <Loading fullScreen />;
  }

  // Layout pour les pages publiques (landing, features, etc.)
  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        <Suspense fallback={<Loading />}>
          <Routes>
            {/* Pages publiques */}
            <Route path="/" element={<Landing />} />
            <Route path="/features" element={<Features />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Redirect vers landing si connecté */}
            <Route path="*" element={<Navigate to="/" />} />
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
          className="toast-container"
        />
      </div>
    );
  }

  // Layout pour l'application (utilisateur connecté)
  return (
    <div className="app-layout">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
      
      {/* Main content */}
      <div className="app-main">
        {/* Header avec bouton mobile menu */}
        <Header onMobileMenuToggle={() => setSidebarOpen(true)} />
        
        {/* Content area */}
        <main className="app-content">
          <div className="container-app py-6">
            <Suspense fallback={<Loading />}>
              <Routes>
                {/* Redirect landing vers dashboard si connecté */}
                <Route path="/" element={<Navigate to="/dashboard" />} />
                <Route path="/features" element={<Navigate to="/dashboard" />} />
                <Route path="/pricing" element={<Navigate to="/dashboard" />} />
                <Route path="/contact" element={<Navigate to="/dashboard" />} />
                <Route path="/faq" element={<Navigate to="/dashboard" />} />
                
                {/* Routes protégées */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  
                  {/* Events routes */}
                  <Route path="/events" element={<EventsList />} />
                  <Route path="/events/:id" element={<EventDetails />} />
                  <Route path="/events/create" element={<CreateEvent />} />
                  <Route path="/events/:id/edit" element={<EditEvent />} />
                  
                  {/* Attendance routes */}
                  <Route path="/attendance" element={<AttendanceList />} />
                  <Route path="/attendance/mark/:eventId" element={<MarkAttendance />} />
                  
                  {/* Users routes */}
                  <Route path="/users" element={<UsersList />} />
                  <Route path="/users/:id" element={<UserProfile />} />
                  <Route path="/settings" element={<UserSettings />} />
                  
                  {/* Reports routes */}
                  <Route path="/reports" element={<ReportsList />} />
                  
                  {/* Notifications routes */}
                  <Route path="/notifications" element={<NotificationCenter />} />
                  
                  {/* Admin routes */}
                  <Route path="/admin" element={<AdminDashboard />} />
                </Route>
                
                {/* 404 route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>
      
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
        className="toast-container"
      />
    </div>
  );
};

export default App;