'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, X, Clock, Filter, Users, Briefcase, Calendar } from 'lucide-react';

interface GraphQueryBarProps {
  onQuery: (query: string, filters?: QueryFilters) => void;
  placeholder?: string;
}

interface QueryFilters {
  timeRange?: string;
  nodeTypes?: string[];
  departments?: string[];
  skills?: string[];
}

const quickFilters = [
  { icon: Clock, label: 'Last 30 days', filter: { timeRange: '30d' } },
  { icon: Users, label: 'People only', filter: { nodeTypes: ['profile'] } },
  { icon: Briefcase, label: 'Active projects', filter: { nodeTypes: ['project'] } },
  { icon: Calendar, label: 'This week', filter: { timeRange: '7d' } },
];

const exampleQueries = [
  "Show me Python experts who've worked on ML",
  "Find people connecting frontend and backend teams",
  "What skills are trending this month?",
  "Who bridges the data science and engineering teams?",
  "Show collaboration patterns in the last quarter"
];

export default function GraphQueryBar({ onQuery, placeholder = "Ask anything about your organization's knowledge network..." }: GraphQueryBarProps) {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [activeFilters, setActiveFilters] = useState<QueryFilters>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() || Object.keys(activeFilters).length > 0) {
      onQuery(query, activeFilters);
      setShowExamples(false);
    }
  };

  const applyQuickFilter = (filter: QueryFilters) => {
    setActiveFilters({ ...activeFilters, ...filter });
    // Auto-submit if there's a query
    if (query.trim()) {
      onQuery(query, { ...activeFilters, ...filter });
    }
  };

  const clearFilters = () => {
    setActiveFilters({});
    if (query.trim()) {
      onQuery(query, {});
    }
  };

  const activeFilterCount = Object.keys(activeFilters).length;

  return (
    <div className="relative w-full max-w-2xl">
      <motion.form
        onSubmit={handleSubmit}
        className={`relative transition-all duration-300 ${
          isExpanded ? 'w-full' : 'w-full'
        }`}
      >
        <div className="relative">
          {/* Sparkle decoration */}
          <div className="absolute -top-6 left-4 pointer-events-none">
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Sparkles className="w-4 h-4 text-purple-500" />
            </motion.div>
          </div>

          {/* Main input */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors group-focus-within:text-purple-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                setIsExpanded(true);
                setShowExamples(true);
              }}
              placeholder={placeholder}
              className="w-full pl-12 pr-12 py-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900 dark:text-white placeholder-gray-400"
            />
            
            {/* Clear button */}
            {(query || activeFilterCount > 0) && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  clearFilters();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}

            {/* Active filter indicator */}
            {activeFilterCount > 0 && (
              <div className="absolute -top-2 -right-2">
                <div className="bg-purple-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </div>
              </div>
            )}
          </div>

          {/* Quick filters */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 mt-3"
              >
                <Filter className="w-4 h-4 text-gray-400" />
                <div className="flex gap-2 flex-wrap">
                  {quickFilters.map((filter, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applyQuickFilter(filter.filter)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        JSON.stringify(activeFilters).includes(JSON.stringify(filter.filter))
                          ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <filter.icon className="w-3 h-3" />
                      {filter.label}
                    </button>
                  ))}
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="px-3 py-1.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.form>

      {/* Example queries dropdown */}
      <AnimatePresence>
        {showExamples && isExpanded && !query && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
          >
            <div className="p-3">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Try these example queries
              </div>
              <div className="space-y-1">
                {exampleQueries.map((example, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setQuery(example);
                      setShowExamples(false);
                      onQuery(example, activeFilters);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm text-gray-700 dark:text-gray-300"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {isExpanded && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setIsExpanded(false);
            setShowExamples(false);
          }}
        />
      )}
    </div>
  );
}