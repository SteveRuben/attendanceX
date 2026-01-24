import React from 'react';
import { getProfilePictureProps, ProfilePictureProps } from '@/utils/profilePicture';

interface ProfilePictureComponentProps extends ProfilePictureProps {
  onClick?: () => void;
  title?: string;
}

export const ProfilePicture: React.FC<ProfilePictureComponentProps> = ({
  name,
  size = 'md',
  className = '',
  onClick,
  title
}) => {
  const { initials, colorClass, sizeClass, baseClass } = getProfilePictureProps(name, size);
  
  const combinedClassName = `${baseClass} ${colorClass} ${sizeClass} ${className}`;
  
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${combinedClassName} hover:scale-105 transition-transform cursor-pointer`}
        title={title || name}
        type="button"
      >
        {initials}
      </button>
    );
  }
  
  return (
    <div className={combinedClassName} title={title || name}>
      {initials}
    </div>
  );
};

export default ProfilePicture;