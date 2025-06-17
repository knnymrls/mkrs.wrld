'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
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

    // Load messages from localStorage on mount
    useEffect(() => {
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
    }, [sessionId]);

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
        const pendingMessageKey = `pending-message-${sessionId}`;
        const pendingMessageStr = localStorage.getItem(pendingMessageKey);

        if (pendingMessageStr && messages.length === 0) {
            try {
                const pendingMessage = JSON.parse(pendingMessageStr);
                localStorage.removeItem(pendingMessageKey);

                // Add user message and start API call
                const userMessage: ChatMessage = {
                    role: 'user',
                    text: pendingMessage.text,
                    mentions: pendingMessage.mentions || []
                };

                setMessages([userMessage]);
                sendMessage(pendingMessage.text, pendingMessage.mentions || []);
            } catch (error) {
                console.error('Error processing pending message:', error);
            }
        }
    }, [sessionId]);

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
                        className="text-blue-600 dark:text-blue-400 font-medium"
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

        // Add status message
        const statusMessageId = Date.now();
        setMessages((msgs) => [...msgs, {
            role: 'bot',
            text: '🔍 Analyzing your query...',
            id: statusMessageId,
            isStatus: true
        }]);

        // Animated loading
        let dotCount = 0;
        const loadingMessages = [
            '🔍 Analyzing your query',
            '📊 Searching across profiles, posts, and projects',
            '🕸️ Exploring connections and relationships',
            '🎯 Finding the most relevant information'
        ];
        let currentMessageIndex = 0;

        const updateLoadingMessage = () => {
            const dots = '.'.repeat(dotCount);
            const currentMessage = loadingMessages[currentMessageIndex];

            setMessages((msgs) =>
                msgs.map(msg =>
                    msg.id === statusMessageId && msg.isStatus
                        ? { ...msg, text: `${currentMessage}${dots}` }
                        : msg
                )
            );

            dotCount = (dotCount + 1) % 4;
        };

        const dotInterval = setInterval(updateLoadingMessage, 400);

        const messageInterval = setInterval(() => {
            if (currentMessageIndex < loadingMessages.length - 1) {
                currentMessageIndex++;
                dotCount = 0;
            }
        }, 2000);

        try {
            if (!user?.id) {
                throw new Error('User not authenticated');
            }

            const res = await fetch('/api/chat', {
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

            const data = await res.json();

            clearInterval(dotInterval);
            clearInterval(messageInterval);

            if (!res.ok || data.error) {
                throw new Error(data.error || `Server error: ${res.status}`);
            }

            // Debug: Log the response to see if it contains markdown
            console.log('API Response:', data.answer);

            setMessages((msgs) =>
                msgs.map(msg =>
                    msg.id === statusMessageId
                        ? { ...msg, text: data.answer, isStatus: false, sources: data.sources }
                        : msg
                )
            );
        } catch (err) {
            clearInterval(dotInterval);
            clearInterval(messageInterval);

            console.error('Chat error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Could not get response.';

            setMessages((msgs) =>
                msgs.map(msg =>
                    msg.id === statusMessageId
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
            <div className="h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-white dark:bg-gray-900 relative">
            {/* Messages area - scrollable with padding at bottom for input */}
            <div className="h-full overflow-y-auto pb-32">
                <div className="max-w-4xl mx-auto px-4 py-8">
                    {messages.map((msg, idx) => (
                        <div
                            key={msg.id || idx}
                            className={`mb-6 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
                        >
                            <div className={`inline-block max-w-[80%] ${msg.role === 'user' ? 'ml-auto' : ''}`}>
                                {/* Message content */}
                                {msg.role === 'user' ? (
                                    <div className="rounded-lg px-4 py-3 bg-primary/10 dark:bg-blue-900/20 text-gray-900 dark:text-white">
                                        <p className="whitespace-pre-wrap">
                                            {msg.mentions ? renderMessageWithMentions(msg.text, msg.mentions) : msg.text}
                                        </p>
                                    </div>
                                ) : (
                                    <div className={msg.isStatus ? styles.shimmer : ''}>
                                        {msg.isStatus ? (
                                            <p className={`italic ${styles.loadingDots}`}>{msg.text}</p>
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

            {/* Fixed floating input at bottom */}
            <div className="absolute bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md  border-gray-200 dark:border-gray-700">
                <div className="max-w-4xl mx-auto px-4 mb-4">
                    <ChatInput
                        value={input}
                        onChange={setInput}
                        onMentionsChange={setTrackedMentions}
                        onSubmit={handleSubmit}
                        placeholder="Ask anything..."
                        userId={user?.id}
                        disabled={loading}
                        loading={loading}
                    />
                </div>
            </div>
        </div>
    );
}