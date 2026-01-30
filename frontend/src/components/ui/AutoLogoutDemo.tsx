import React from 'react';
import { useSessionStatus } from '@/hooks/useSessionStatus';
import { SessionStatus } from './SessionStatus';
import { AUTO_LOGOUT_CONFIG, getTimeout, getWarningTime } from '@/config/autoLogout';

/**
 * Demo component to showcase auto-logout functionality
 * This can be used for testing or in development
 */
export const AutoLogoutDemo: React.FC = () => {
  const sessionStatus = useSessionStatus();

  return (
    <div className="p-6 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 space-y-4">
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
        Auto-Logout Status
      </h3>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-neutral-600 dark:text-neutral-400">Status:</span>
          <div className="flex items-center gap-2 mt-1">
            <SessionStatus 
              isActive={sessionStatus.isActive} 
              remainingTime={sessionStatus.remainingTime}
              showTime={true}
            />
            <span className={sessionStatus.isActive ? 'text-green-600' : 'text-red-600'}>
              {sessionStatus.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        
        <div>
          <span className="text-neutral-600 dark:text-neutral-400">Remaining Time:</span>
          <div className="font-mono text-lg mt-1">
            {Math.floor(sessionStatus.remainingTime / 60)}:
            {(sessionStatus.remainingTime % 60).toString().padStart(2, '0')}
          </div>
        </div>
        
        <div>
          <span className="text-neutral-600 dark:text-neutral-400">Warning Status:</span>
          <div className={`mt-1 ${sessionStatus.isWarning ? 'text-amber-600' : 'text-neutral-600'}`}>
            {sessionStatus.isWarning ? '⚠️ Warning Active' : '✅ Normal'}
          </div>
        </div>
        
        <div>
          <span className="text-neutral-600 dark:text-neutral-400">Progress:</span>
          <div className="mt-1">
            <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-1000 ${
                  sessionStatus.isWarning ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ width: `${sessionStatus.percentageRemaining}%` }}
              />
            </div>
            <span className="text-xs text-neutral-500 mt-1">
              {sessionStatus.percentageRemaining.toFixed(1)}% remaining
            </span>
          </div>
        </div>
      </div>
      
      <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
        <h4 className="font-medium text-neutral-900 dark:text-white mb-2">Configuration</h4>
        <div className="grid grid-cols-2 gap-4 text-xs text-neutral-600 dark:text-neutral-400">
          <div>
            <span>Timeout: </span>
            <span className="font-mono">{getTimeout().minutes} minutes</span>
          </div>
          <div>
            <span>Warning: </span>
            <span className="font-mono">{getWarningTime().seconds} seconds</span>
          </div>
          <div>
            <span>Enabled: </span>
            <span className="font-mono">{AUTO_LOGOUT_CONFIG.ENABLED ? 'Yes' : 'No'}</span>
          </div>
          <div>
            <span>Events: </span>
            <span className="font-mono">{AUTO_LOGOUT_CONFIG.ACTIVITY_EVENTS.length} tracked</span>
          </div>
        </div>
      </div>
      
      <div className="text-xs text-neutral-500 dark:text-neutral-400">
        💡 Move your mouse, click, or press a key to reset the timer
      </div>
    </div>
  );
};

export default AutoLogoutDemo;