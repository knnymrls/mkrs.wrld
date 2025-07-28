'use client';

import React, { useState, useRef, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { Search, Check } from 'lucide-react';

// Popular icons for projects
const POPULAR_ICONS = [
  'Folder', 'FolderOpen', 'Briefcase', 'Package', 'Box', 'Archive',
  'Rocket', 'Zap', 'Target', 'Flag', 'Star', 'Heart',
  'Code', 'Terminal', 'Cpu', 'Server', 'Database', 'Cloud',
  'Globe', 'Smartphone', 'Monitor', 'Laptop', 'Tablet', 'Watch',
  'FileText', 'FileCode', 'Book', 'BookOpen', 'Newspaper', 'PenTool',
  'Palette', 'Brush', 'Image', 'Camera', 'Video', 'Music',
  'BarChart3', 'LineChart', 'PieChart', 'TrendingUp', 'Activity', 'Calculator',
  'Users', 'UserPlus', 'Building2', 'Home', 'Store', 'Factory',
  'Shield', 'Lock', 'Key', 'Eye', 'EyeOff', 'Fingerprint',
  'Brain', 'Lightbulb', 'Sparkles', 'Wand2', 'TestTube2', 'Microscope',
  'Webhook', 'GitBranch', 'GitMerge', 'GitPullRequest', 'Github', 'GitlabIcon',
  'MessageSquare', 'Mail', 'Send', 'Bell', 'BellRing', 'Megaphone',
  'Settings', 'Wrench', 'Hammer', 'Tool', 'Cog', 'SlidersHorizontal',
  'Calendar', 'Clock', 'Timer', 'Hourglass', 'History', 'RefreshCw',
  'DollarSign', 'CreditCard', 'Wallet', 'Receipt', 'ShoppingCart', 'Package2',
  'Plane', 'Car', 'Truck', 'Ship', 'Train', 'Bike',
  'Heart', 'HeartHandshake', 'Handshake', 'ThumbsUp', 'Award', 'Trophy',
  'Bug', 'BugOff', 'AlertCircle', 'AlertTriangle', 'CheckCircle', 'XCircle',
  'Play', 'Pause', 'Square', 'Circle', 'Triangle', 'Hexagon'
];

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  className?: string;
}

export default function IconPicker({ value, onChange, className = '' }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter icons based on search
  const filteredIcons = search
    ? POPULAR_ICONS.filter(name => 
        name.toLowerCase().includes(search.toLowerCase())
      )
    : POPULAR_ICONS;

  // Get the icon component
  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="w-5 h-5" /> : null;
  };

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-surface-container-muted transition-colors"
      >
        {getIcon(value)}
        <span className="text-sm">{value}</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-surface-container border border-border rounded-lg shadow-lg z-50">
          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-onsurface-secondary" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search icons..."
                className="w-full pl-10 pr-3 py-2 bg-surface-container-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </div>
          </div>

          {/* Icon Grid */}
          <div className="max-h-80 overflow-y-auto p-3">
            <div className="grid grid-cols-6 gap-1">
              {filteredIcons.map((iconName) => {
                const Icon = (LucideIcons as any)[iconName];
                if (!Icon) return null;

                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => {
                      onChange(iconName);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`p-2 rounded-lg hover:bg-surface-container-muted transition-colors relative group ${
                      value === iconName ? 'bg-primary/10 text-primary' : ''
                    }`}
                    title={iconName}
                  >
                    <Icon className="w-5 h-5" />
                    {value === iconName && (
                      <Check className="absolute top-0.5 right-0.5 w-3 h-3 text-primary" />
                    )}
                    <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                      {iconName}
                    </span>
                  </button>
                );
              })}
            </div>

            {filteredIcons.length === 0 && (
              <p className="text-center text-onsurface-secondary py-4">
                No icons found matching "{search}"
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}