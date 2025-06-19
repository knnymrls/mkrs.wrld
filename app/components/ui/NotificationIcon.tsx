'use client';

import React from 'react';

interface NotificationIconProps {
  hasUnread: boolean;
  count?: number;
  onClick: () => void;
}

export default function NotificationIcon({ hasUnread, count, onClick }: NotificationIconProps) {
  return (
    <button
      onClick={onClick}
      className="relative p-2 hover:bg-surface-container-muted rounded-full transition-colors"
      aria-label="Notifications"
    >
      {/* Bell icon */}
      <svg 
        className="w-6 h-6 text-onsurface-secondary" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
        />
      </svg>
      
      {/* Unread indicator */}
      {hasUnread && (
        <span className="absolute top-1 right-1 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
        </span>
      )}
      
      {/* Count badge */}
      {count && count > 0 && (
        <span className="absolute -top-1 -right-1 bg-primary text-white text-xs font-medium rounded-full h-5 w-5 flex items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}