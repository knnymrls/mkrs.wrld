'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../context/AuthContext';

interface ChatSession {
    sessionId: string;
    firstMessage: string;
    lastMessage: string;
    messageCount: number;
    createdAt: string;
    updatedAt: string;
}

export default function ChatHistory() {
    const router = useRouter();
    const { user, session } = useAuth();
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.id) {
            loadChatSessions();
        }
    }, [user]);

    const loadChatSessions = async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`/api/chat/sessions?userId=${user.id}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token || ''}`
                }
            });

            if (!res.ok) {
                throw new Error('Failed to fetch sessions');
            }

            const data = await res.json();
            
            // The existing API returns { sessions: [...] }
            const sessionsData = data.sessions || [];
            
            // Transform the sessions to match our expected format
            const transformedSessions = sessionsData.map((session: any) => {
                return {
                    sessionId: session.id,
                    firstMessage: session.title || `Chat Session`,
                    lastMessage: '',
                    messageCount: 0,
                    createdAt: session.created_at,
                    updatedAt: session.updated_at
                };
            });
            
            setSessions(transformedSessions);
        } catch (error) {
            // Fallback to localStorage if database fails
            loadLocalSessions();
        } finally {
            setLoading(false);
        }
    };

    const loadLocalSessions = () => {
        try {
            const allSessions: ChatSession[] = [];

            // Iterate through all localStorage keys
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('chat-')) {
                    const sessionId = key.replace('chat-', '');
                    const messagesStr = localStorage.getItem(key);

                    if (messagesStr) {
                        try {
                            const messages = JSON.parse(messagesStr);
                            if (messages.length > 0) {
                                const userMessages = messages.filter((m: any) => m.role === 'user');
                                const firstUserMessage = userMessages[0];
                                const lastUserMessage = userMessages[userMessages.length - 1];

                                if (firstUserMessage) {
                                    allSessions.push({
                                        sessionId,
                                        firstMessage: firstUserMessage.text,
                                        lastMessage: lastUserMessage?.text || firstUserMessage.text,
                                        messageCount: messages.length,
                                        createdAt: messages[0].id ? new Date(messages[0].id).toISOString() : new Date().toISOString(),
                                        updatedAt: messages[messages.length - 1].id ? new Date(messages[messages.length - 1].id).toISOString() : new Date().toISOString()
                                    });
                                }
                            }
                        } catch (error) {
                            // Skip invalid sessions
                        }
                    }
                }
            }

            // Sort by most recent first
            allSessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            setSessions(allSessions);
        } catch (error) {
            // Ignore errors
        }
    };

    const handleSessionClick = (sessionId: string) => {
        router.push(`/chatbot/${sessionId}`);
    };

    const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        
        try {
            if (user?.id) {
                // Try to delete from database first
                const res = await fetch(`/api/chat/sessions?sessionId=${sessionId}&userId=${user.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token || ''}`
                    }
                });

                if (!res.ok) {
                    const error = await res.text();
                }
            }
        } catch (error) {
            // Ignore deletion errors
        }

        // Always remove from localStorage
        localStorage.removeItem(`chat-${sessionId}`);
        loadChatSessions();
    };

    if (loading) {
        return (
            <div className="mt-12">
                <div className="space-y-1">
                    {[1, 2].map((i) => (
                        <div key={i} className="animate-pulse py-3">
                            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (sessions.length === 0) {
        return null;
    }

    return (
        <div className="mt-12">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {sessions.map((session, index) => (
                    <div
                        key={`session-${session.sessionId}-${index}`}
                        className="py-3 group"
                    >
                        <div className="flex justify-between items-start gap-3">
                            <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => handleSessionClick(session.sessionId)}
                            >
                                <p className="text-base font-medium text-gray-900 dark:text-white">
                                    {session.firstMessage || 'Chat Session'}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    {session.messageCount > 0 
                                        ? `${session.messageCount} messages` 
                                        : formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })
                                    }
                                </p>
                            </div>
                            <button
                                onClick={(e) => handleDeleteSession(e, session.sessionId)}
                                className="p-2 text-gray-400 cursor-pointer hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Delete chat"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}