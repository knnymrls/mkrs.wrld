'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import ChatInput from '../../../components/features/ChatInput';
import { TrackedMention } from '../../../types/mention';
import SourceCard from '../../../components/ui/SourceCard';
import styles from '../../chatbot/loading.module.css';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
    role: 'user' | 'bot';
    text: string;
    mentions?: TrackedMention[];
    id?: number;
    isStatus?: boolean;
    sources?: any[];
}

export default function ChatSessionPage() {
    const params = useParams();
    const sessionId = params.sessionId as string;
    const { user, session } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [trackedMentions, setTrackedMentions] = useState<TrackedMention[]>([]);
    const [initialLoad, setInitialLoad] = useState(true);
    const [sessionCreated, setSessionCreated] = useState(false);
    const pendingMessageProcessed = useRef(false);

    // Load messages from database or localStorage on mount
    useEffect(() => {
        const loadMessages = async () => {
            // First try to load from database
            if (user?.id) {
                try {
                    const res = await fetch(`/api/chat/sessions?userId=${user.id}&sessionId=${sessionId}`, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session?.access_token || ''}`
                        }
                    });

                    if (res.ok) {
                        const data = await res.json();
                        if (data.session && data.session.messages) {
                            // Transform database messages to our format
                            const dbMessages = data.session.messages.map((msg: any) => ({
                                role: msg.role === 'assistant' ? 'bot' : msg.role,
                                text: msg.content,
                                mentions: msg.metadata?.mentions || [],
                                sources: msg.metadata?.sources || []
                            }));

                            if (dbMessages.length > 0) {
                                setMessages(dbMessages);
                                setSessionCreated(true); // Mark session as already created
                                setInitialLoad(false);
                                return;
                            }
                        }
                    } else {
                    }
                } catch (error) {
                    console.error('Error loading messages from database:', error);
                }
            }

            // Fallback to localStorage
            const savedMessages = localStorage.getItem(`chat-${sessionId}`);
            if (savedMessages) {
                try {
                    const parsed = JSON.parse(savedMessages);
                    const filteredMessages = parsed.filter((msg: ChatMessage) => !msg.isStatus);
                    setMessages(filteredMessages);
                } catch (error) {
                    console.error('Error loading saved messages:', error);
                }
            }
            setInitialLoad(false);
        };

        loadMessages();
    }, [sessionId, user?.id, session?.access_token]);

    // Save messages to localStorage whenever they change
    useEffect(() => {
        if (messages.length > 0 && !initialLoad) {
            const messagesToSave = messages.filter(msg => !msg.isStatus);
            if (messagesToSave.length > 0) {
                localStorage.setItem(`chat-${sessionId}`, JSON.stringify(messagesToSave));
            }
        }
    }, [messages, sessionId, initialLoad]);

    // Check for pending message and auto-send on mount
    useEffect(() => {
        // Only process if we have user and session loaded and haven't processed yet
        if (!user?.id || !session?.access_token || pendingMessageProcessed.current) return;

        const pendingMessageKey = `pending-message-${sessionId}`;
        const pendingMessageStr = localStorage.getItem(pendingMessageKey);

        if (pendingMessageStr && messages.length === 0) {
            try {
                const pendingMessage = JSON.parse(pendingMessageStr);
                localStorage.removeItem(pendingMessageKey);
                pendingMessageProcessed.current = true;

                // Add user message
                const userMessage: ChatMessage = {
                    role: 'user',
                    text: pendingMessage.text,
                    mentions: pendingMessage.mentions || []
                };

                setMessages([userMessage]);

                // Use a timeout to ensure UI updates
                setTimeout(() => {
                    // Pass the message text and mentions directly to sendMessage
                    sendMessage(pendingMessage.text, pendingMessage.mentions || []);
                }, 500);
            } catch (error) {
                console.error('Error processing pending message:', error);
            }
        }
    }, [sessionId, user?.id, session?.access_token, messages.length]);


    const renderMessageWithMentions = (text: string, mentions: TrackedMention[]) => {
        if (!mentions || mentions.length === 0) {
            return text;
        }

        try {
            let content = text;
            const elements: React.ReactElement[] = [];
            let lastIndex = 0;

            const sortedMentions = [...mentions].sort((a, b) => a.start - b.start);

            sortedMentions.forEach((mention, idx) => {
                if (mention.start < 0 || mention.end > content.length || mention.start >= mention.end) {
                    console.warn('Invalid mention position:', mention);
                    return;
                }

                if (mention.start > lastIndex) {
                    elements.push(
                        <span key={`text-${idx}`}>{content.substring(lastIndex, mention.start)}</span>
                    );
                }

                elements.push(
                    <span
                        key={`mention-${idx}`}
                        className="text-primary font-medium"
                    >
                        {mention.name}
                    </span>
                );

                lastIndex = mention.end;
            });

            if (lastIndex < content.length) {
                elements.push(
                    <span key={`text-end`}>{content.substring(lastIndex)}</span>
                );
            }

            return elements.length > 0 ? elements : content;
        } catch (error) {
            console.error('Error rendering mentions:', error);
            return text;
        }
    };

    const sendMessage = async (messageText?: string, mentions?: TrackedMention[]) => {
        const textToSend = messageText || input;
        const mentionsToSend = mentions || trackedMentions;

        if (!textToSend.trim() || !sessionId) return;

        // Add user message if not already added
        if (!messageText) {
            setMessages((msgs) => [...msgs, { role: 'user', text: textToSend, mentions: mentionsToSend }]);
        }

        setLoading(true);
        if (!messageText) {
            setInput('');
            setTrackedMentions([]);
        }

        // Add bot message that will be updated with streaming content
        const botMessageId = Date.now();
        setMessages((msgs) => [...msgs, {
            role: 'bot',
            text: '',
            id: botMessageId,
            isStatus: false
        }]);

        try {
            if (!user?.id) {
                throw new Error('User not authenticated');
            }

            const response = await fetch('/api/chat/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token || ''}`
                },
                body: JSON.stringify({
                    message: textToSend,
                    sessionId,
                    mentions: mentionsToSend,
                    userId: user.id
                }),
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error('No response body');
            }

            let accumulatedText = '';
            let sources: any[] = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data.trim()) {
                            try {
                                const parsed = JSON.parse(data);

                                if (parsed.error) {
                                    throw new Error(parsed.error);
                                }

                                if (parsed.type === 'status') {
                                    // Update with status message
                                    setMessages((msgs) =>
                                        msgs.map(msg =>
                                            msg.id === botMessageId
                                                ? { ...msg, text: parsed.message, isStatus: true }
                                                : msg
                                        )
                                    );
                                } else if (parsed.type === 'token') {
                                    // Append token to accumulated text
                                    accumulatedText += parsed.content;
                                    setMessages((msgs) =>
                                        msgs.map(msg =>
                                            msg.id === botMessageId
                                                ? { ...msg, text: accumulatedText, isStatus: false }
                                                : msg
                                        )
                                    );
                                } else if (parsed.type === 'sources') {
                                    sources = parsed.sources;
                                } else if (parsed.type === 'done') {
                                    // Update with final sources
                                    setMessages((msgs) =>
                                        msgs.map(msg =>
                                            msg.id === botMessageId
                                                ? { ...msg, sources }
                                                : msg
                                        )
                                    );
                                }
                            } catch (e) {
                                console.error('Error parsing SSE data:', e);
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Chat error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Could not get response.';

            setMessages((msgs) =>
                msgs.map(msg =>
                    msg.id === botMessageId
                        ? { ...msg, text: `Error: ${errorMessage}`, isStatus: false }
                        : msg
                )
            );
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = () => {
        sendMessage();
    };

    if (initialLoad) {
        return (
            <div className="h-screen bg-background flex items-center justify-center">
                <div className="animate-pulse">
                    <div className="h-8 bg-surface-container-muted rounded w-48"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-background flex flex-col">
            {/* Messages area - scrollable with padding at bottom for input */}
            <div className="flex-1 overflow-y-auto pb-24 md:pb-28">
                <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
                    {messages.map((msg, idx) => (
                        <div
                            key={msg.id || idx}
                            className={`mb-6 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
                        >
                            <div className={`inline-block max-w-[80%] ${msg.role === 'user' ? 'ml-auto' : ''}`}>
                                {/* Message content */}
                                {msg.role === 'user' ? (
                                    <div className="rounded-lg px-4 py-3 bg-primary/5 text-onsurface-primary">
                                        <p className="whitespace-pre-wrap">
                                            {msg.mentions ? renderMessageWithMentions(msg.text, msg.mentions) : msg.text}
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        {msg.isStatus ? (
                                            <p className={`italic text-onsurface-secondary ${styles.loadingDots}`}>{msg.text}</p>
                                        ) : (
                                            <div className="prose dark:prose-invert max-w-none">
                                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                                            </div>
                                        )}

                                        {/* Sources */}
                                        {msg.sources && msg.sources.length > 0 && (
                                            <div className="mt-3 flex gap-2 flex-wrap">
                                                {msg.sources.map((source, idx) => (
                                                    <SourceCard key={idx} source={source} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Fixed input at bottom - accounts for mobile bottom nav */}
            <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm pb-16 md:pb-0">
                <div className="max-w-4xl mx-auto px-4 pb-4 md:pb-6">
                    <ChatInput
                        value={input}
                        onChange={setInput}
                        onMentionsChange={setTrackedMentions}
                        onSubmit={handleSubmit}
                        placeholder="Ask anything..."
                        userId={user?.id}
                        disabled={loading}
                        loading={loading}
                        allowProjectCreation={false}
                    />
                </div>
            </div>
        </div>
    );
}