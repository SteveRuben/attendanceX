import React, { type ReactNode } from 'react';
import { PreferencesContext } from '../hooks/usePreferences';
import { usePreferences } from '../hooks/usePreferences';

interface PreferencesProviderProps {
  children: ReactNode;
  userId: string;
  organizationId: string;
}

export const PreferencesProvider: React.FC<PreferencesProviderProps> = ({
  children,
  userId,
  organizationId
}) => {
  const preferencesHook = usePreferences(userId, organizationId);

  return (
    <PreferencesContext.Provider value={preferencesHook}>
      {children}
    </PreferencesContext.Provider>
  );
};