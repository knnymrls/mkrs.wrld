import React from 'react';
import { X } from 'lucide-react';

interface RemoveButtonProps {
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'circle' | 'square';
  className?: string;
  label?: string;
}

export default function RemoveButton({
  onClick,
  size = 'md',
  variant = 'circle',
  className = '',
  label = 'Remove'
}: RemoveButtonProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  };

  const shapeClass = variant === 'circle' ? 'rounded-full' : 'rounded';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        ${sizeClasses[size]}
        ${shapeClass}
        bg-red-500 hover:bg-red-600
        text-white
        flex items-center justify-center
        transition-colors
        focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
        ${className}
      `}
      aria-label={label}
    >
      <X size={iconSizes[size]} />
    </button>
  );
}