'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import LazyImage from '../../ui/LazyImage';

interface User {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated: (conversationId: string) => void;
}

export default function NewConversationModal({
  isOpen,
  onClose,
  onConversationCreated
}: NewConversationModalProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !user) return;

    const fetchUsers = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .neq('id', user.id)
        .ilike('name', `%${searchQuery}%`)
        .limit(20);

      if (data) {
        setUsers(data);
      }
      setLoading(false);
    };

    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [isOpen, user, searchQuery]);

  const handleSelectUser = async (selectedUser: User) => {
    if (!user) return;

    try {
      // Check if conversation already exists
      const { data: existingConvs } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (existingConvs) {
        for (const conv of existingConvs) {
          const { data: otherParticipants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conv.conversation_id)
            .neq('user_id', user.id);

          if (
            otherParticipants &&
            otherParticipants.length === 1 &&
            otherParticipants[0].user_id === selectedUser.id
          ) {
            // Conversation already exists
            onConversationCreated(conv.conversation_id);
            onClose();
            return;
          }
        }
      }

      // Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single();

      console.log('Create conversation result:', { newConv, convError });

      if (convError) {
        console.error('Conversation creation error:', convError);
        throw new Error(`Failed to create conversation: ${convError.message || JSON.stringify(convError)}`);
      }

      if (!newConv) {
        throw new Error('No conversation returned from insert');
      }

      // Add participants
      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConv.id, user_id: user.id },
          { conversation_id: newConv.id, user_id: selectedUser.id }
        ]);

      console.log('Add participants result:', { participantsError });

      if (participantsError) {
        console.error('Participants error:', participantsError);
        throw new Error(`Failed to add participants: ${participantsError.message || JSON.stringify(participantsError)}`);
      }

      await onConversationCreated(newConv.id);
      onClose();
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert(`Failed to create conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/35 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-[15px] w-full max-w-md flex flex-col p-6 gap-4"
        style={{ zIndex: 10000 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-onsurface-primary">New Message</h2>
          <button
            onClick={onClose}
            className="w-4 h-4 flex items-center justify-center text-onsurface-secondary hover:text-onsurface-primary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <input
          type="text"
          placeholder="Search for a user..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 bg-surface-container border border-border rounded-lg text-sm text-onsurface-primary placeholder:text-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-onsurface-primary"
          autoFocus
        />

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-onsurface-secondary text-center py-4">Loading...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-onsurface-secondary text-center py-4">
              {searchQuery ? 'No users found' : 'Start typing to search'}
            </p>
          ) : (
            <div className="space-y-1">
              {users.map((usr) => (
                <button
                  key={usr.id}
                  onClick={() => handleSelectUser(usr)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-border rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 bg-avatar-bg rounded-full overflow-hidden flex-shrink-0">
                    {usr.avatar_url ? (
                      <LazyImage
                        src={usr.avatar_url}
                        alt={usr.name}
                        className="w-full h-full object-cover"
                        placeholder="blur"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-onsurface-secondary font-medium">
                        {usr.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-onsurface-primary">{usr.name}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
