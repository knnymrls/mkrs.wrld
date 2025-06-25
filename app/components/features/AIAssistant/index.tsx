'use client';

import React from 'react';
import AIAssistantOrb from './AIAssistantOrb';
import ContextDetector from './ContextDetector';
import SuggestionBubble from './SuggestionBubble';
import { useAIAssistant } from '@/app/hooks/useAIAssistant';
import { useAuth } from '@/app/context/AuthContext';

interface AIAssistantProps {
  enabled?: boolean;
}

export default function AIAssistant({ enabled = true }: AIAssistantProps) {
  const { user } = useAuth();
  const {
    isActive,
    suggestions,
    isLoadingSuggestions,
    showSuggestions,
    suggestionPosition,
    handleContextChange,
  } = useAIAssistant({ 
    enabled, 
    userId: user?.id 
  });

  return (
    <>
      {/* AI Orb that follows cursor */}
      <AIAssistantOrb isActive={isActive} />
      
      {/* Context detector for hover events */}
      <ContextDetector 
        isActive={isActive}
        onContextChange={handleContextChange}
      />
      
      {/* Suggestion bubble */}
      <SuggestionBubble
        suggestions={suggestions}
        isVisible={showSuggestions}
        position={suggestionPosition}
        isLoading={isLoadingSuggestions}
      />
    </>
  );
}