'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Users, Briefcase, MessageSquare, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface Suggestion {
  id: string;
  type: 'connection' | 'similarity' | 'trend' | 'insight';
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  icon?: React.ReactNode;
}

interface SuggestionBubbleProps {
  suggestions: Suggestion[];
  isVisible: boolean;
  position: { x: number; y: number };
  isLoading?: boolean;
}

export default function SuggestionBubble({ 
  suggestions, 
  isVisible, 
  position,
  isLoading = false 
}: SuggestionBubbleProps) {
  const getIcon = (type: Suggestion['type']) => {
    switch (type) {
      case 'connection':
        return <Users className="w-4 h-4" />;
      case 'similarity':
        return <MessageSquare className="w-4 h-4" />;
      case 'trend':
        return <Briefcase className="w-4 h-4" />;
      case 'insight':
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed bg-surface-container/95 backdrop-blur-xl rounded-xl shadow-lg border border-border overflow-hidden"
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ duration: 0.2 }}
          style={{
            left: position.x,
            top: position.y,
            zIndex: 9997,
            maxWidth: '320px',
          }}
        >
          {isLoading ? (
            <div className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-primary/20 rounded-full animate-pulse" />
                <div className="h-4 bg-surface-container-muted rounded w-32 animate-pulse" />
              </div>
            </div>
          ) : suggestions.length > 0 ? (
            <div className="divide-y divide-border">
              {suggestions.map((suggestion) => (
                <div key={suggestion.id} className="p-3 hover:bg-surface-container-muted transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="text-primary mt-0.5">
                      {suggestion.icon || getIcon(suggestion.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-onsurface-primary mb-1">
                        {suggestion.title}
                      </h4>
                      <p className="text-xs text-onsurface-secondary mb-2">
                        {suggestion.description}
                      </p>
                      {suggestion.action && (
                        <div className="mt-2">
                          {suggestion.action.href ? (
                            <Link
                              href={suggestion.action.href}
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover transition-colors"
                            >
                              {suggestion.action.label}
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          ) : (
                            <button
                              onClick={suggestion.action.onClick}
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover transition-colors"
                            >
                              {suggestion.action.label}
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-sm text-onsurface-secondary">
                Hover over posts, profiles, or projects to see AI insights
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export type { Suggestion };