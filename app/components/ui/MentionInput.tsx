'use client';

import React, { useState, useEffect, useCallback } from 'react';
import * as Mention from './mention';
import { MentionSuggestion, TrackedMention } from '@/app/types/mention';
import { searchMentions } from '@/lib/mentions/searchMentions';
import { createProjectFromMention } from '@/lib/mentions/createProject';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange: (mentions: TrackedMention[]) => void;
  onSubmit?: () => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  userId?: string;
  className?: string;
  autoFocus?: boolean;
}

export default function MentionInput({
  value,
  onChange,
  onMentionsChange,
  onSubmit,
  placeholder = "Type @ to mention people or projects...",
  rows = 4,
  disabled = false,
  userId,
  className = "",
  autoFocus = false
}: MentionInputProps) {
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
  const [trackedMentions, setTrackedMentions] = useState<TrackedMention[]>([]);
  const [mentionValues, setMentionValues] = useState<string[]>([]);

  // Update parent when tracked mentions change
  useEffect(() => {
    onMentionsChange(trackedMentions);
  }, [trackedMentions, onMentionsChange]);

  // Fetch suggestions when input value changes and contains @
  useEffect(() => {
    const fetchSuggestions = async () => {
      // Extract the current mention being typed (after @)
      const lastAtIndex = value.lastIndexOf('@');
      if (lastAtIndex !== -1) {
        const query = value.substring(lastAtIndex + 1);
        // Only search if there's no space after @ (still typing the mention)
        if (!query.includes(' ')) {
          const suggestions = await searchMentions(query);
          setMentionSuggestions(suggestions);
        }
      }
    };

    fetchSuggestions();
  }, [value]);

  // Handle when mention value changes (when user selects a mention)
  const handleValueChange = useCallback(async (values: string[]) => {
    // Find newly added mentions
    const newMentions = values.filter(v => !mentionValues.includes(v));

    for (const mentionName of newMentions) {
      // Find the suggestion that matches this name
      let suggestion = mentionSuggestions.find(s => s.name === mentionName);

      // Handle creating new project if needed
      if (suggestion?.id === 'create-new' && userId) {
        const newProject = await createProjectFromMention(suggestion.name, userId);
        if (newProject) {
          suggestion = {
            id: newProject.id,
            name: newProject.title,
            type: 'project'
          };
        } else {
          continue;
        }
      }

      if (suggestion) {
        // Add to tracked mentions
        // Note: position tracking is now handled by @diceui/mention internally
        setTrackedMentions(prev => [...prev, {
          id: suggestion.id,
          name: suggestion.name,
          type: suggestion.type,
          start: 0, // Position is handled internally by the library
          end: 0,
          imageUrl: suggestion.imageUrl
        }]);
      }
    }

    // Handle removed mentions
    const removedMentions = mentionValues.filter(v => !values.includes(v));
    if (removedMentions.length > 0) {
      setTrackedMentions(prev =>
        prev.filter(m => !removedMentions.includes(m.name))
      );
    }

    setMentionValues(values);
  }, [mentionValues, mentionSuggestions, userId]);

  // Handle input value changes
  const handleInputChange = useCallback((newValue: string) => {
    onChange(newValue);
  }, [onChange]);

  // Handle Enter key for submission (only for single-line input)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && onSubmit && rows === 1) {
      // Check if the mention popup is open by checking if we're in the middle of typing a mention
      const lastAtIndex = value.lastIndexOf('@');
      const textAfterAt = lastAtIndex !== -1 ? value.substring(lastAtIndex + 1) : '';
      const isMentionOpen = lastAtIndex !== -1 && !textAfterAt.includes(' ') && textAfterAt.length > 0;

      // Only submit if mention popup is not open
      if (!isMentionOpen) {
        e.preventDefault();
        onSubmit();
      }
    }
  }, [onSubmit, rows, value]);

  const InputComponent = rows === 1 ? 'input' : 'textarea';

  return (
    <Mention.Mention
      value={mentionValues}
      onValueChange={handleValueChange}
      inputValue={value}
      onInputValueChange={handleInputChange}
      trigger="@"
      disabled={disabled}
      className={className}
    >
      <Mention.MentionInput
        placeholder={placeholder}
        autoFocus={autoFocus}
        asChild
      >
        {React.createElement(InputComponent, {
          rows: rows === 1 ? undefined : rows,
          onKeyDown: handleKeyDown,
          style: {
            minHeight: rows === 1 ? '38px' : undefined,
            maxHeight: rows === 1 ? '120px' : undefined,
            overflow: rows === 1 ? 'hidden' : 'auto',
            resize: 'none'
          }
        })}
      </Mention.MentionInput>

      <Mention.MentionContent side="bottom" align="start" sideOffset={4}>
        {mentionSuggestions.length > 0 ? (
          mentionSuggestions.map((suggestion) => (
            <Mention.MentionItem
              key={suggestion.id}
              value={suggestion.name}
            >
              <div className="flex items-center gap-2">
                {/* Icon/Avatar */}
                {suggestion.type === 'person' ? (
                  suggestion.imageUrl ? (
                    <img
                      src={suggestion.imageUrl}
                      alt={suggestion.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center text-xs font-medium text-onsurface-secondary">
                      {suggestion.name.charAt(0).toUpperCase()}
                    </div>
                  )
                ) : (
                  suggestion.imageUrl ? (
                    <img
                      src={suggestion.imageUrl}
                      alt={suggestion.name}
                      className="w-6 h-6 rounded object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded bg-surface-container flex items-center justify-center">
                      <svg className="w-4 h-4 text-onsurface-secondary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )
                )}

                {/* Name and optional label */}
                <div className="flex flex-col">
                  <span className="text-sm text-onsurface-primary">
                    {suggestion.name}
                  </span>
                  {suggestion.id === 'create-new' && (
                    <span className="text-xs text-onsurface-secondary">
                      Create new project
                    </span>
                  )}
                </div>
              </div>
            </Mention.MentionItem>
          ))
        ) : (
          <div className="px-2 py-1.5 text-sm text-onsurface-secondary">
            No matches found
          </div>
        )}
      </Mention.MentionContent>
    </Mention.Mention>
  );
}
