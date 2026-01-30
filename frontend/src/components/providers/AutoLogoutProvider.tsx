import React, { ReactNode } from 'react';
import { useAutoLogout } from '@/hooks/useAutoLogout';
import { AutoLogoutWarning } from '@/components/ui/AutoLogoutWarning';
import { AUTO_LOGOUT_CONFIG } from '@/config/autoLogout';

interface AutoLogoutProviderProps {
  children: ReactNode;
  timeout?: number; // in milliseconds
  warningTime?: number; // in milliseconds
  enabled?: boolean;
}

export const AutoLogoutProvider: React.FC<AutoLogoutProviderProps> = ({
  children,
  timeout = AUTO_LOGOUT_CONFIG.TIMEOUT,
  warningTime = AUTO_LOGOUT_CONFIG.WARNING_TIME,
  enabled = AUTO_LOGOUT_CONFIG.ENABLED
}) => {
  const {
    showWarning,
    remainingTime,
    extendSession,
    logoutNow
  } = useAutoLogout({
    timeout,
    warningTime,
    enabled,
    excludeRoutes: AUTO_LOGOUT_CONFIG.EXCLUDED_ROUTES
  });

  return (
    <>
      {children}
      <AutoLogoutWarning
        isOpen={showWarning}
        remainingTime={remainingTime}
        onExtendSession={extendSession}
        onLogoutNow={logoutNow}
      />
    </>
  );
};

export default AutoLogoutProvider;