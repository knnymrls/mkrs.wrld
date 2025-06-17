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
        className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[9999] overflow-hidden transition-none"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          maxHeight: '240px',
          minWidth: '280px',
          opacity: position.top < 0 ? 0 : 1,
          visibility: position.top < 0 ? 'hidden' : 'visible'
        }}
      >
        <div className="overflow-y-auto max-h-[164px]">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.type}-${suggestion.id}`}
              onClick={() => onSelect(suggestion)}
              onMouseEnter={() => onHover(index)}
              className={`w-full px-3 py-2 text-left flex items-center gap-1 transition-all text-sm ${index === selectedIndex
                ? 'bg-gray-50 text-primary'
                : 'hover:bg-button-bg text-text-primary'
                }`}
            >
              {/* Avatar/Icon */}
              {suggestion.type === 'person' ? (
                suggestion.imageUrl ? (
                  <img
                    src={suggestion.imageUrl}
                    alt={suggestion.name}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-avatar-bg flex items-center justify-center text-xs font-medium text-text-secondary flex-shrink-0">
                    {suggestion.name.charAt(0).toUpperCase()}
                  </div>
                )
              ) : (
                suggestion.imageUrl ? (
                  <img
                    src={suggestion.imageUrl}
                    alt={suggestion.name}
                    className="w-8 h-8 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded bg-button-bg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-text-muted" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z" clipRule="evenodd" />
                    </svg>
                  </div>
                )
              )}

              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{suggestion.name}</div>
                {suggestion.subtitle && (
                  <div className="text-xs text-text-muted truncate">
                    {suggestion.id === 'create-new' ? '+ Create new project' : suggestion.subtitle}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
        <div className="px-3 py-1.5 text-xs text-text-light border-t border-border-light bg-button-bg">
          ↑↓ Navigate • Enter Select • Esc Close
        </div>
      </div>
    );
  }
);

MentionDropdown.displayName = 'MentionDropdown';

export default MentionDropdown;