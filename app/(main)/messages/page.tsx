'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import ConversationList from '../../components/features/messaging/ConversationList';
import MessageThread from '../../components/features/messaging/MessageThread';
import NewConversationModal from '../../components/features/messaging/NewConversationModal';

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

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewConversationModalOpen, setIsNewConversationModalOpen] = useState(false);

  const fetchConversations = async () => {
    if (!user) return;

    console.log('Fetching conversations for user:', user.id);

    // Get all conversations the user is part of
    const { data: participantData, error: participantError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', user.id);

    console.log('Participant data:', participantData, 'Error:', participantError);

    if (!participantData || participantData.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // For each conversation, get details
    const conversationsWithParticipants = await Promise.all(
      participantData.map(async (item: any) => {
        const convId = item.conversation_id;

        // Get conversation details
        const { data: convData } = await supabase
          .from('conversations')
          .select('id, updated_at')
          .eq('id', convId)
          .single();

        // Get other participants
        const { data: otherParticipants } = await supabase
          .from('conversation_participants')
          .select(`
            profiles!inner (
              id,
              name,
              avatar_url
            )
          `)
          .eq('conversation_id', convId)
          .neq('user_id', user.id);

        // Get last message
        const { data: lastMessageData } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: false })
          .limit(1);

        // Get unread count (only messages from other users)
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', convId)
          .neq('sender_id', user.id)
          .gt('created_at', item.last_read_at || '1970-01-01');

        const lastMessage = lastMessageData?.[0];

        return {
          id: convId,
          updated_at: convData?.updated_at || new Date().toISOString(),
          last_message: lastMessage ? {
            content: lastMessage.content,
            created_at: lastMessage.created_at
          } : undefined,
          participants: otherParticipants?.map((p: any) => p.profiles) || [],
          unread_count: unreadCount || 0
        };
      })
    );

    // Sort by updated_at
    conversationsWithParticipants.sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    console.log('Final conversations:', conversationsWithParticipants);

    setConversations(conversationsWithParticipants);
    setLoading(false);
  };

  useEffect(() => {
    fetchConversations();
  }, [user]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    console.log('Setting up real-time subscriptions for user:', user.id);

    // Subscribe to new conversations
    const conversationChannel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Conversation participant change:', payload);
          fetchConversations();
        }
      )
      .subscribe();

    // Subscribe to new messages (to update last message in list)
    const messagesChannel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('New message:', payload);
          // Refresh conversations to update last message
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscriptions');
      supabase.removeChannel(conversationChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [user]);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  return (
    <div className="flex h-full bg-background">
      {/* Conversations List */}
      <div className="w-80 border-r border-border bg-surface flex-shrink-0">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h1 className="text-xl font-medium text-onsurface-primary">Messages</h1>
          <button
            onClick={() => setIsNewConversationModalOpen(true)}
            className="p-2 hover:bg-border rounded-lg transition-colors"
            title="New message"
          >
            <svg className="w-5 h-5 text-onsurface-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <ConversationList
          conversations={conversations}
          selectedId={selectedConversationId}
          onSelect={setSelectedConversationId}
          loading={loading}
        />
      </div>

      {/* Message Thread */}
      <div className="flex-1">
        {selectedConversation ? (
          <MessageThread
            conversationId={selectedConversation.id}
            participants={selectedConversation.participants}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-onsurface-secondary">Select a conversation to start messaging</p>
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      <NewConversationModal
        isOpen={isNewConversationModalOpen}
        onClose={() => setIsNewConversationModalOpen(false)}
        onConversationCreated={async (id) => {
          setSelectedConversationId(id);
          await fetchConversations();
        }}
      />
    </div>
  );
}
