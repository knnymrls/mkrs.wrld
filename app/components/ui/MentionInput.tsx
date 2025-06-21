'use client';

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import MentionDropdown from '../ui/MentionDropdown';
import { MentionSuggestion, TrackedMention, DropdownPosition } from '@/app/types/mention';
import { searchMentions } from '@/lib/mentions/searchMentions';
import { createProjectFromMention } from '@/lib/mentions/createProject';
import {
  updateMentionPositions,
  isInsideExistingMention,
  getMentionAtCursor,
  calculateDropdownPosition
} from '@/lib/mentions/trackMentions';

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
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
  const [trackedMentions, setTrackedMentions] = useState<TrackedMention[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({ top: -1000, left: -1000 });
  const [invalidatedAtPositions, setInvalidatedAtPositions] = useState<Set<number>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || rows !== 1) return;

    const adjustHeight = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    };

    adjustHeight();
  }, [value, rows]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showMentions &&
        textareaRef.current &&
        dropdownRef.current &&
        !textareaRef.current.contains(event.target as Node) &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowMentions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMentions]);

  // Notify parent of mention changes
  useEffect(() => {
    onMentionsChange(trackedMentions);
  }, [trackedMentions]); // onMentionsChange is excluded to prevent infinite loops

  const handleTextChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    const previousContent = value;
    onChange(newValue);
    setCursorPosition(cursorPos);

    // Update tracked mentions
    const updatedMentions = updateMentionPositions(
      trackedMentions,
      previousContent,
      newValue,
      cursorPos
    );
    setTrackedMentions(updatedMentions);

    // Clean up invalidated positions if the @ was deleted
    const newInvalidatedPositions = new Set(invalidatedAtPositions);
    for (const pos of invalidatedAtPositions) {
      if (pos >= newValue.length || newValue[pos] !== '@') {
        newInvalidatedPositions.delete(pos);
      }
    }
    if (newInvalidatedPositions.size !== invalidatedAtPositions.size) {
      setInvalidatedAtPositions(newInvalidatedPositions);
    }

    // Check for @ mentions
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      // Check if this @ position was previously invalidated by a space
      if (invalidatedAtPositions.has(lastAtIndex)) {
        setShowMentions(false);
        return;
      }

      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);

      // Check if user typed @ followed by a space (or navigated back to it)
      // Also check if there's a space immediately after the @ in the full text
      const hasSpaceAfterAt = lastAtIndex + 1 < newValue.length && newValue[lastAtIndex + 1] === ' ';
      if (textAfterAt.startsWith(' ') || hasSpaceAfterAt) {
        // Mark this @ position as invalidated
        setInvalidatedAtPositions(new Set([...invalidatedAtPositions, lastAtIndex]));
        setShowMentions(false);
        return;
      }

      // Check if we're inside an existing mention
      if (!isInsideExistingMention(lastAtIndex, updatedMentions)) {
        // Calculate dropdown position BEFORE showing the dropdown
        if (textareaRef.current) {
          const position = calculateDropdownPosition(
            textareaRef.current,
            lastAtIndex,
            newValue
          );
          
          // On mobile, adjust for viewport and soft keyboard
          if (window.innerWidth < 640) {
            const viewportHeight = window.visualViewport?.height || window.innerHeight;
            const maxTop = viewportHeight - 200; // Leave room for dropdown
            
            if (position.top > maxTop) {
              position.top = maxTop;
            }
          }
          
          setDropdownPosition(position);
        }

        // Update search state
        setMentionSearch(textAfterAt);
        setMentionIndex(lastAtIndex);
        setSelectedSuggestionIndex(0);

        // Fetch suggestions
        const suggestions = await searchMentions(textAfterAt);
        setMentionSuggestions(suggestions);

        // Show dropdown AFTER position is set
        setShowMentions(true);

        // Force immediate position update
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            const position = calculateDropdownPosition(
              textareaRef.current,
              lastAtIndex,
              newValue
            );
            
            // On mobile, adjust for viewport and soft keyboard
            if (window.innerWidth < 640) {
              const viewportHeight = window.visualViewport?.height || window.innerHeight;
              const maxTop = viewportHeight - 200; // Leave room for dropdown
              
              if (position.top > maxTop) {
                position.top = maxTop;
              }
            }
            
            setDropdownPosition(position);
          }
        });
      }
    } else if (showMentions) {
      // Close dropdown if @ was deleted
      setShowMentions(false);
    }
  };

  const selectMention = async (mention: MentionSuggestion) => {
    let mentionToAdd = mention;

    // Handle creating new project
    if (mention.id === 'create-new' && userId) {
      const newProject = await createProjectFromMention(mention.name, userId);
      if (!newProject) return;

      mentionToAdd = {
        id: newProject.id,
        name: newProject.title,
        type: 'project'
      };
    }

    // Update the text content (remove the @ symbol)
    const beforeMention = value.substring(0, mentionIndex);
    const afterCursor = value.substring(cursorPosition);
    const mentionText = mentionToAdd.name; // No @ symbol
    const newContent = `${beforeMention}${mentionText} ${afterCursor}`;

    // Track the mention position
    const newMention: TrackedMention = {
      id: mentionToAdd.id,
      name: mentionToAdd.name,
      type: mentionToAdd.type,
      start: mentionIndex,
      end: mentionIndex + mentionText.length,
      imageUrl: mentionToAdd.imageUrl
    };

    setTrackedMentions([...trackedMentions, newMention]);
    onChange(newContent);
    setShowMentions(false);

    // Focus back on textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
      const newCursorPos = mentionIndex + mentionText.length + 1;
      textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle backspace for mention deletion
    if (e.key === 'Backspace' && !showMentions) {
      const cursorPos = textareaRef.current?.selectionStart || 0;
      const mentionAtCursor = getMentionAtCursor(cursorPos, trackedMentions);

      if (mentionAtCursor) {
        e.preventDefault();

        // Remove the entire mention
        const newContent = value.substring(0, mentionAtCursor.start) +
          value.substring(mentionAtCursor.end);

        // Update tracked mentions
        const updatedMentions = trackedMentions.filter(m => m !== mentionAtCursor);
        updatedMentions.forEach(m => {
          if (m.start > mentionAtCursor.start) {
            const lengthDiff = mentionAtCursor.end - mentionAtCursor.start;
            m.start -= lengthDiff;
            m.end -= lengthDiff;
          }
        });

        onChange(newContent);
        setTrackedMentions(updatedMentions);

        // Set cursor position
        if (textareaRef.current) {
          textareaRef.current.value = newContent;
          const newPos = mentionAtCursor.start;
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
        return;
      }
    }

    if (showMentions && mentionSuggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedSuggestionIndex(prev =>
            prev < mentionSuggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedSuggestionIndex(prev =>
            prev > 0 ? prev - 1 : mentionSuggestions.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          selectMention(mentionSuggestions[selectedSuggestionIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          setShowMentions(false);
          break;
      }
    } else if (e.key === 'Escape' && showMentions) {
      e.preventDefault();
      setShowMentions(false);
    } else if (e.key === 'Enter' && !e.shiftKey && onSubmit) {
      // Handle Enter key for submitting (unless Shift is held for new line)
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative w-full flex">
        {/* Mention overlay for visual styling */}
        <div
          className={`absolute inset-0 pointer-events-none overflow-hidden ${rows === 1 ? 'px-3 py-2' : 'p-3'} text-sm`}
          style={{
            fontFamily: 'inherit',
            lineHeight: '1.5',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: rows === 1 ? '120px' : rows === 3 ? '120px' : undefined
          }}
        >
          {(() => {
            let lastIndex = 0;
            const parts: React.ReactElement[] = [];

            // Sort mentions by position
            const sortedMentions = [...trackedMentions].sort((a, b) => a.start - b.start);

            sortedMentions.forEach((mention, idx) => {
              // Add text before mention
              if (mention.start > lastIndex) {
                parts.push(
                  <span key={`text-${idx}`} className="invisible">
                    {value.substring(lastIndex, mention.start)}
                  </span>
                );
              }

              // Add mention with underline only
              parts.push(
                <span
                  key={`mention-${idx}`}
                  className="text-primary underline decoration-primary decoration-1 underline-offset-3"
                >
                  {value.substring(mention.start, mention.end)}
                </span>
              );

              lastIndex = mention.end;
            });

            // Add remaining text
            if (lastIndex < value.length) {
              parts.push(
                <span key="text-end" className="invisible">
                  {value.substring(lastIndex)}
                </span>
              );
            }

            return parts;
          })()}
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full ${rows === 1 ? 'px-3 py-2' : 'p-3'} text-sm text-onsurface-primary placeholder-onsurface-secondary bg-surface-container-muted rounded-lg border-none outline-none focus:outline-none focus:ring-1 focus:ring-onsurface-secondary transition-all disabled:opacity-50 resize-none ${className}`}
          style={{
            fontFamily: 'inherit',
            lineHeight: '1.5',
            caretColor: 'auto',
            minHeight: rows === 1 ? '38px' : undefined,
            maxHeight: rows === 1 ? '120px' : undefined,
            overflow: rows === 1 ? 'hidden' : 'auto'
          }}
          rows={rows}
          disabled={disabled}
          autoFocus={autoFocus}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
        />

        {/* Visual indicator for tracked mentions */}
        {trackedMentions.length > 0 && rows > 1 && (
          <div className="absolute bottom-2 right-2 text-sm
           text-onsurface-secondary">
            {trackedMentions.length} mention{trackedMentions.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Mention Dropdown */}
      {showMentions && (
        <MentionDropdown
          ref={dropdownRef}
          suggestions={mentionSuggestions}
          selectedIndex={selectedSuggestionIndex}
          position={dropdownPosition}
          onSelect={selectMention}
          onHover={setSelectedSuggestionIndex}
          usePortal={true}
        />
      )}
    </div>
  );
}