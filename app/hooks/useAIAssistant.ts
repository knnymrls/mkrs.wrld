'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { HoverContext } from '@/app/components/features/AIAssistant/ContextDetector';
import { Suggestion } from '@/app/components/features/AIAssistant/SuggestionBubble';

interface UseAIAssistantOptions {
  enabled?: boolean;
  userId?: string;
}

export function useAIAssistant({ enabled = true, userId }: UseAIAssistantOptions) {
  const [isActive, setIsActive] = useState(enabled);
  const [currentContext, setCurrentContext] = useState<HoverContext | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionPosition, setSuggestionPosition] = useState({ x: 0, y: 0 });
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const analysisCache = useRef<Map<string, Suggestion[]>>(new Map());
  const analysisTimeoutRef = useRef<NodeJS.Timeout>();

  // Handle context changes from the detector
  const handleContextChange = useCallback(async (context: HoverContext) => {
    setCurrentContext(context);
    
    // Clear any pending analysis
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }

    // Hide suggestions if no context
    if (!context.type || !context.id) {
      setShowSuggestions(false);
      return;
    }

    // Check cache first
    const cacheKey = `${context.type}-${context.id}`;
    if (analysisCache.current.has(cacheKey)) {
      setSuggestions(analysisCache.current.get(cacheKey) || []);
      setShowSuggestions(true);
      return;
    }

    // Show loading state
    setShowSuggestions(true);
    setIsLoadingSuggestions(true);

    // Delay analysis to prevent too many API calls
    analysisTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch('/api/ai-assistant/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            context,
            userId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to analyze context');
        }

        const data = await response.json();
        const newSuggestions = data.suggestions || [];
        
        // Cache the results
        analysisCache.current.set(cacheKey, newSuggestions);
        
        // Update state
        setSuggestions(newSuggestions);
        setIsLoadingSuggestions(false);
      } catch (error) {
        console.error('Error analyzing context:', error);
        // For now, show mock suggestions
        const mockSuggestions = getMockSuggestions(context);
        setSuggestions(mockSuggestions);
        analysisCache.current.set(cacheKey, mockSuggestions);
        setIsLoadingSuggestions(false);
      }
    }, 500); // 500ms delay
  }, [userId]);

  // Update suggestion position based on mouse position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (showSuggestions) {
        setSuggestionPosition({
          x: Math.min(e.clientX + 20, window.innerWidth - 340), // Prevent overflow
          y: Math.min(e.clientY + 20, window.innerHeight - 200),
        });
      }
    };

    if (showSuggestions) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [showSuggestions]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, []);

  // Mock suggestions for demo
  const getMockSuggestions = (context: HoverContext): Suggestion[] => {
    if (context.type === 'post') {
      return [
        {
          id: '1',
          type: 'similarity',
          title: 'Similar discussions',
          description: '3 related posts about this topic in the past week',
          action: {
            label: 'View related',
            href: `/search?q=${encodeURIComponent(context.content || '')}`,
          },
        },
        {
          id: '2',
          type: 'connection',
          title: 'Connect with experts',
          description: 'Sarah Chen and Mike Johnson have expertise in this area',
          action: {
            label: 'View profiles',
            onClick: () => console.log('View experts'),
          },
        },
      ];
    } else if (context.type === 'profile') {
      return [
        {
          id: '1',
          type: 'insight',
          title: 'Recent activity',
          description: 'Active in Machine Learning and React discussions',
          action: {
            label: 'View posts',
            href: `/profile/${context.id}`,
          },
        },
        {
          id: '2',
          type: 'connection',
          title: 'Common connections',
          description: 'You both know 5 people',
          action: {
            label: 'See connections',
            onClick: () => console.log('View connections'),
          },
        },
      ];
    } else if (context.type === 'project') {
      return [
        {
          id: '1',
          type: 'trend',
          title: 'Project momentum',
          description: 'Activity increased 40% this week',
          action: {
            label: 'View analytics',
            href: `/projects/${context.id}`,
          },
        },
        {
          id: '2',
          type: 'connection',
          title: 'Contributors',
          description: '8 people are actively contributing',
          action: {
            label: 'View team',
            href: `/projects/${context.id}#contributors`,
          },
        },
      ];
    }
    return [];
  };

  return {
    isActive,
    setIsActive,
    currentContext,
    suggestions,
    isLoadingSuggestions,
    showSuggestions,
    suggestionPosition,
    handleContextChange,
  };
}