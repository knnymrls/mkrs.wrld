'use client';

import React, { forwardRef, useMemo, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MentionSuggestion, DropdownPosition } from '@/app/types/mention';
import * as LucideIcons from 'lucide-react';

interface MentionDropdownProps {
  suggestions: MentionSuggestion[];
  selectedIndex: number;
  position: DropdownPosition;
  onSelect: (suggestion: MentionSuggestion) => void;
  onHover: (index: number) => void;
  isLoading?: boolean;
  error?: string | null;
  maxHeight?: number;
  className?: string;
  usePortal?: boolean;
}

interface SuggestionItemProps {
  suggestion: MentionSuggestion;
  isSelected: boolean;
  onSelect: () => void;
  onHover: () => void;
}

const SuggestionItem = React.memo<SuggestionItemProps>(({
  suggestion,
  isSelected,
  onSelect,
  onHover
}) => {
  const isCreateNew = suggestion.id === 'create-new';
  const isPerson = suggestion.type === 'person';

  const avatarElement = useMemo(() => {
    if (isPerson) {
      if (suggestion.imageUrl) {
        return (
          <img
            src={suggestion.imageUrl}
            alt={suggestion.name}
            className="w-5 h-5 rounded-full object-cover flex-shrink-0"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
        );
      }
      return (
        <div className="w-5 h-5 rounded-full bg-onsurface-primary flex items-center justify-center text-xs font-medium text-surface-container flex-shrink-0">
          {suggestion.name.charAt(0).toUpperCase()}
        </div>
      );
    } else {
      if (suggestion.imageUrl) {
        return (
          <img
            src={suggestion.imageUrl}
            alt={suggestion.name}
            className="w-5 h-5 rounded object-cover flex-shrink-0"
            loading="lazy"
          />
        );
      }
      // For projects, check if they have an icon
      if (suggestion.icon) {
        const IconComponent = (LucideIcons as any)[suggestion.icon];
        if (IconComponent) {
          return (
            <div className="w-5 h-5 flex items-center justify-center text-primary">
              <IconComponent className="w-4 h-4" />
            </div>
          );
        }
      }
      return (
        <svg className="w-5 h-5 text-onsurface-primary" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z" clipRule="evenodd" />
        </svg>
      );
    }
  }, [suggestion.imageUrl, suggestion.name, isPerson, suggestion.icon]);

  return (
    <button
      onClick={onSelect}
      onMouseEnter={onHover}
      className={`w-full px-3 py-3 sm:py-2 min-h-[48px] sm:min-h-0 text-left flex items-center gap-2 transition-colors duration-150 focus:outline-none ${isSelected
        ? 'bg-surface-container-muted text-onsurface-primary'
        : 'hover:bg-surface-container-muted text-onsurface-primary'
        }`}
      role="option"
      aria-selected={isSelected}
      aria-label={`${suggestion.type === 'person' ? 'Person' : 'Project'}: ${suggestion.name}${suggestion.subtitle ? `, ${suggestion.subtitle}` : ''}`}
    >
      {avatarElement}

      <div className="flex-1 min-w-0">
        <div className="truncate text-base" style={{ lineHeight: '1.5' }}>
          {suggestion.name}
        </div>

      </div>
    </button>
  );
});

SuggestionItem.displayName = 'SuggestionItem';

const LoadingState = () => (
  <div className="px-4 py-8 flex flex-col items-center justify-center text-onsurface-secondary">
    <div className="flex items-center gap-2 mb-2">
      <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <span className="text-sm font-medium">Searching...</span>
    </div>
    <p className="text-xs text-center">Finding people and projects</p>
  </div>
);

const ErrorState = ({ error }: { error: string }) => (
  <div className="px-4 py-6 flex flex-col items-center justify-center text-red-600 dark:text-red-400">
    <svg className="w-5 h-5 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
    <p className="text-sm font-medium mb-1">Search Error</p>
    <p className="text-xs text-center">{error}</p>
  </div>
);

const EmptyState = () => (
  <div className="px-4 py-6 flex flex-col items-center justify-center text-onsurface-secondary">
    <svg className="w-5 h-5 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
    <p className="text-sm font-medium mb-1">No results found</p>
    <p className="text-xs text-center">Try a different search term</p>
  </div>
);

const KeyboardHints = () => (
  <div className="px-4 py-2 text-xs text-onsurface-primary border-t border-border bg-surface-container-muted flex items-center justify-center gap-2 sm:gap-4">
    <span className="hidden sm:flex items-center gap-1">
      <kbd className="px-1.5 py-0.5 text-xs font-mono bg-surface-container border border-border rounded shadow-sm">↑↓</kbd>
      Navigate
    </span>
    <span className="flex items-center gap-1">
      <kbd className="px-1.5 py-0.5 text-xs font-mono bg-surface-container border border-border rounded shadow-sm">Enter</kbd>
      Select
    </span>
    <span className="flex items-center gap-1">
      <kbd className="px-1.5 py-0.5 text-xs font-mono bg-surface-container border border-border rounded shadow-sm">Esc</kbd>
      Close
    </span>
  </div>
);

const MentionDropdown = forwardRef<HTMLDivElement, MentionDropdownProps>(
  ({
    suggestions,
    selectedIndex,
    position,
    onSelect,
    onHover,
    isLoading = false,
    error = null,
    maxHeight = 320,
    className = "",
    usePortal = true
  }, ref) => {
    const [isVisible, setIsVisible] = useState(false);
    const [adjustedPosition, setAdjustedPosition] = useState(position);

    // Simplified positioning - trust the calculation from the parent
    useEffect(() => {
      if (position.top < 0 || position.left < 0) {
        setIsVisible(false);
        return;
      }

      // Since we're using portal rendering with fixed positioning,
      // the position calculation should already handle all viewport concerns
      setAdjustedPosition(position);
      setIsVisible(true);
    }, [position]);

    const handleSelect = useCallback((suggestion: MentionSuggestion) => {
      onSelect(suggestion);
    }, [onSelect]);

    const handleHover = useCallback((index: number) => {
      onHover(index);
    }, [onHover]);

    const renderedSuggestions = useMemo(() => {
      return suggestions.map((suggestion, index) => (
        <SuggestionItem
          key={`${suggestion.type}-${suggestion.id}-${index}`}
          suggestion={suggestion}
          isSelected={index === selectedIndex}
          onSelect={() => handleSelect(suggestion)}
          onHover={() => handleHover(index)}
        />
      ));
    }, [suggestions, selectedIndex, handleSelect, handleHover]);

    if (!isVisible) return null;

    const dropdownElement = (
      <div
        ref={ref}
        className={`fixed bg-surface-container border border-border rounded-lg shadow-lg overflow-hidden ${className}`}
        style={{
          top: `${adjustedPosition.top}px`,
          left: `${adjustedPosition.left}px`,
          maxHeight: `${maxHeight}px`,
          width: window.innerWidth < 640 ? `${Math.min(window.innerWidth - 32, 320)}px` : '320px',
          transformOrigin: 'top left',
          zIndex: 10000 // Higher than backdrop-blur containers
        }}
        role="listbox"
        aria-label="Mention suggestions"
        aria-orientation="vertical"
      >

        {/* Content */}
        <div
          className="overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          style={{ maxHeight: `${maxHeight - 40}px` }}
        >
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState error={error} />
          ) : suggestions.length === 0 ? (
            <EmptyState />
          ) : (
            <div>
              {renderedSuggestions}
            </div>
          )}
        </div>

        {/* Footer with keyboard hints */}
        {!isLoading && !error && suggestions.length > 0 && <KeyboardHints />}
      </div>
    );

    // Use portal to render outside of any stacking contexts
    if (usePortal && typeof document !== 'undefined') {
      return createPortal(dropdownElement, document.body);
    }

    return dropdownElement;
  }
);

MentionDropdown.displayName = 'MentionDropdown';

export default MentionDropdown;