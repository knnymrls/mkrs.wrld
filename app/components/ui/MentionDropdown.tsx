'use client';

import React, { forwardRef } from 'react';
import { MentionSuggestion, DropdownPosition } from '@/app/types/mention';

interface MentionDropdownProps {
  suggestions: MentionSuggestion[];
  selectedIndex: number;
  position: DropdownPosition;
  onSelect: (suggestion: MentionSuggestion) => void;
  onHover: (index: number) => void;
}

const MentionDropdown = forwardRef<HTMLDivElement, MentionDropdownProps>(
  ({ suggestions, selectedIndex, position, onSelect, onHover }, ref) => {
    if (suggestions.length === 0) return null;

    return (
      <div 
        ref={ref}
        className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden transition-none"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          maxHeight: '200px',
          minWidth: '220px',
          opacity: position.top < 0 ? 0 : 1
        }}
      >
        <div className="overflow-y-auto max-h-[164px]">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.type}-${suggestion.id}`}
              onClick={() => onSelect(suggestion)}
              onMouseEnter={() => onHover(index)}
              className={`w-full px-3 py-1.5 text-left flex items-center gap-2 transition-all text-sm ${
                index === selectedIndex 
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <span className="text-base">{suggestion.type === 'person' ? '👤' : '📁'}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{suggestion.name}</div>
                {suggestion.subtitle && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {suggestion.id === 'create-new' ? '+ Create new project' : suggestion.subtitle}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
        <div className="px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          ↑↓ Navigate • Enter Select • Esc Close
        </div>
      </div>
    );
  }
);

MentionDropdown.displayName = 'MentionDropdown';

export default MentionDropdown;