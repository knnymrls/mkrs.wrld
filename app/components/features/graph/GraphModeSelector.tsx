'use client';

import React from 'react';
import { Radar, Network, TrendingUp, Lightbulb, ChevronDown } from 'lucide-react';

export type GraphMode = 'network' | 'skill-radar' | 'collaboration' | 'trends' | 'opportunities';

interface GraphModeSelectorProps {
  currentMode: GraphMode;
  onModeChange: (mode: GraphMode) => void;
}

const modes = [
  {
    id: 'network' as GraphMode,
    name: 'Network View',
    description: 'Traditional knowledge graph',
    icon: Network,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    iconColor: 'text-blue-600 dark:text-blue-400'
  },
  {
    id: 'skill-radar' as GraphMode,
    name: 'Skill Radar',
    description: 'Expertise gaps & coverage',
    icon: Radar,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    iconColor: 'text-purple-600 dark:text-purple-400'
  },
  {
    id: 'collaboration' as GraphMode,
    name: 'Collaboration Flow',
    description: 'Knowledge flow patterns',
    icon: Network,
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    iconColor: 'text-green-600 dark:text-green-400'
  },
  {
    id: 'trends' as GraphMode,
    name: 'Trend Analysis',
    description: 'Emerging topics & skills',
    icon: TrendingUp,
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    iconColor: 'text-orange-600 dark:text-orange-400'
  },
  {
    id: 'opportunities' as GraphMode,
    name: 'Opportunities',
    description: 'AI-powered insights',
    icon: Lightbulb,
    color: 'from-pink-500 to-pink-600',
    bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    iconColor: 'text-pink-600 dark:text-pink-400'
  }
];

export default function GraphModeSelector({ currentMode, onModeChange }: GraphModeSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const currentModeData = modes.find(m => m.id === currentMode) || modes[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm font-medium text-onsurface-primary hover:text-primary transition-colors"
      >
        <currentModeData.icon className="w-4 h-4" />
        <span>{currentModeData.name}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-2 left-0 bg-surface-container rounded-xl shadow-lg border border-border overflow-hidden z-20 min-w-[200px]">
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => {
                  onModeChange(mode.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface-container-muted transition-colors ${
                  currentMode === mode.id ? 'text-primary font-medium bg-surface-container-muted/50' : 'text-onsurface-primary'
                }`}
              >
                <mode.icon className="w-4 h-4" />
                <span>{mode.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}