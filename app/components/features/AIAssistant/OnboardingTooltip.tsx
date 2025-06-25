'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';

interface OnboardingTooltipProps {
  isVisible: boolean;
  onDismiss: () => void;
  position: { x: number; y: number };
}

export default function OnboardingTooltip({ isVisible, onDismiss, position }: OnboardingTooltipProps) {
  const [currentTip, setCurrentTip] = useState(0);
  
  const tips = [
    {
      title: "Meet your AI Assistant",
      description: "Click me to get started! I'll follow your cursor and provide intelligent suggestions as you browse.",
      icon: <Sparkles className="w-5 h-5" />
    },
    {
      title: "Hover for insights",
      description: "When you hover over posts or profiles, I'll show relevant connections and similar content.",
      icon: <Sparkles className="w-5 h-5" />
    },
    {
      title: "Voice activated",
      description: "Click me and say 'Hey Nural' followed by your question for hands-free search.",
      icon: <Sparkles className="w-5 h-5" />
    }
  ];

  useEffect(() => {
    if (isVisible) {
      const timer = setInterval(() => {
        setCurrentTip((prev) => (prev + 1) % tips.length);
      }, 4000);
      
      return () => clearInterval(timer);
    }
  }, [isVisible, tips.length]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed bg-surface-container/95 backdrop-blur-xl rounded-2xl shadow-xl border border-border overflow-hidden"
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          transition={{ 
            type: "spring",
            damping: 20,
            stiffness: 300
          }}
          style={{
            left: position.x + 80,
            top: position.y - 20,
            zIndex: 9998,
            width: '320px',
          }}
        >
          {/* Gradient border effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary-hover/20 to-primary/20 opacity-50" />
          
          <div className="relative p-5">
            {/* Close button */}
            <button
              onClick={onDismiss}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-surface-container-muted transition-colors"
            >
              <X className="w-4 h-4 text-onsurface-secondary" />
            </button>

            {/* Content */}
            <div className="pr-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTip}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="text-primary mt-0.5">
                      {tips[currentTip].icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-onsurface-primary mb-1">
                        {tips[currentTip].title}
                      </h3>
                      <p className="text-sm text-onsurface-secondary leading-relaxed">
                        {tips[currentTip].description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Progress dots */}
            <div className="flex gap-1.5 justify-center mt-4">
              {tips.map((_, index) => (
                <motion.div
                  key={index}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === currentTip 
                      ? 'w-6 bg-primary' 
                      : 'w-1.5 bg-surface-container-muted'
                  }`}
                />
              ))}
            </div>

            {/* Pointer arrow */}
            <div 
              className="absolute w-3 h-3 bg-surface-container border-l border-b border-border transform rotate-45"
              style={{
                left: '-6px',
                top: '50%',
                marginTop: '-6px'
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}