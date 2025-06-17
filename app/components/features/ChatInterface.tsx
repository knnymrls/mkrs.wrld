'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ChatInput from './ChatInput';
import { TrackedMention } from '../../types/mention';
import SourceCard from '../ui/SourceCard';
import styles from '../../(main)/chatbot/loading.module.css';

export interface ChatMessage {
    role: 'user' | 'bot';
    text: string;
    mentions?: TrackedMention[];
    id?: number;
    isStatus?: boolean;
    sources?: any[];
}

interface ChatInterfaceProps {
    sessionId: string;
    initialMessages?: ChatMessage[];
    onFirstMessage?: () => void;
}

export default function ChatInterface({ sessionId, initialMessages = [], onFirstMessage }: ChatInterfaceProps) {
    const { user, session } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [trackedMentions, setTrackedMentions] = useState<TrackedMention[]>([]);

    // Save messages to localStorage whenever they change (excluding status messages)
    useEffect(() => {
        if (messages.length > 0) {
            // Only save non-status messages
            const messagesToSave = messages.filter(msg => !msg.isStatus);
            if (messagesToSave.length > 0) {
                localStorage.setItem(`chat-${sessionId}`, JSON.stringify(messagesToSave));
            }
        }
    }, [messages, sessionId]);

    // Set messages from initialMessages when they change
    useEffect(() => {
        if (initialMessages.length > 0) {
            setMessages(initialMessages);
        }
    }, [initialMessages]);

    // Check for pending message and auto-send on mount
    useEffect(() => {
        const pendingMessageKey = `pending-message-${sessionId}`;
        const pendingMessageStr = localStorage.getItem(pendingMessageKey);
        
        if (pendingMessageStr && messages.length === 0) {
            try {
                const pendingMessage = JSON.parse(pendingMessageStr);
                localStorage.removeItem(pendingMessageKey);
                
                // Directly add the user message and start the API call
                const userMessage = { 
                    role: 'user' as const, 
                    text: pendingMessage.text, 
                    mentions: pendingMessage.mentions || [] 
                };
                
                // Add user message
                setMessages([userMessage]);
                
                // Start loading
                setLoading(true);
                
                // Add status message
                const statusMessageId = Date.now();
                setMessages([userMessage, { 
                    role: 'bot', 
                    text: '🔍 Analyzing your query...', 
                    id: statusMessageId,
                    isStatus: true 
                }]);
                
                // Make the API call
                const sendAutoMessage = async () => {
                    // Animated loading with dots
                    let dotCount = 0;
                    const loadingMessages = [
                        '🔍 Analyzing your query',
                        '📊 Searching across profiles, posts, and projects',
                        '🕸️ Exploring connections and relationships',
                        '🎯 Finding the most relevant information'
                    ];
                    let currentMessageIndex = 0;
                    
                    // Function to update loading message
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
                    
                    // Start dot animation
                    const dotInterval = setInterval(updateLoadingMessage, 400);
                    
                    // Progress through different messages
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
                                message: pendingMessage.text,
                                sessionId,
                                mentions: pendingMessage.mentions || [],
                                userId: user.id
                            }),
                        });

                        const data = await res.json();
                        
                        // Clear intervals
                        clearInterval(dotInterval);
                        clearInterval(messageInterval);
                        
                        // Check if response is an error
                        if (!res.ok || data.error) {
                            throw new Error(data.error || `Server error: ${res.status}`);
                        }
                        
                        // Replace status message with actual response
                        setMessages((msgs) => 
                            msgs.map(msg => 
                                msg.id === statusMessageId 
                                    ? { ...msg, text: data.answer, isStatus: false, sources: data.sources }
                                    : msg
                            )
                        );
                    } catch (err) {
                        // Clear intervals on error too
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
                
                sendAutoMessage();
            } catch (error) {
                console.error('Error processing pending message:', error);
            }
        }
    }, [sessionId, user?.id, session?.access_token]); // Include necessary dependencies

    const renderMessageWithMentions = (text: string, mentions: TrackedMention[]) => {
        if (!mentions || mentions.length === 0) {
            return text;
        }

        try {
            let content = text;
            const elements: React.ReactElement[] = [];
            let lastIndex = 0;

            // Sort mentions by their position in the content
            const sortedMentions = [...mentions].sort((a, b) => a.start - b.start);

            sortedMentions.forEach((mention, idx) => {
                // Validate mention positions
                if (mention.start < 0 || mention.end > content.length || mention.start >= mention.end) {
                    console.warn('Invalid mention position:', mention);
                    return;
                }

                // Add text before mention
                if (mention.start > lastIndex) {
                    elements.push(
                        <span key={`text-${idx}`}>{content.substring(lastIndex, mention.start)}</span>
                    );
                }

                // Add mention as styled text (not link in chat)
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

            // Add remaining text
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

    const sendMessage = async () => {
        if (!input.trim() || !sessionId) return;

        const isFirstMessage = messages.length === 0;

        // If this is the first message and we have a redirect callback, save the message and redirect
        if (isFirstMessage && onFirstMessage) {
            // Save the pending message to localStorage so the session page can send it
            const pendingMessage = {
                text: input,
                mentions: trackedMentions
            };
            localStorage.setItem(`pending-message-${sessionId}`, JSON.stringify(pendingMessage));
            
            // Clear input and redirect
            setInput('');
            setTrackedMentions([]);
            onFirstMessage();
            return;
        }

        // Normal message sending flow
        setMessages((msgs) => [...msgs, { role: 'user', text: input, mentions: trackedMentions }]);
        setLoading(true);
        const currentInput = input;
        const currentMentions = [...trackedMentions];
        setInput('');
        setTrackedMentions([]);

        // Add a status message that we'll update
        const statusMessageId = Date.now();
        setMessages((msgs) => [...msgs, { 
            role: 'bot', 
            text: '🔍 Analyzing your query...', 
            id: statusMessageId,
            isStatus: true 
        }]);

        // Animated loading with dots
        let dotCount = 0;
        const loadingMessages = [
            '🔍 Analyzing your query',
            '📊 Searching across profiles, posts, and projects',
            '🕸️ Exploring connections and relationships',
            '🎯 Finding the most relevant information'
        ];
        let currentMessageIndex = 0;
        let dotInterval: NodeJS.Timeout;
        
        // Function to update loading message
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
            
            dotCount = (dotCount + 1) % 4; // Cycle through 0, 1, 2, 3 dots
        };
        
        // Start dot animation
        dotInterval = setInterval(updateLoadingMessage, 400);
        
        // Progress through different messages
        const messageInterval = setInterval(() => {
            if (currentMessageIndex < loadingMessages.length - 1) {
                currentMessageIndex++;
                dotCount = 0; // Reset dots for new message
            }
        }, 2000); // Change message every 2 seconds

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
                    message: currentInput,
                    sessionId,
                    mentions: currentMentions,
                    userId: user.id
                }),
            });

            const data = await res.json();
            
            // Clear intervals
            clearInterval(dotInterval);
            clearInterval(messageInterval);
            
            // Check if response is an error
            if (!res.ok || data.error) {
                throw new Error(data.error || `Server error: ${res.status}`);
            }
            
            // Replace status message with actual response
            setMessages((msgs) => 
                msgs.map(msg => 
                    msg.id === statusMessageId 
                        ? { ...msg, text: data.answer, isStatus: false, sources: data.sources }
                        : msg
                )
            );
        } catch (err) {
            // Clear intervals on error too
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

    return (
        <>
            {/* Messages - only show if there are messages */}
            {messages.length > 0 && (
                <div className="space-y-4 mb-6 max-h-[60vh] overflow-y-auto">
                    {messages.map((msg, idx) => (
                    <div
                        key={msg.id || idx}
                        className={`p-4 rounded-lg transition-all duration-300 ${msg.role === 'user'
                            ? 'bg-indigo-100 dark:bg-indigo-900 ml-12'
                            : msg.isStatus 
                                ? 'bg-gray-100 dark:bg-gray-700 mr-12 ' + styles.shimmer
                                : 'bg-gray-100 dark:bg-gray-700 mr-12'
                            }`}
                    >
                        <p className={`text-gray-900 dark:text-white ${msg.isStatus ? 'italic ' + styles.loadingDots : ''}`}>
                            {msg.role === 'user' && msg.mentions ? renderMessageWithMentions(msg.text, msg.mentions) : msg.text}
                        </p>
                        {/* Show sources if available */}
                        {msg.sources && msg.sources.length > 0 && (
                            <div className="mt-3 flex gap-2 items-center">
                                <span className="text-xs text-gray-500 dark:text-gray-400">Sources:</span>
                                {msg.sources.map((source, idx) => (
                                    <SourceCard key={idx} source={source} />
                                ))}
                            </div>
                        )}
                    </div>
                    ))}
                </div>
            )}

            {/* Input */}
            <ChatInput
                value={input}
                onChange={setInput}
                onMentionsChange={setTrackedMentions}
                onSubmit={sendMessage}
                placeholder="Ask a question... Use @ to mention specific people or projects"
                userId={user?.id}
                disabled={loading}
                loading={loading}
            />
        </>
    );
}