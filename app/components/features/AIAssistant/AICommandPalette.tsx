'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Mic, X, Sparkles, ArrowRight, User, Briefcase, MessageSquare, Zap, Clock, Home, FolderOpen, Bell, PlusCircle, MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import FeedbackModal from '@/app/components/features/FeedbackModal';

interface AICommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: 'person' | 'project' | 'post';
  icon: React.ReactNode;
  action: () => void;
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
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showAIMode, setShowAIMode] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const router = useRouter();
  const { user } = useAuth();

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSearchResults([]);
      setShowAIMode(false);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Search functionality
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setSearchResults([]);
      setShowAIMode(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        // Search across people, projects, and recent posts
        const [peopleResults, projectResults, postResults] = await Promise.all([
          // Search people
          supabase
            .from('profiles')
            .select('id, name, title')
            .ilike('name', `%${query}%`)
            .limit(3),
          
          // Search projects
          supabase
            .from('projects')
            .select('id, title, description')
            .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
            .limit(3),
          
          // Search recent posts
          supabase
            .from('posts')
            .select('id, content, created_at, author:profiles!posts_author_id_fkey(name)')
            .ilike('content', `%${query}%`)
            .order('created_at', { ascending: false })
            .limit(3)
        ]);

        const results: SearchResult[] = [];

        // Add people results
        if (peopleResults.data) {
          peopleResults.data.forEach(person => {
            results.push({
              id: person.id,
              title: person.name,
              subtitle: person.title || 'Team member',
              type: 'person',
              icon: <User className="w-4 h-4" />,
              action: () => {
                router.push(`/profile/${person.id}`);
                onClose();
              }
            });
          });
        }

        // Add project results
        if (projectResults.data) {
          projectResults.data.forEach(project => {
            results.push({
              id: project.id,
              title: project.title,
              subtitle: project.description?.substring(0, 50) + '...' || 'Project',
              type: 'project',
              icon: <Briefcase className="w-4 h-4" />,
              action: () => {
                router.push(`/projects/${project.id}`);
                onClose();
              }
            });
          });
        }

        // Add post results
        if (postResults.data) {
          postResults.data.forEach(post => {
            results.push({
              id: post.id,
              title: post.content.substring(0, 60) + '...',
              subtitle: `by ${(post as any).author?.name || 'Unknown'}`,
              type: 'post',
              icon: <MessageSquare className="w-4 h-4" />,
              action: () => {
                router.push(`/?post=${post.id}`);
                onClose();
              }
            });
          });
        }

        // Score and sort search results intelligently
        const scoredResults = results.map(result => {
          const titleScore = scoreMatch(result.title, query) * 2;
          const subtitleScore = scoreMatch(result.subtitle || '', query);
          const totalScore = Math.max(titleScore, subtitleScore);
          
          // Boost score based on result type priority
          const typeBoost = result.type === 'person' ? 1.2 : result.type === 'project' ? 1.1 : 1.0;
          
          return { ...result, score: totalScore * typeBoost };
        }).sort((a, b) => b.score - a.score);

        setSearchResults(scoredResults);
        setShowAIMode(scoredResults.length === 0 && query.trim().length > 2 && filteredCommands.length === 0);
        setIsSearching(false);
      } catch (error) {
        console.error('Search error:', error);
        setIsSearching(false);
        setShowAIMode(true);
      }
    }, 300); // 300ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, router, onClose]);

  // Function to navigate to chatbot with query
  const navigateToChatbot = (questionText?: string) => {
    const sessionId = uuidv4();
    const textToUse = questionText || query;
    
    if (textToUse.trim()) {
      // Save the pending message to localStorage
      const pendingMessage = {
        text: textToUse,
        mentions: []
      };
      localStorage.setItem(`pending-message-${sessionId}`, JSON.stringify(pendingMessage));
    }
    
    // Navigate to chatbot session
    router.push(`/chatbot/${sessionId}`);
    onClose();
  };

  // AI Commands when no search results
  const aiCommands: Command[] = [
    {
      id: 'ask-ai',
      title: `Ask AI: "${query}"`,
      description: 'Get AI-powered answers about your organization',
      icon: <Sparkles className="w-4 h-4" />,
      action: () => navigateToChatbot(),
      category: 'ai'
    },
    {
      id: 'find-expert',
      title: `Find experts in "${query}"`,
      description: 'Discover people with this expertise',
      icon: <User className="w-4 h-4" />,
      action: () => navigateToChatbot(`Who knows about ${query}?`),
      category: 'ai'
    },
    {
      id: 'similar-work',
      title: `Find similar work on "${query}"`,
      description: 'Discover related projects and discussions',
      icon: <MessageSquare className="w-4 h-4" />,
      action: () => navigateToChatbot(`Show me work related to ${query}`),
      category: 'ai'
    }
  ];

  // Default commands
  const commands: Command[] = [
    // Quick navigation
    {
      id: 'nav-home',
      title: 'Home',
      icon: <Home className="w-4 h-4" />,
      action: () => {
        router.push('/');
        onClose();
      },
      category: 'navigation'
    },
    {
      id: 'nav-chatbot',
      title: 'AI Chat',
      icon: <MessageSquare className="w-4 h-4" />,
      action: () => {
        router.push('/chatbot');
        onClose();
      },
      category: 'navigation'
    },
    {
      id: 'nav-profile',
      title: 'Profile',
      icon: <User className="w-4 h-4" />,
      action: () => {
        router.push('/profile');
        onClose();
      },
      category: 'navigation'
    },
    {
      id: 'nav-projects',
      title: 'Projects',
      icon: <FolderOpen className="w-4 h-4" />,
      action: () => {
        router.push('/projects');
        onClose();
      },
      category: 'navigation'
    },
    {
      id: 'nav-notifications',
      title: 'Notifications',
      icon: <Bell className="w-4 h-4" />,
      action: () => {
        router.push('/notifications');
        onClose();
      },
      category: 'navigation'
    },
    // Quick actions
    {
      id: 'new-post',
      title: 'Create new post',
      description: 'Share your thoughts with the team',
      icon: <PlusCircle className="w-4 h-4" />,
      action: () => {
        router.push('/');
        onClose();
        // Trigger the post creation UI
        setTimeout(() => {
          const createPostButton = document.querySelector('[data-create-post-trigger]');
          if (createPostButton instanceof HTMLElement) {
            createPostButton.click();
          }
        }, 100);
      },
      category: 'quick'
    },
    {
      id: 'trending',
      title: "What's trending",
      description: 'See what people are talking about',
      icon: <Zap className="w-4 h-4" />,
      action: () => navigateToChatbot("What are the trending topics this week?"),
      category: 'quick'
    },
    {
      id: 'recent-activity',
      title: 'Recent activity',
      description: 'See latest posts and updates',
      icon: <Clock className="w-4 h-4" />,
      action: () => {
        router.push('/');
        onClose();
      },
      category: 'quick'
    },
    {
      id: 'send-feedback',
      title: 'Send feedback',
      description: 'Report bugs or suggest improvements',
      icon: <MessageCircle className="w-4 h-4" />,
      action: () => {
        setShowFeedback(true);
      },
      category: 'quick'
    }
  ];

  // Score function for intelligent ordering
  const scoreMatch = (text: string, searchQuery: string): number => {
    const lowerText = text.toLowerCase();
    const lowerQuery = searchQuery.toLowerCase();
    
    // Exact match gets highest score
    if (lowerText === lowerQuery) return 100;
    
    // Starts with query gets high score
    if (lowerText.startsWith(lowerQuery)) return 80;
    
    // Word boundary match (e.g., "create post" matches "post")
    const words = lowerText.split(/\s+/);
    if (words.some(word => word.startsWith(lowerQuery))) return 60;
    
    // Contains query gets medium score
    if (lowerText.includes(lowerQuery)) {
      // Earlier matches score higher
      const index = lowerText.indexOf(lowerQuery);
      return 40 - (index * 0.5);
    }
    
    return 0;
  };

  // Filter and score commands based on query
  const filteredCommands = commands
    .map(cmd => {
      if (!query) return { ...cmd, score: 0 };
      
      const titleScore = scoreMatch(cmd.title, query) * 2; // Title matches weighted higher
      const descScore = scoreMatch(cmd.description || '', query);
      const totalScore = Math.max(titleScore, descScore);
      
      return { ...cmd, score: totalScore };
    })
    .filter(cmd => !query || cmd.score > 0)
    .sort((a, b) => {
      // Sort by score (higher first), then by category priority
      if (b.score !== a.score) return b.score - a.score;
      
      // Category priority: quick > navigation > ai
      const categoryOrder = { quick: 0, navigation: 1, ai: 2, search: 3 };
      return (categoryOrder[a.category] || 99) - (categoryOrder[b.category] || 99);
    });

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Combine filtered commands and search results
      const commandItems = filteredCommands;
      const allItems = showAIMode 
        ? aiCommands 
        : [...commandItems, ...searchResults];

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % allItems.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + allItems.length) % allItems.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (showAIMode && selectedIndex === 0 && query.trim()) {
            // First AI option is always "Ask AI"
            navigateToChatbot();
          } else if (allItems[selectedIndex]) {
            allItems[selectedIndex].action();
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
  }, [isOpen, selectedIndex, onClose, searchResults, showAIMode, query, filteredCommands, aiCommands, navigateToChatbot]);

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
      {isOpen && (
        <motion.div
          key="ai-command-palette"
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

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto">
            {isSearching ? (
              <div className="px-4 py-8 text-center">
                <div className="animate-pulse">
                  <div className="h-4 bg-surface-container-muted rounded w-32 mx-auto mb-2"></div>
                  <div className="h-3 bg-surface-container-muted rounded w-24 mx-auto"></div>
                </div>
              </div>
            ) : (
              <>
                {/* Commands - Always show filtered commands */}
                {!showAIMode && filteredCommands.length > 0 && (
                  <>
                    {/* Navigation Commands */}
                    {filteredCommands.filter(cmd => cmd.category === 'navigation').length > 0 && (
                      <>
                        <div className="px-4 py-2 text-xs font-medium text-onsurface-secondary uppercase tracking-wider">
                          Quick Access
                        </div>
                        <div className="pb-2">
                          {filteredCommands.filter(cmd => cmd.category === 'navigation').map((cmd) => {
                            const cmdIndex = filteredCommands.indexOf(cmd);
                            return (
                              <button
                                key={cmd.id}
                                onClick={cmd.action}
                                onMouseEnter={() => setSelectedIndex(cmdIndex)}
                                className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                                  selectedIndex === cmdIndex 
                                    ? 'bg-primary/10 text-primary' 
                                    : 'hover:bg-surface-container-muted text-onsurface-primary'
                                }`}
                              >
                                <div className={`${selectedIndex === cmdIndex ? 'text-primary' : 'text-onsurface-secondary'}`}>
                                  {cmd.icon}
                                </div>
                                <div className="flex-1 text-left">
                                  <div className="font-medium">{cmd.title}</div>
                                  {cmd.description && (
                                    <div className="text-sm text-onsurface-secondary">{cmd.description}</div>
                                  )}
                                </div>
                                {selectedIndex === cmdIndex && (
                                  <div className="text-xs text-onsurface-secondary">Enter</div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                    
                    {/* Quick Actions */}
                    {filteredCommands.filter(cmd => cmd.category === 'quick').length > 0 && (
                      <>
                        <div className="px-4 py-2 text-xs font-medium text-onsurface-secondary uppercase tracking-wider">
                          Quick Actions
                        </div>
                        <div className="pb-2">
                          {filteredCommands.filter(cmd => cmd.category === 'quick').map((cmd) => {
                            const cmdIndex = filteredCommands.indexOf(cmd);
                            return (
                              <button
                                key={cmd.id}
                                onClick={cmd.action}
                                onMouseEnter={() => setSelectedIndex(cmdIndex)}
                                className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                                  selectedIndex === cmdIndex 
                                    ? 'bg-primary/10 text-primary' 
                                    : 'hover:bg-surface-container-muted text-onsurface-primary'
                                }`}
                              >
                                <div className={`${selectedIndex === cmdIndex ? 'text-primary' : 'text-onsurface-secondary'}`}>
                                  {cmd.icon}
                                </div>
                                <div className="flex-1 text-left">
                                  <div className="font-medium">{cmd.title}</div>
                                  {cmd.description && (
                                    <div className="text-sm text-onsurface-secondary">{cmd.description}</div>
                                  )}
                                </div>
                                {selectedIndex === cmdIndex && (
                                  <div className="text-xs text-onsurface-secondary">Enter</div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Search Results - Show after commands */}
                {searchResults.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-medium text-onsurface-secondary uppercase tracking-wider">
                      Search Results
                    </div>
                    <div className="pb-2">
                      {searchResults.map((result) => {
                        const resultIndex = filteredCommands.length + searchResults.indexOf(result);
                        return (
                          <button
                            key={result.id}
                            onClick={result.action}
                            onMouseEnter={() => setSelectedIndex(resultIndex)}
                            className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                              selectedIndex === resultIndex 
                                ? 'bg-primary/10 text-primary' 
                                : 'hover:bg-surface-container-muted text-onsurface-primary'
                            }`}
                          >
                            <div className={`${selectedIndex === resultIndex ? 'text-primary' : 'text-onsurface-secondary'}`}>
                              {result.icon}
                            </div>
                            <div className="flex-1 text-left">
                              <div className="font-medium">{result.title}</div>
                              {result.subtitle && (
                                <div className="text-sm text-onsurface-secondary">{result.subtitle}</div>
                              )}
                            </div>
                            {selectedIndex === resultIndex && (
                              <div className="text-xs text-onsurface-secondary">Enter</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* AI Mode - When no search results and no commands match */}
                {showAIMode && (
                  <div>
                    <div className="px-4 py-2 text-xs font-medium text-onsurface-secondary uppercase tracking-wider">
                      AI Suggestions
                    </div>
                    <div className="pb-2">
                      {aiCommands.map((cmd, idx) => (
                        <button
                          key={cmd.id}
                          onClick={cmd.action}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                            selectedIndex === idx 
                              ? 'bg-primary/10 text-primary' 
                              : 'hover:bg-surface-container-muted text-onsurface-primary'
                          }`}
                        >
                          <div className={`${selectedIndex === idx ? 'text-primary' : 'text-onsurface-secondary'}`}>
                            {cmd.icon}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-medium">{cmd.title}</div>
                            {cmd.description && (
                              <div className="text-sm text-onsurface-secondary">{cmd.description}</div>
                            )}
                          </div>
                          {selectedIndex === idx && (
                            <div className="text-xs text-onsurface-secondary">Enter</div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* No results message */}
                {query && filteredCommands.length === 0 && searchResults.length === 0 && !showAIMode && (
                  <div className="p-4 text-center text-sm text-onsurface-secondary">
                    No results found for "{query}"
                  </div>
                )}
              </>
            )}
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
              {showAIMode ? (
                <>
                  <Sparkles className="w-3 h-3" />
                  AI Mode
                </>
              ) : searchResults.length > 0 || filteredCommands.length > 0 ? (
                <>
                  <Search className="w-3 h-3" />
                  {filteredCommands.length + searchResults.length} results
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  Type to search
                </>
              )}
            </div>
          </div>
        </motion.div>
        </motion.div>
      )}
      
      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
      />
    </AnimatePresence>
  );
}