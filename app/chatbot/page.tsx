'use client';

import { useState } from 'react';

export default function ChatbotPage() {
    const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const sendMessage = async () => {
        if (!input.trim()) return;

        setMessages((msgs) => [...msgs, { role: 'user', text: input }]);
        setLoading(true);
        setInput('');

        try {
            const res = await fetch('http://localhost:8000/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: input }),
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
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4">
            <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex flex-col space-y-4">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Chatbot (RAG)</h2>

                <div className="flex-1 overflow-y-auto space-y-2 mb-4" style={{ minHeight: 300 }}>
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`p-2 rounded ${msg.role === 'user'
                                ? 'bg-indigo-100 dark:bg-indigo-900 text-right ml-auto'
                                : 'bg-gray-200 dark:bg-gray-700 text-left mr-auto'
                                }`}
                        >
                            <span className="block">{msg.text}</span>
                        </div>
                    ))}
                    {loading && <div className="text-gray-500 dark:text-gray-400">Bot is thinking...</div>}
                </div>

                <div className="flex space-x-2">
                    <input
                        className="flex-1 rounded border border-gray-300 dark:border-gray-700 px-3 py-2 focus:outline-none"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Type your question..."
                        disabled={loading}
                    />
                    <button
                        className="bg-indigo-600 text-white px-4 py-2 rounded disabled:opacity-50"
                        onClick={sendMessage}
                        disabled={loading}
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}
