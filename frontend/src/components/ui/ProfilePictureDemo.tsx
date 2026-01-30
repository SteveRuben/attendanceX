import React from 'react';
import { ProfilePicture } from './ProfilePicture';

/**
 * Demo component to showcase ProfilePicture variations
 * This can be used for testing or documentation purposes
 */
export const ProfilePictureDemo: React.FC = () => {
  const testNames = [
    'John Doe',
    'Marie Dupont',
    'Alex Smith',
    'Sarah Johnson',
    'Michael Brown',
    'Emma Wilson',
    'David Lee',
    'Lisa Chen',
    'Robert Taylor',
    'Anna Garcia',
    'J',
    'Jean-Pierre',
    'Marie-Claire Dubois',
    'A',
    ''
  ];

  return (
    <div className="p-8 space-y-8">
      <h2 className="text-2xl font-bold mb-6">Profile Picture Demo</h2>
      
      {/* Different sizes */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Sizes</h3>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <ProfilePicture name="John Doe" size="sm" />
            <p className="text-xs mt-2">Small</p>
          </div>
          <div className="text-center">
            <ProfilePicture name="John Doe" size="md" />
            <p className="text-xs mt-2">Medium</p>
          </div>
          <div className="text-center">
            <ProfilePicture name="John Doe" size="lg" />
            <p className="text-xs mt-2">Large</p>
          </div>
          <div className="text-center">
            <ProfilePicture name="John Doe" size="xl" />
            <p className="text-xs mt-2">Extra Large</p>
          </div>
        </div>
      </div>

      {/* Different names and colors */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Color Variations</h3>
        <div className="grid grid-cols-5 gap-4">
          {testNames.map((name, index) => (
            <div key={index} className="text-center">
              <ProfilePicture name={name} size="lg" />
              <p className="text-xs mt-2 truncate" title={name || 'Empty name'}>
                {name || 'Empty'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive examples */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Interactive</h3>
        <div className="flex gap-4">
          <ProfilePicture 
            name="Clickable User" 
            size="lg" 
            onClick={() => alert('Profile clicked!')}
          />
          <div className="text-sm text-gray-600">
            ← Click this profile picture
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePictureDemo;