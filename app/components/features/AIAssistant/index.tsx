'use client';

import React, { useState, useEffect } from 'react';
import AIAssistantOrb from './AIAssistantOrb';
import ContextDetector from './ContextDetector';
import SuggestionBubble from './SuggestionBubble';
import OnboardingTooltip from './OnboardingTooltip';
import { useAIAssistant } from '@/app/hooks/useAIAssistant';
import { useAuth } from '@/app/context/AuthContext';

interface AIAssistantProps {
  enabled?: boolean;
}

export default function AIAssistant({ enabled = true }: AIAssistantProps) {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [orbPosition, setOrbPosition] = useState({ x: 0, y: 0 });
  
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

  // Show onboarding tooltip on first visit
  useEffect(() => {
    if (enabled && user) {
      const hasSeenOnboarding = localStorage.getItem('ai-assistant-onboarding');
      if (!hasSeenOnboarding) {
        setTimeout(() => {
          setShowOnboarding(true);
        }, 2000); // Show after 2 seconds
      }
    }
  }, [enabled, user]);

  // Track orb position for onboarding tooltip
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setOrbPosition({ x: e.clientX + 30, y: e.clientY - 30 });
    };

    if (showOnboarding) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [showOnboarding]);

  const handleDismissOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem('ai-assistant-onboarding', 'seen');
  };

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
        isVisible={showSuggestions && !showOnboarding}
        position={suggestionPosition}
        isLoading={isLoadingSuggestions}
      />
      
      {/* Onboarding tooltip */}
      <OnboardingTooltip
        isVisible={showOnboarding}
        onDismiss={handleDismissOnboarding}
        position={orbPosition}
      />
    </>
  );
}