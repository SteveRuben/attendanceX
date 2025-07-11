import { useEffect, Suspense, lazy } from 'react';
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

  return (
    <div className="flex h-screen overflow-hidden">
      {user && <Sidebar />}
      
      <div className="flex flex-col flex-1 w-0 overflow-hidden">
        {user && <Header />}
        
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="px-4 sm:px-6 md:px-8">
              <Suspense fallback={<Loading />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
                  <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
                  <Route path="/forgot-password" element={!user ? <ForgotPassword /> : <Navigate to="/" />} />
                  <Route path="/reset-password" element={!user ? <ResetPassword /> : <Navigate to="/" />} />
                  <Route path="/" element={!user ? <Landing /> : <Navigate to="/dashboard" />} />
                    
                  {/* Protected routes */}
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
        theme={theme === 'dark' ? 'dark' : 'light'}
      />
    </div>
  );
};

export default App;