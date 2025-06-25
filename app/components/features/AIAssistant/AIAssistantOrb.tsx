'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useSpring, useMotionValue, AnimatePresence } from 'framer-motion';
import VoiceInterface from './VoiceInterface';

interface AIAssistantOrbProps {
  isActive?: boolean;
}

export default function AIAssistantOrb({ isActive = true }: AIAssistantOrbProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showVoiceInterface, setShowVoiceInterface] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasStartedFollowing, setHasStartedFollowing] = useState(false);
  const orbRef = useRef<HTMLDivElement>(null);
  
  // Motion values for smooth cursor tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Spring animation for smooth following
  const springConfig = { damping: 25, stiffness: 150 };
  const orbX = useSpring(mouseX, springConfig);
  const orbY = useSpring(mouseY, springConfig);

  // Start following cursor after a delay
  useEffect(() => {
    if (isActive && !hasStartedFollowing) {
      const timer = setTimeout(() => {
        setHasStartedFollowing(true);
        // Set initial position to bottom right corner
        const currentX = window.innerWidth - 80;
        const currentY = window.innerHeight - 80;
        mouseX.set(currentX);
        mouseY.set(currentY);
      }, 1000); // Wait 1 second before starting to follow
      
      return () => clearTimeout(timer);
    }
  }, [isActive, hasStartedFollowing, mouseX, mouseY]);

  useEffect(() => {
    if (!isActive || !hasStartedFollowing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Don't follow cursor if orb is hovered or expanded
      if (isHovered || isExpanded) return;
      
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
  }, [isActive, hasStartedFollowing, isHovered, isExpanded, mouseX, mouseY]);

  const handleOrbClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleVoiceActivation = () => {
    setShowVoiceInterface(true);
    setIsExpanded(false);
  };

  const handleVoiceClose = () => {
    setShowVoiceInterface(false);
  };

  // Keyboard shortcut to toggle expansion (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsExpanded(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Glowing effect layers */}
        <div 
          className={`absolute inset-[-20px] rounded-full blur-xl ${isHovered || !hasStartedFollowing ? 'animate-pulse' : ''}`}
          style={{
            background: 'radial-gradient(circle at center, rgba(140, 179, 50, 0.4) 0%, rgba(140, 179, 50, 0.2) 40%, transparent 70%)'
          }}
        />
        
        {/* Extra glow when stationary to draw attention */}
        {!hasStartedFollowing && (
          <motion.div 
            className="absolute inset-[-30px] rounded-full"
            style={{
              background: 'radial-gradient(circle at center, rgba(140, 179, 50, 0.3) 0%, transparent 60%)'
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
        
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
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-onsurface-primary m-0">AI Assistant</h3>
                <button
                  className="p-1 rounded hover:bg-surface-container-muted transition-colors"
                  onClick={() => {
                    setIsExpanded(false);
                    // You could emit an event here to disable the assistant
                  }}
                  title="Settings"
                >
                  <svg className="w-4 h-4 text-onsurface-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-onsurface-secondary m-0">How can I help you discover knowledge?</p>
              <div className="flex gap-2">
                <button
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-primary to-primary-hover text-white rounded-lg text-sm font-medium transition-all hover:-translate-y-[1px] hover:shadow-lg hover:shadow-primary/30"
                  onClick={handleVoiceActivation}
                >
                  {isListening ? 'Listening...' : 'Voice Search'}
                </button>
                <button
                  className="px-4 py-2 bg-surface-container-muted text-onsurface-secondary rounded-lg text-sm font-medium transition-all hover:bg-surface-container hover:text-onsurface-primary"
                  onClick={() => window.open('/chatbot', '_blank')}
                >
                  Chat
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Interface Modal */}
      <VoiceInterface 
        isActive={showVoiceInterface}
        onClose={handleVoiceClose}
      />
    </>
  );
}