/**
 * Composant Progress - Barre de progression
 */

import React from 'react';

interface ProgressProps {
  /** Valeur de progression (0-100) */
  value: number;
  /** Classe CSS pour le conteneur */
  className?: string;
  /** Classe CSS pour l'indicateur */
  indicatorClassName?: string;
  /** Taille de la barre */
  size?: 'sm' | 'md' | 'lg';
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  className = '',
  indicatorClassName = '',
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={`
      w-full bg-gray-200 rounded-full overflow-hidden
      ${sizeClasses[size]}
      ${className}
    `}>
      <div
        className={`
          h-full bg-blue-500 transition-all duration-300 ease-out
          ${indicatorClassName}
        `}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
};

export default Progress;