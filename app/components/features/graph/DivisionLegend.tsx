'use client';

import React from 'react';
import { NELNET_DIVISIONS, getDivisionColor } from '@/lib/constants/divisions';
import { X } from 'lucide-react';

interface DivisionLegendProps {
  visibleDivisions: string[];
  onClose?: () => void;
}

export default function DivisionLegend({ visibleDivisions, onClose }: DivisionLegendProps) {
  // Only show divisions that are currently visible
  const activeDivisions = NELNET_DIVISIONS.filter(division => 
    visibleDivisions.includes(division)
  );

  if (activeDivisions.length === 0) return null;

  return (
    <div className="absolute bottom-20 right-4 z-20 bg-surface-bright/80 backdrop-blur-md rounded-lg border border-border p-3 w-48">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-onsurface-secondary">Division Colors</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-0.5 hover:bg-surface-container-muted rounded transition-colors"
          >
            <X size={12} className="text-onsurface-secondary" />
          </button>
        )}
      </div>
      
      <div className="space-y-1.5">
        {activeDivisions.slice(0, 8).map(division => (
          <div key={division} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: getDivisionColor(division) }}
            />
            <span className="text-xs text-onsurface-secondary truncate">
              {division}
            </span>
          </div>
        ))}
        {activeDivisions.length > 8 && (
          <div className="text-xs text-onsurface-secondary/50 italic">
            +{activeDivisions.length - 8} more
          </div>
        )}
      </div>
    </div>
  );
}