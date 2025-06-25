'use client';

import { useEffect, useRef, useCallback } from 'react';

interface HoverContext {
  type: 'post' | 'profile' | 'project' | null;
  id: string | null;
  content: string | null;
  metadata?: Record<string, any>;
}

interface ContextDetectorProps {
  onContextChange: (context: HoverContext) => void;
  isActive: boolean;
}

export default function ContextDetector({ onContextChange, isActive }: ContextDetectorProps) {
  const lastContextRef = useRef<HoverContext>({ type: null, id: null, content: null });
  const hoverTimeoutRef = useRef<NodeJS.Timeout>();

  const extractContext = useCallback((element: Element): HoverContext | null => {
    // Check if hovering over a mention link (MentionLink or MentionLinkSimple)
    const mentionLink = element.closest('[data-mention-type]');
    if (mentionLink) {
      const mentionType = mentionLink.getAttribute('data-mention-type');
      const mentionId = mentionLink.getAttribute('data-mention-id');
      const mentionName = mentionLink.getAttribute('data-mention-name');
      
      if (mentionType && mentionId && mentionName) {
        return {
          type: mentionType === 'person' ? 'profile' : 'project',
          id: mentionId,
          content: mentionName,
          metadata: { name: mentionName }
        };
      }
    }

    // Check if hovering over a post
    const postCard = element.closest('[data-post-id]');
    if (postCard) {
      const postId = postCard.getAttribute('data-post-id');
      const content = postCard.querySelector('[data-post-content]')?.textContent || '';
      const authorName = postCard.querySelector('[data-author-name]')?.textContent || '';
      
      return {
        type: 'post',
        id: postId,
        content: content,
        metadata: { authorName }
      };
    }

    return null;
  }, []);

  useEffect(() => {
    if (!isActive) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Clear any pending timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }

      // Get the element under the cursor
      const element = document.elementFromPoint(e.clientX, e.clientY);
      if (!element) return;

      // Extract context from the element
      const context = extractContext(element);

      // Only trigger if context changed
      if (
        context?.type !== lastContextRef.current.type ||
        context?.id !== lastContextRef.current.id
      ) {
        // Add a small delay to prevent too many updates
        hoverTimeoutRef.current = setTimeout(() => {
          if (context) {
            onContextChange(context);
          } else {
            onContextChange({ type: null, id: null, content: null });
          }
          lastContextRef.current = context || { type: null, id: null, content: null };
        }, 300); // 300ms delay
      }
    };

    // Add event listener
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [isActive, onContextChange, extractContext]);

  return null; // This component doesn't render anything
}

export type { HoverContext };