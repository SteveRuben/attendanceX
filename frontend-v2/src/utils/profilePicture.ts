/**
 * Utility functions for generating profile pictures based on user names
 */

/**
 * Generate initials from a full name
 */
export function getInitials(name: string): string {
  if (!name || name.trim() === '') return 'U';
  
  const words = name.trim().split(/\s+/);
  
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  
  // Take first letter of first and last word
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

/**
 * Generate a consistent color based on the name
 */
export function getProfileColor(name: string): string {
  if (!name) return 'from-gray-500 to-gray-600';
  
  // Create a hash from the name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Convert hash to a color index
  const colorIndex = Math.abs(hash) % profileColors.length;
  return profileColors[colorIndex];
}

/**
 * Predefined gradient colors for profile pictures
 */
const profileColors = [
  'from-blue-500 to-blue-600',
  'from-purple-500 to-purple-600',
  'from-green-500 to-green-600',
  'from-yellow-500 to-yellow-600',
  'from-red-500 to-red-600',
  'from-indigo-500 to-indigo-600',
  'from-pink-500 to-pink-600',
  'from-teal-500 to-teal-600',
  'from-orange-500 to-orange-600',
  'from-cyan-500 to-cyan-600',
  'from-emerald-500 to-emerald-600',
  'from-violet-500 to-violet-600',
  'from-rose-500 to-rose-600',
  'from-amber-500 to-amber-600',
  'from-lime-500 to-lime-600',
  'from-sky-500 to-sky-600',
];

/**
 * Generate a profile picture component props
 */
export interface ProfilePictureProps {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function getProfilePictureProps(name: string, size: 'sm' | 'md' | 'lg' | 'xl' = 'md') {
  const initials = getInitials(name);
  const colorClass = getProfileColor(name);
  
  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-12 w-12 text-lg',
    xl: 'h-16 w-16 text-xl'
  };
  
  return {
    initials,
    colorClass,
    sizeClass: sizeClasses[size],
    baseClass: 'rounded-full bg-gradient-to-br flex items-center justify-center font-medium text-white'
  };
}