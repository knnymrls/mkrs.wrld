// app/chatbot/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export default function ChatbotPage() {
    const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string>('');

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

    const sendMessage = async () => {
        if (!input.trim() || !sessionId) return;

        setMessages((msgs) => [...msgs, { role: 'user', text: input }]);
        setLoading(true);
        setInput('');

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: input,
                    sessionId
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
                                <p className="text-gray-900 dark:text-white">{msg.text}</p>
                            </div>
                        ))}
                        {loading && (
                            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mr-12">
                                <p className="text-gray-500 dark:text-gray-400">Thinking...</p>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="flex space-x-4">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="Ask a question..."
                            className="flex-1 rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                        />
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
    );
}
