// app/chatbot/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../../context/AuthContext';
import MentionInput from '../../components/features/MentionInput';
import { TrackedMention } from '../../types/mention';

export default function ChatbotPage() {
    const { user } = useAuth();
    const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string; mentions?: TrackedMention[] }[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string>('');
    const [trackedMentions, setTrackedMentions] = useState<TrackedMention[]>([]);

    // Initialize session ID on component mount
    useEffect(() => {
        // Try to get existing session ID from localStorage
        const existingSessionId = localStorage.getItem('chatSessionId');
        if (existingSessionId) {
            setSessionId(existingSessionId);
        } else {
            // Create new session ID if none exists
            const newSessionId = uuidv4();
            localStorage.setItem('chatSessionId', newSessionId);
            setSessionId(newSessionId);
        }
    }, []);

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

        setMessages((msgs) => [...msgs, { role: 'user', text: input, mentions: trackedMentions }]);
        setLoading(true);
        const currentInput = input;
        const currentMentions = [...trackedMentions];
        setInput('');
        setTrackedMentions([]);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: currentInput,
                    sessionId,
                    mentions: currentMentions
                }),
            });

            const data = await res.json();
            setMessages((msgs) => [...msgs, { role: 'bot', text: data.answer }]);
        } catch (err) {
            setMessages((msgs) => [...msgs, { role: 'bot', text: 'Error: Could not get response.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Chat Assistant</h1>

                    {/* Messages */}
                    <div className="space-y-4 mb-6 max-h-[60vh] overflow-y-auto">
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`p-4 rounded-lg ${msg.role === 'user'
                                    ? 'bg-indigo-100 dark:bg-indigo-900 ml-12'
                                    : 'bg-gray-100 dark:bg-gray-700 mr-12'
                                    }`}
                            >
                                <p className="text-gray-900 dark:text-white">
                                    {msg.role === 'user' && msg.mentions ? renderMessageWithMentions(msg.text, msg.mentions) : msg.text}
                                </p>
                            </div>
                        ))}
                        {loading && (
                            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mr-12">
                                <p className="text-gray-500 dark:text-gray-400">Thinking...</p>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="space-y-4">
                        <MentionInput
                            value={input}
                            onChange={setInput}
                            onMentionsChange={setTrackedMentions}
                            onSubmit={sendMessage}
                            placeholder="Ask a question... Use @ to mention specific people or projects"
                            rows={3}
                            userId={user?.id}
                            className="dark:bg-gray-800 dark:text-white"
                        />
                        <div className="flex justify-end">
                            <button
                                onClick={sendMessage}
                                disabled={loading || !input.trim()}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
