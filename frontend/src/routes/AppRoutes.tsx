/**
 * Configuration des routes de l'application
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthRedirect } from '@/components/auth/AuthRedirect';
import { OrganizationDashboard } from '@/components/organization/OrganizationDashboard';
import { EventAnalyticsDashboard } from '@/components/analytics/EventAnalyticsDashboard';
import { AttendanceValidationReport } from '@/components/analytics/AttendanceValidationReport';
import { TeamParticipationChart } from '@/components/analytics/TeamParticipationChart';

interface AppRoutesProps {
  user: {
    uid: string;
    email: string;
    displayName?: string;
  };
}

export const AppRoutes: React.FC<AppRoutesProps> = ({ user }) => {
  return (
    <Routes>
      {/* Route racine - redirection et configuration */}
      <Route 
        path="/" 
        element={<AuthRedirect user={user} />} 
      />
      
      {/* Routes d'organisation */}
      <Route 
        path="/organization/:organizationId/*" 
        element={<OrganizationRoutes userId={user.uid} />} 
      />
      
      {/* Route par défaut */}
      <Route 
        path="*" 
        element={<Navigate to="/" replace />} 
      />
    </Routes>
  );
};

/**
 * Routes spécifiques à une organisation
 */
const OrganizationRoutes: React.FC<{ userId: string }> = ({ userId }) => {
  return (
    <Routes>
      {/* Tableau de bord principal */}
      <Route 
        path="/dashboard" 
        element={<OrganizationDashboard userId={userId} />} 
      />
      
      {/* Analytics */}
      <Route 
        path="/analytics/events" 
        element={<EventAnalyticsDashboard organizationId="" />} 
      />
      <Route 
        path="/analytics/validation" 
        element={<AttendanceValidationReport organizationId="" />} 
      />
      <Route 
        path="/analytics/teams" 
        element={<TeamParticipationChart organizationId="" />} 
      />
      
      {/* Route par défaut pour l'organisation */}
      <Route 
        path="*" 
        element={<Navigate to="dashboard" replace />} 
      />
    </Routes>
  );
};