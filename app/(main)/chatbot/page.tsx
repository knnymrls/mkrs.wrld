// app/chatbot/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import ChatInterface from '../../components/features/ChatInterface';
import ChatHistory from '../../components/features/ChatHistory';

export default function ChatbotPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [sessionId, setSessionId] = useState<string>('');

    // Initialize session ID on component mount
    useEffect(() => {
        // Always create a new session ID for the initial chatbot page
        const newSessionId = uuidv4();
        setSessionId(newSessionId);
        // Clear the old localStorage key
        localStorage.removeItem('chatSessionId');
    }, []);

    const handleFirstMessage = () => {
        // Redirect to the chat session page after the first message
        router.push(`/chatbot/${sessionId}`);
    };

    if (!sessionId) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto">
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                        <div className="animate-pulse">
                            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center px-4">
            <div className="w-full max-w-2xl">
                <h1 className="text-4xl font-medium text-gray-800 dark:text-white text-center mb-16">
                    Who can I help you with?
                </h1>
                <ChatInterface
                    sessionId={sessionId}
                    onFirstMessage={handleFirstMessage}
                />
                <div className="mt-8">
                    <ChatHistory />
                </div>
            </div>
        </div>
    );
}
