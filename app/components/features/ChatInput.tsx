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

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange: (mentions: TrackedMention[]) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  userId?: string;
  loading?: boolean;
}

export default function ChatInput({
  value,
  onChange,
  onMentionsChange,
  onSubmit,
  placeholder = "Ask a question... Use @ to mention specific people or projects",
  disabled = false,
  userId,
  loading = false
}: ChatInputProps) {
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
    if (!textarea) return;

    const adjustHeight = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    };

    adjustHeight();
  }, [value]);

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
  }, [trackedMentions, onMentionsChange]);

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
    <div className="relative">
      <div className="bg-white shadow-md p-4 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        {/* Textarea container */}
        <div className="relative">
          {/* Mention overlay for visual styling */}
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden text-base"
            style={{
              fontFamily: 'inherit',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            <div className="">
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
                      className="text-transparent underline decoration-text-secondary underline-offset-3"
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
          </div>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            className="w-full bg-transparent text-base resize-none focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            style={{
              fontFamily: 'inherit',
              lineHeight: '1.5',
              minHeight: '56px',
              maxHeight: '200px',
            }}
            rows={2}
            disabled={disabled || loading}
          />
        </div>

        {/* Bottom controls */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              const textarea = textareaRef.current;
              if (textarea) {
                const currentValue = textarea.value;
                const cursorPos = textarea.selectionStart;
                const newValue = currentValue.slice(0, cursorPos) + '@' + currentValue.slice(cursorPos);
                onChange(newValue);
                setTimeout(() => {
                  textarea.focus();
                  textarea.setSelectionRange(cursorPos + 1, cursorPos + 1);
                  // Manually trigger the change handler
                  handleTextChange({
                    target: {
                      value: newValue,
                      selectionStart: cursorPos + 1
                    }
                  } as any);
                }, 0);
              }
            }}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg p-2 text-text-primary cursor-pointer hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
            <span>Mention</span>
          </button>

          <button
            onClick={onSubmit}
            disabled={disabled || loading || !value.trim()}
            className="p-2 rounded-lg bg-primary hover:bg-primary-hover dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
            aria-label="Send message"
          >
            <svg className="w-5 h-5 text-text-primary dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mention Dropdown */}
      {showMentions && mentionSuggestions.length > 0 && (
        <MentionDropdown
          ref={dropdownRef}
          suggestions={mentionSuggestions}
          selectedIndex={selectedSuggestionIndex}
          position={dropdownPosition}
          onSelect={selectMention}
          onHover={setSelectedSuggestionIndex}
        />
      )}
    </div>
  );
}