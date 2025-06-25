'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useSpring, useMotionValue, AnimatePresence } from 'framer-motion';

interface AIAssistantOrbProps {
  isActive?: boolean;
}

export default function AIAssistantOrb({ isActive = true }: AIAssistantOrbProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const orbRef = useRef<HTMLDivElement>(null);
  
  // Motion values for smooth cursor tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Spring animation for smooth following
  const springConfig = { damping: 25, stiffness: 150 };
  const orbX = useSpring(mouseX, springConfig);
  const orbY = useSpring(mouseY, springConfig);

  useEffect(() => {
    if (!isActive) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      
      // Offset the orb position to follow cursor with some distance
      const offsetX = clientX + 30;
      const offsetY = clientY - 30;
      
      mouseX.set(offsetX);
      mouseY.set(offsetY);
    };

    // Add mouse move listener
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isActive, mouseX, mouseY]);

  const handleOrbClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleVoiceActivation = () => {
    setIsListening(!isListening);
    // Voice activation logic will be added later
  };

  if (!isActive) return null;

  return (
    <>
      {/* Main Orb */}
      <motion.div
        ref={orbRef}
        className="fixed w-[60px] h-[60px] rounded-full cursor-pointer pointer-events-auto flex items-center justify-center"
        style={{
          x: orbX,
          y: orbY,
          zIndex: 9999,
        }}
        animate={{
          scale: isExpanded ? 1.2 : 1,
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleOrbClick}
      >
        {/* Glowing effect layers */}
        <div 
          className="absolute inset-[-20px] rounded-full blur-xl animate-pulse"
          style={{
            background: 'radial-gradient(circle at center, rgba(140, 179, 50, 0.4) 0%, rgba(140, 179, 50, 0.2) 40%, transparent 70%)'
          }}
        />
        
        <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary to-primary-hover shadow-lg shadow-primary/50 overflow-hidden">
          {/* Inner gradient */}
          <div className="absolute inset-[2px] rounded-full bg-gradient-to-br from-primary-hover to-primary opacity-80" />
          
          {/* Animated particles */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-[3px] h-[3px] bg-white rounded-full left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_6px_rgba(255,255,255,0.8)]"
                animate={{
                  y: [0, -20, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
              />
            ))}
          </div>
          
          {/* AI Icon or Status */}
          <div className="relative z-10 text-white flex items-center justify-center">
            {isListening ? (
              <motion.div
                className="w-[30px] h-[30px] border-[3px] border-white rounded-full relative"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <div className="absolute inset-[-6px] border-2 border-white/40 rounded-full" />
              </motion.div>
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2L2 7v10c0 5.5 3.5 10.5 10 11 6.5-.5 10-5.5 10-11V7l-10-5z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </div>
        </div>
      </motion.div>

      {/* Expanded Interface */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="fixed bg-surface-container/95 backdrop-blur-xl rounded-2xl p-5 shadow-xl min-w-[280px] border border-border"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              left: orbX.get(),
              top: orbY.get() + 60,
              zIndex: 9998,
            }}
          >
            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-semibold text-onsurface-primary m-0">AI Assistant</h3>
              <p className="text-sm text-onsurface-secondary m-0">How can I help you discover knowledge?</p>
              <button
                className="px-4 py-2 bg-gradient-to-r from-primary to-primary-hover text-white rounded-lg text-sm font-medium transition-all hover:-translate-y-[1px] hover:shadow-lg hover:shadow-primary/30"
                onClick={handleVoiceActivation}
              >
                {isListening ? 'Listening...' : 'Voice Search'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}