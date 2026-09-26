'use client';

import React from 'react';

interface PlayerAvatarProps {
  avatar?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  avatar = 'https://api.dicebear.com/7.x/bottts/svg?seed=WHO',
  className = '',
  size = 'md',
}) => {
  const isImage = avatar.startsWith('http') || avatar.startsWith('/') || avatar.includes('svg');

  const sizeClasses = {
    sm: 'w-8 h-8 text-base',
    md: 'w-12 h-12 text-2xl',
    lg: 'w-16 h-16 text-4xl',
    xl: 'w-24 h-24 text-6xl',
  };

  const containerStyle = `${sizeClasses[size]} rounded-full flex items-center justify-center overflow-hidden shrink-0 ${className}`;

  if (isImage) {
    return (
      <div className={containerStyle}>
        <img
          src={avatar}
          alt="Avatar"
          className="w-full h-full object-cover rounded-full"
          onError={(e) => {
            // Fallback if image load fails
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  return (
    <div className={containerStyle}>
      <span>{avatar}</span>
    </div>
  );
};
