'use client';

import * as LucideIcons from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface ProjectIconProps {
  icon?: string | null;
  size?: number;
  className?: string;
  variant?: 'default' | 'graph';
}

export default function ProjectIcon({ icon, size = 24, className = '', variant = 'default' }: ProjectIconProps) {
  // Graph variant - similar to how it appears in the graph visualization
  if (variant === 'graph') {
    const IconComponent = icon ? (LucideIcons as any)[icon] as LucideIcon | undefined : null;
    
    return (
      <div className="w-10 h-10 bg-amber-500 dark:bg-amber-600 rounded-full flex items-center justify-center">
        {IconComponent ? (
          <IconComponent size={size} className="text-white" />
        ) : (
          <span className="text-white text-xl">🚀</span>
        )}
      </div>
    );
  }

  // Default variant
  if (!icon) {
    return <span className="text-2xl">🚀</span>;
  }

  // Check if it's a Lucide icon name
  const IconComponent = (LucideIcons as any)[icon] as LucideIcon | undefined;
  
  if (IconComponent) {
    return <IconComponent size={size} className={className} />;
  }

  // If not a Lucide icon, assume it's an emoji or other string
  return <span className="text-2xl">{icon}</span>;
}