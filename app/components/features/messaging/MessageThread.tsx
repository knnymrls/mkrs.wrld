'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import MessageInput from './MessageInput';
import LazyImage from '../../ui/LazyImage';
import { format } from 'date-fns';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

interface MessageThreadProps {
  conversationId: string;
  participants: Array<{
    id: string;
    name: string;
    avatar_url: string | null;
  }>;
}

export default function MessageThread({ conversationId, participants }: MessageThreadProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{ id: string; name: string; avatar_url: string | null } | null>(null);
  const [otherUserLastRead, setOtherUserLastRead] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch user profile once
  useEffect(() => {
    if (!user) return;

    const fetchUserProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .eq('id', user.id)
        .single();

      if (data) {
        setUserProfile(data);
      }
    };

    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    if (!user || !conversationId) return;

    const fetchMessages = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          sender_id,
          created_at,
          profiles!sender_id (
            id,
            name,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (data) {
        setMessages(
          data.map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            sender_id: msg.sender_id,
            created_at: msg.created_at,
            sender: msg.profiles
          }))
        );
      }
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    };

    fetchMessages();

    // Mark messages as read and get other user's last read
    const markAsRead = async () => {
      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

      // Get other user's last read timestamp
      const otherUserId = participants[0]?.id;
      if (otherUserId) {
        const { data } = await supabase
          .from('conversation_participants')
          .select('last_read_at')
          .eq('conversation_id', conversationId)
          .eq('user_id', otherUserId)
          .single();

        if (data) {
          setOtherUserLastRead(data.last_read_at);
        }
      }
    };
    markAsRead();

    // Subscribe to other user's read status updates
    const otherUserId = participants[0]?.id;
    let readChannel: ReturnType<typeof supabase.channel> | undefined;
    if (otherUserId) {
      readChannel = supabase
        .channel(`read-status:${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'conversation_participants',
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload) => {
            const updated = payload.new as any;
            if (updated.user_id === otherUserId) {
              setOtherUserLastRead(updated.last_read_at);
            }
          }
        )
        .subscribe();
    }

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          const newMessage = payload.new as any;

          // Check if message already exists (avoid duplicates from optimistic updates)
          setMessages((prev) => {
            const exists = prev.some(m => m.id === newMessage.id);
            if (exists) return prev;

            // For messages from other users, fetch sender info
            if (newMessage.sender_id !== user?.id) {
              // Mark as read immediately since user is viewing the conversation
              supabase
                .from('conversation_participants')
                .update({ last_read_at: new Date().toISOString() })
                .eq('conversation_id', conversationId)
                .eq('user_id', user.id)
                .then();

              // Fetch sender info asynchronously
              supabase
                .from('profiles')
                .select('id, name, avatar_url')
                .eq('id', newMessage.sender_id)
                .single()
                .then(({ data: senderData }) => {
                  if (senderData) {
                    setMessages((prev) => {
                      // Double-check it doesn't exist
                      const stillDoesntExist = !prev.some(m => m.id === newMessage.id);
                      if (stillDoesntExist) {
                        return [
                          ...prev,
                          {
                            id: newMessage.id,
                            content: newMessage.content,
                            sender_id: newMessage.sender_id,
                            created_at: newMessage.created_at,
                            sender: senderData
                          }
                        ];
                      }
                      return prev;
                    });
                    setTimeout(scrollToBottom, 100);
                  }
                });
            }

            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (readChannel) {
        supabase.removeChannel(readChannel);
      }
    };
  }, [conversationId, user]);

  const handleSendMessage = async (content: string) => {
    if (!user || !content.trim() || !userProfile) return;

    // Optimistically add message to UI
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content: content.trim(),
      sender_id: user.id,
      created_at: new Date().toISOString(),
      sender: userProfile
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setTimeout(scrollToBottom, 100);

    // Send to database
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim()
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
    } else if (data) {
      // Replace optimistic message with real one
      setMessages(prev => prev.map(m => m.id === optimisticMessage.id ? {
        id: data.id,
        content: data.content,
        sender_id: data.sender_id,
        created_at: data.created_at,
        sender: userProfile
      } : m));
    }
  };

  const otherUser = participants[0];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-border bg-surface-container/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-avatar-bg rounded-full overflow-hidden flex-shrink-0 ring-2 ring-border/30">
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
          <h2 className="text-lg font-medium text-onsurface-primary">{otherUser?.name || 'Unknown User'}</h2>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-onsurface-secondary text-sm">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-5xl mb-3">💬</div>
              <p className="text-sm text-onsurface-secondary font-medium">No messages yet. Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender_id === user?.id;
            const isRead = isOwn && otherUserLastRead && new Date(message.created_at) <= new Date(otherUserLastRead);

            return (
              <div key={message.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
                <div className="w-8 h-8 bg-avatar-bg rounded-full overflow-hidden flex-shrink-0 ring-1 ring-border/30">
                  {message.sender.avatar_url ? (
                    <LazyImage
                      src={message.sender.avatar_url}
                      alt={message.sender.name}
                      className="w-full h-full object-cover"
                      placeholder="blur"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-onsurface-secondary text-xs font-medium">
                      {message.sender.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-md`}>
                  <div
                    className={`px-4 py-2.5 rounded-xl shadow-sm ${
                      isOwn
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-surface-container text-onsurface-primary border border-border'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                  </div>
                  <div className="flex items-center gap-1 mt-1.5">
                    <p className="text-xs text-onsurface-secondary">
                      {format(new Date(message.created_at), 'h:mm a')}
                    </p>
                    {isOwn && (
                      <span className="text-xs text-onsurface-secondary">
                        · {isRead ? 'Read' : 'Sent'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-surface-container/80 backdrop-blur-md">
        <MessageInput onSend={handleSendMessage} />
      </div>
    </div>
  );
}
