import React from 'react';
import { Clock, Wifi, WifiOff } from 'lucide-react';

interface SessionStatusProps {
  isActive: boolean;
  remainingTime?: number; // in seconds
  showTime?: boolean;
  className?: string;
}

export const SessionStatus: React.FC<SessionStatusProps> = ({
  isActive,
  remainingTime,
  showTime = false,
  className = ''
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isActive) {
    return (
      <div className={`flex items-center gap-1 text-red-500 ${className}`} title="Session inactive">
        <WifiOff className="w-3 h-3" />
        {showTime && <span className="text-xs">Offline</span>}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 text-green-500 ${className}`} title="Session active">
      <Wifi className="w-3 h-3" />
      {showTime && remainingTime && (
        <span className="text-xs font-mono">
          {formatTime(remainingTime)}
        </span>
      )}
    </div>
  );
};

export default SessionStatus;