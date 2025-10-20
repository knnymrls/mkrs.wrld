'use client';

import React from 'react';
import LazyImage from '../../ui/LazyImage';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  id: string;
  updated_at: string;
  last_message?: {
    content: string;
    created_at: string;
  };
  participants: Array<{
    id: string;
    name: string;
    avatar_url: string | null;
  }>;
  unread_count: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  loading
}: ConversationListProps) {
  if (loading) {
    return (
      <div className="p-4">
        <p className="text-onsurface-secondary text-sm">Loading conversations...</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-4">
        <p className="text-onsurface-secondary text-sm">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto">
      {conversations.map((conversation) => {
        const otherUser = conversation.participants[0];
        const isSelected = conversation.id === selectedId;

        return (
          <button
            key={conversation.id}
            onClick={() => onSelect(conversation.id)}
            className={`w-full p-4 flex items-start gap-3 hover:bg-border transition-colors border-b border-border ${
              isSelected ? 'bg-border' : ''
            }`}
          >
            {/* Avatar */}
            <div className="w-12 h-12 bg-avatar-bg rounded-full overflow-hidden flex-shrink-0">
              {otherUser?.avatar_url ? (
                <LazyImage
                  src={otherUser.avatar_url}
                  alt={otherUser.name}
                  className="w-full h-full object-cover"
                  placeholder="blur"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-onsurface-secondary font-medium">
                  {otherUser?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-onsurface-primary truncate">
                  {otherUser?.name || 'Unknown User'}
                </p>
                {conversation.last_message && (
                  <p className="text-xs text-onsurface-secondary flex-shrink-0 ml-2">
                    {formatDistanceToNow(new Date(conversation.last_message.created_at), {
                      addSuffix: false
                    })}
                  </p>
                )}
              </div>
              {conversation.last_message && (
                <p className="text-sm text-onsurface-secondary truncate">
                  {conversation.last_message.content}
                </p>
              )}
              {conversation.unread_count > 0 && (
                <div className="mt-1">
                  <span className="inline-block bg-onsurface-primary text-surface-container text-xs px-2 py-0.5 rounded-full">
                    {conversation.unread_count}
                  </span>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
