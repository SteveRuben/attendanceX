import React from 'react';
import { AlertTriangle, Clock, RefreshCw, LogOut } from 'lucide-react';
import { formatRemainingTime, getSessionWarningMessage } from '@/utils/sessionUtils';

interface AutoLogoutWarningProps {
  isOpen: boolean;
  remainingTime: number; // in seconds
  onExtendSession: () => void;
  onLogoutNow: () => void;
}

export const AutoLogoutWarning: React.FC<AutoLogoutWarningProps> = ({
  isOpen,
  remainingTime,
  onExtendSession,
  onLogoutNow
}) => {
  if (!isOpen) return null;

  const warningMessage = getSessionWarningMessage(remainingTime);
  const timeDisplay = formatRemainingTime(remainingTime);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        {/* Modal */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 max-w-md w-full mx-4 animate-in fade-in-0 zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center gap-3 p-6 pb-4">
            <div className="flex-shrink-0 w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Session Expiring Soon
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {warningMessage}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6">
            <div className="flex items-center justify-center gap-2 mb-6 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <Clock className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              <span className="text-2xl font-mono font-bold text-neutral-900 dark:text-white">
                {timeDisplay}
              </span>
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                remaining
              </span>
            </div>

            <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center mb-6">
              Your session will automatically end in {timeDisplay} due to inactivity. 
              Click "Stay Logged In" to continue your session.
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onExtendSession}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Stay Logged In
              </button>
              <button
                onClick={onLogoutNow}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AutoLogoutWarning;