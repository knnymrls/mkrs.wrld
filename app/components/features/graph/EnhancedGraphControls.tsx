'use client';

import React, { useState } from 'react';
import { Users, Briefcase, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';

interface EnhancedGraphControlsProps {
  showPeople: boolean;
  showProjects: boolean;
  showPosts: boolean;
  onTogglePeople: () => void;
  onToggleProjects: () => void;
  onTogglePosts: () => void;
  connectionThreshold: number;
  onConnectionThresholdChange: (value: number) => void;
}

export default function EnhancedGraphControls({
  showPeople,
  showProjects,
  showPosts,
  onTogglePeople,
  onToggleProjects,
  onTogglePosts,
  connectionThreshold,
  onConnectionThresholdChange
}: EnhancedGraphControlsProps) {
  const [expandedSection, setExpandedSection] = useState<'types' | null>('types');

  return (
    <div className="bg-surface-container border border-border rounded-xl p-4 w-full sm:w-auto sm:min-w-[280px] max-h-[calc(100vh-320px)] overflow-y-auto">
      {/* Types Section */}
      <div className="border-b border-border mb-3 pb-3">
        <button
          onClick={() => setExpandedSection(expandedSection === 'types' ? null : 'types')}
          className="w-full p-2 flex items-center justify-between hover:bg-surface-container-muted rounded-lg transition-colors"
        >
          <h3 className="text-sm font-medium text-onsurface-primary">Entity Types</h3>
          {expandedSection === 'types' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        
        {expandedSection === 'types' && (
          <div className="pt-2 space-y-2">
            <button
              onClick={onTogglePeople}
              className={`w-full flex items-center justify-between p-2 rounded-md transition-all ${
                showPeople ? 'text-onsurface-primary' : 'text-onsurface-secondary/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full transition-colors ${
                  showPeople ? 'bg-primary' : 'bg-surface-container-muted'
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
                showProjects ? 'text-onsurface-primary' : 'text-onsurface-secondary/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full transition-colors ${
                  showProjects ? 'bg-amber-500 dark:bg-amber-400' : 'bg-surface-container-muted'
                }`} />
                <span className="text-sm">Projects</span>
              </div>
              <span className="text-xs text-onsurface-secondary">
                {showProjects ? 'visible' : 'hidden'}
              </span>
            </button>

            <button
              onClick={onTogglePosts}
              className={`w-full flex items-center justify-between p-2 rounded-md transition-all ${
                showPosts ? 'text-onsurface-primary' : 'text-onsurface-secondary/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full transition-colors ${
                  showPosts ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-surface-container-muted'
                }`} />
                <span className="text-sm">Posts</span>
              </div>
              <span className="text-xs text-onsurface-secondary">
                {showPosts ? 'visible' : 'hidden'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Connection threshold */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-onsurface-secondary">
            Min Connections
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