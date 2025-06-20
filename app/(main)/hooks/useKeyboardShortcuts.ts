import { useEffect } from 'react';

interface KeyboardShortcutsOptions {
  onEscape?: () => void;
  onCreatePost?: () => void;
}

/**
 * Custom hook for handling keyboard shortcuts in the activity feed
 */
export function useKeyboardShortcuts({ onEscape, onCreatePost }: KeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key to close modals
      if (e.key === 'Escape' && onEscape) {
        onEscape();
      }
      
      // Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows/Linux) to create post
      if (e.key === 'P' && e.shiftKey && (e.metaKey || e.ctrlKey) && onCreatePost) {
        e.preventDefault();
        onCreatePost();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEscape, onCreatePost]);
}