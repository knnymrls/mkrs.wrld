'use client';

import React, { useState } from 'react';
import { Users, Briefcase, MessageSquare, ChevronDown, ChevronUp, Building2 } from 'lucide-react';
import { NELNET_DIVISIONS, getDivisionColor } from '@/lib/constants/divisions';

interface EnhancedGraphControlsProps {
  showPeople: boolean;
  showProjects: boolean;
  showPosts: boolean;
  onTogglePeople: () => void;
  onToggleProjects: () => void;
  onTogglePosts: () => void;
  connectionThreshold: number;
  onConnectionThresholdChange: (value: number) => void;
  selectedDivisions: string[];
  onDivisionToggle: (division: string) => void;
  onClearDivisions: () => void;
  onSelectAllDivisions: () => void;
  showDivisionGroups: boolean;
  onToggleDivisionGroups: () => void;
}

export default function EnhancedGraphControls({
  showPeople,
  showProjects,
  showPosts,
  onTogglePeople,
  onToggleProjects,
  onTogglePosts,
  connectionThreshold,
  onConnectionThresholdChange,
  selectedDivisions,
  onDivisionToggle,
  onClearDivisions,
  onSelectAllDivisions,
  showDivisionGroups,
  onToggleDivisionGroups
}: EnhancedGraphControlsProps) {
  const [expandedSection, setExpandedSection] = useState<'types' | 'divisions' | null>('types');

  return (
    <div className="absolute top-20 left-4 z-20 bg-surface-bright/80 backdrop-blur-md rounded-lg border border-border w-64 max-h-[calc(100vh-120px)] overflow-y-auto">
      {/* Types Section */}
      <div className="border-b border-border/50">
        <button
          onClick={() => setExpandedSection(expandedSection === 'types' ? null : 'types')}
          className="w-full p-3 flex items-center justify-between hover:bg-surface-container-muted transition-colors"
        >
          <h3 className="text-sm font-medium text-onsurface-primary">Entity Types</h3>
          {expandedSection === 'types' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        
        {expandedSection === 'types' && (
          <div className="p-3 pt-0 space-y-2">
            <button
              onClick={onTogglePeople}
              className={`w-full flex items-center justify-between p-2 rounded-md transition-all ${
                showPeople ? 'text-onsurface-primary' : 'text-onsurface-secondary/50'
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
                showProjects ? 'text-onsurface-primary' : 'text-onsurface-secondary/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full transition-colors ${
                  showProjects ? 'bg-amber-500' : 'bg-surface-container-muted'
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
                  showPosts ? 'bg-emerald-500' : 'bg-surface-container-muted'
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

      {/* Divisions Section */}
      <div className="border-b border-border/50">
        <button
          onClick={() => setExpandedSection(expandedSection === 'divisions' ? null : 'divisions')}
          className="w-full p-3 flex items-center justify-between hover:bg-surface-container-muted transition-colors"
        >
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-onsurface-secondary" />
            <h3 className="text-sm font-medium text-onsurface-primary">Divisions</h3>
          </div>
          {expandedSection === 'divisions' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        
        {expandedSection === 'divisions' && (
          <div className="p-3 pt-0">
            <div className="flex gap-2 mb-3">
              <button
                onClick={onSelectAllDivisions}
                className="text-xs text-primary hover:underline"
              >
                Select All
              </button>
              <span className="text-xs text-onsurface-secondary">|</span>
              <button
                onClick={onClearDivisions}
                className="text-xs text-primary hover:underline"
              >
                Clear
              </button>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {NELNET_DIVISIONS.map((division) => {
                const isSelected = selectedDivisions.includes(division);
                const color = getDivisionColor(division);
                
                return (
                  <label
                    key={division}
                    className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all hover:bg-surface-container-muted ${
                      isSelected ? 'text-onsurface-primary' : 'text-onsurface-secondary/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onDivisionToggle(division)}
                      className="sr-only"
                    />
                    <div 
                      className="w-3 h-3 rounded-full border-2 transition-all"
                      style={{
                        borderColor: isSelected ? color : 'transparent',
                        backgroundColor: isSelected ? color : '#9CA3AF'
                      }}
                    />
                    <span className="text-sm flex-1">{division}</span>
                  </label>
                );
              })}
            </div>
            
            {/* Division Grouping Toggle */}
            <div className="mt-3 pt-3 border-t border-border/50">
              <label className="flex items-center justify-between cursor-pointer p-2 rounded-md hover:bg-surface-container-muted">
                <span className="text-sm text-onsurface-primary">Group by Division</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showDivisionGroups}
                    onChange={onToggleDivisionGroups}
                    className="sr-only"
                  />
                  <div className={`w-10 h-5 rounded-full transition-colors ${
                    showDivisionGroups ? 'bg-primary' : 'bg-surface-container-muted'
                  }`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                      showDivisionGroups ? 'translate-x-5' : 'translate-x-0.5'
                    } transform mt-0.5`} />
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Connection threshold */}
      <div className="p-3">
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