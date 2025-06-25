'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useAIAssistant } from '@/app/hooks/useAIAssistant';
import { useAuth } from '@/app/context/AuthContext';
import SuggestionBubble from './SuggestionBubble';
import ContextDetector from './ContextDetector';

export default function ContextTooltip() {
  const { user } = useAuth();
  const {
    suggestions,
    isLoadingSuggestions,
    showSuggestions,
    suggestionPosition,
    handleContextChange,
  } = useAIAssistant({ 
    enabled: true, 
    userId: user?.id 
  });

  return (
    <>
      {/* Context detector for hover events */}
      <ContextDetector 
        isActive={true}
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