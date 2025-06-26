'use client';

import React from 'react';
import { Users, Briefcase, MessageSquare, Eye, EyeOff } from 'lucide-react';

interface GraphControlsProps {
  showPeople: boolean;
  showProjects: boolean;
  showPosts: boolean;
  onTogglePeople: () => void;
  onToggleProjects: () => void;
  onTogglePosts: () => void;
  connectionThreshold: number;
  onConnectionThresholdChange: (value: number) => void;
}

export default function GraphControls({
  showPeople,
  showProjects,
  showPosts,
  onTogglePeople,
  onToggleProjects,
  onTogglePosts,
  connectionThreshold,
  onConnectionThresholdChange
}: GraphControlsProps) {
  return (
    <div className="absolute top-20 left-4 z-20 bg-surface-bright/80 backdrop-blur-md rounded-lg border border-border p-3 w-56">
      <h3 className="text-sm font-medium text-onsurface-secondary mb-3">Filter</h3>
      
      <div className="space-y-3">
        {/* Toggle buttons */}
        <button
          onClick={onTogglePeople}
          className={`w-full flex items-center justify-between p-2 rounded-md transition-all ${
            showPeople 
              ? 'text-onsurface-primary' 
              : 'text-onsurface-secondary/50'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full transition-colors ${
              showPeople ? 'bg-blue-500' : 'bg-surface-container-muted'
            }`} />
            <span className="text-sm">People</span>
          </div>
          <span className="text-xs text-onsurface-secondary">
            {showPeople ? 'visible' : 'hidden'}
          </span>
        </button>

        <button
          onClick={onToggleProjects}
          className={`w-full flex items-center justify-between p-2 rounded-md transition-all ${
            showProjects 
              ? 'text-onsurface-primary' 
              : 'text-onsurface-secondary/50'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full transition-colors ${
              showProjects ? 'bg-amber-500' : 'bg-surface-container-muted'
            }`} />
            <span className="text-sm">Projects 🚀</span>
          </div>
          <span className="text-xs text-onsurface-secondary">
            {showProjects ? 'visible' : 'hidden'}
          </span>
        </button>

        <button
          onClick={onTogglePosts}
          className={`w-full flex items-center justify-between p-2 rounded-md transition-all ${
            showPosts 
              ? 'text-onsurface-primary' 
              : 'text-onsurface-secondary/50'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full transition-colors ${
              showPosts ? 'bg-emerald-500' : 'bg-surface-container-muted'
            }`} />
            <span className="text-sm">Posts 💬</span>
          </div>
          <span className="text-xs text-onsurface-secondary">
            {showPosts ? 'visible' : 'hidden'}
          </span>
        </button>
      </div>

      {/* Connection threshold - simplified */}
      <div className="mt-4 pt-3 border-t border-border/50">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-onsurface-secondary">
            Connections
          </label>
          <span className="text-xs font-medium text-onsurface-primary">
            {connectionThreshold}+
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="10"
          value={connectionThreshold}
          onChange={(e) => onConnectionThresholdChange(parseInt(e.target.value))}
          className="w-full h-1 accent-primary"
        />
      </div>
    </div>
  );
}