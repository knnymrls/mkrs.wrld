'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Mic, X, Sparkles, ArrowRight, User, Briefcase, MessageSquare, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

interface AICommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Command {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  category: 'search' | 'navigation' | 'ai' | 'quick';
}

export default function AICommandPalette({ isOpen, onClose }: AICommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { user } = useAuth();

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, onClose]);

  // Commands
  const commands: Command[] = [
    // AI-powered searches
    {
      id: 'find-expert',
      title: 'Find an expert',
      description: 'Search for people with specific skills',
      icon: <User className="w-4 h-4" />,
      action: () => {
        router.push(`/chatbot?q=Who knows ${query || 'about this topic'}?`);
        onClose();
      },
      category: 'ai'
    },
    {
      id: 'discover-similar',
      title: 'Discover similar content',
      description: 'Find related posts and discussions',
      icon: <MessageSquare className="w-4 h-4" />,
      action: () => {
        router.push(`/chatbot?q=Show me content about ${query || 'recent topics'}`);
        onClose();
      },
      category: 'ai'
    },
    {
      id: 'trending',
      title: "What's trending",
      description: 'See what people are talking about',
      icon: <Zap className="w-4 h-4" />,
      action: () => {
        router.push('/chatbot?q=What are the trending topics this week?');
        onClose();
      },
      category: 'ai'
    },
    {
      id: 'ai-chat',
      title: 'Ask AI anything',
      description: 'Get intelligent answers about your organization',
      icon: <Sparkles className="w-4 h-4" />,
      action: () => {
        router.push(query ? `/chatbot?q=${encodeURIComponent(query)}` : '/chatbot');
        onClose();
      },
      category: 'ai'
    },
    // Quick navigation
    {
      id: 'nav-home',
      title: 'Go to Home',
      icon: <ArrowRight className="w-4 h-4" />,
      action: () => {
        router.push('/');
        onClose();
      },
      category: 'navigation'
    },
    {
      id: 'nav-profile',
      title: 'View Profile',
      icon: <User className="w-4 h-4" />,
      action: () => {
        router.push('/profile');
        onClose();
      },
      category: 'navigation'
    },
    {
      id: 'nav-projects',
      title: 'Browse Projects',
      icon: <Briefcase className="w-4 h-4" />,
      action: () => {
        router.push('/projects');
        onClose();
      },
      category: 'navigation'
    },
    // Quick actions
    {
      id: 'create-post',
      title: 'Create a post',
      icon: <MessageSquare className="w-4 h-4" />,
      action: () => {
        // You can emit an event here to open the create post modal
        onClose();
      },
      category: 'quick'
    }
  ];

  // Filter commands based on query
  const filteredCommands = commands.filter(cmd => {
    if (!query) return true;
    const searchText = `${cmd.title} ${cmd.description || ''}`.toLowerCase();
    return searchText.includes(query.toLowerCase());
  });

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  const categoryLabels = {
    ai: 'AI Features',
    search: 'Search',
    navigation: 'Navigation',
    quick: 'Quick Actions'
  };

  // Voice search handler
  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert('Voice search is not supported in your browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      setIsListening(false);
    };

    recognition.start();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-32 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ zIndex: 10000 }}
      >
        <motion.div
          className="bg-surface-container rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
          initial={{ scale: 0.95, y: -20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: -20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-onsurface-secondary flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Ask anything or search..."
                className="flex-1 bg-transparent outline-none text-onsurface-primary placeholder-onsurface-secondary"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={startVoiceSearch}
                  className={`p-2 rounded-lg transition-colors ${
                    isListening 
                      ? 'bg-red-500 text-white' 
                      : 'hover:bg-surface-container-muted text-onsurface-secondary'
                  }`}
                  title="Voice search"
                >
                  <Mic className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-surface-container-muted text-onsurface-secondary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Commands List */}
          <div className="max-h-[400px] overflow-y-auto">
            {Object.entries(groupedCommands).map(([category, cmds]) => (
              <div key={category}>
                <div className="px-4 py-2 text-xs font-medium text-onsurface-secondary uppercase tracking-wider">
                  {categoryLabels[category as keyof typeof categoryLabels]}
                </div>
                <div className="pb-2">
                  {cmds.map((cmd, idx) => {
                    const globalIndex = filteredCommands.indexOf(cmd);
                    return (
                      <button
                        key={cmd.id}
                        onClick={cmd.action}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                          selectedIndex === globalIndex 
                            ? 'bg-primary/10 text-primary' 
                            : 'hover:bg-surface-container-muted text-onsurface-primary'
                        }`}
                      >
                        <div className={`${selectedIndex === globalIndex ? 'text-primary' : 'text-onsurface-secondary'}`}>
                          {cmd.icon}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-medium">{cmd.title}</div>
                          {cmd.description && (
                            <div className="text-sm text-onsurface-secondary">{cmd.description}</div>
                          )}
                        </div>
                        {selectedIndex === globalIndex && (
                          <div className="text-xs text-onsurface-secondary">Enter</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-border flex items-center justify-between text-xs text-onsurface-secondary">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-surface-container-muted rounded">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-surface-container-muted rounded">Enter</kbd>
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-surface-container-muted rounded">Esc</kbd>
                Close
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              AI Powered
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}