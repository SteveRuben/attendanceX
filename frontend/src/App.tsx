/**
 * Composant App principal avec gestion de l'authentification et redirection
 */

import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthRedirect } from '@/components/auth/AuthRedirect';
import { OrganizationDashboard } from '@/components/organization/OrganizationDashboard';
import { authService } from '@/services';
import { Loader2 } from 'lucide-react';

// Pages publiques
import Landing from '@/pages/Landing/Landing';
import Pricing from '@/pages/Pricing/Pricing';
import FAQ from '@/pages/FAQ/FAQ';
import Features from '@/pages/Features/Features';
import Contact from '@/pages/Contact/Contact';
import SystemStatus from '@/pages/System/Status';
import Login from '@/pages/Auth/Login';
import Register from '@/pages/Auth/Register';
import VerifyEmail from '@/pages/Auth/VerifyEmail';
import ForgotPassword from '@/pages/Auth/ForgotPassword';
import ResetPassword from '@/pages/Auth/ResetPassword';
import { OrganizationSetup } from '@/components/organization/OrganizationSetup';

interface User {
  uid: string;
  email: string;
  displayName?: string;
  emailVerified: boolean;
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Écouter les changements d'état d'authentification
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setUser(user);
      setAuthChecked(true);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Écran de chargement initial
  if (loading || !authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-muted-foreground">Chargement de l'application...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Pages publiques - accessibles sans authentification */}
        <Route path="/" element={<Landing />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/features" element={<Features />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/status" element={<SystemStatus />} />

        {/* Pages d'authentification */}
        <Route
          path="/login"
          element={
            user ? <Navigate to="/dashboard" replace /> : <Login />
          }
        />
        <Route
          path="/register"
          element={
            user ? <Navigate to="/dashboard" replace /> : <Register />
          }
        />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Routes protégées - nécessitent une authentification */}
        {user ? (
          <>
            {/* Redirection et configuration initiale pour les utilisateurs connectés */}
            <Route
              path="/dashboard"
              element={<AuthRedirect user={user} />}
            />

            {/* Configuration d'organisation */}
            <Route
              path="/setup-organization"
              element={
                <OrganizationSetup 
                  userId={user.uid} 
                  userEmail={user.email}
                  initialOrganizationName={localStorage.getItem('pendingOrganizationName') || undefined}
                />
              }
            />

            {/* Tableau de bord d'organisation */}
            <Route
              path="/organization/:organizationId/*"
              element={<OrganizationDashboard userId={user.uid} />}
            />
          </>
        ) : (
          /* Routes protégées pour utilisateurs non connectés - redirection vers login */
          <>
            <Route path="/dashboard" element={<Navigate to="/login" replace />} />
            <Route path="/setup-organization" element={<Navigate to="/login" replace />} />
            <Route path="/organization/*" element={<Navigate to="/login" replace />} />
          </>
        )}

        {/* Route par défaut */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Toast notifications */}
      <Toaster />
    </div>
  );
};



export default App;