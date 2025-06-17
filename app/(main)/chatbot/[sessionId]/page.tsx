'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import ChatInterface, { ChatMessage } from '../../../components/features/ChatInterface';

export default function ChatSessionPage() {
    const params = useParams();
    const sessionId = params.sessionId as string;
    const { user } = useAuth();
    const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load messages from localStorage
        const savedMessages = localStorage.getItem(`chat-${sessionId}`);
        if (savedMessages) {
            try {
                const parsed = JSON.parse(savedMessages);
                // Filter out any status messages that weren't replaced
                const filteredMessages = parsed.filter((msg: ChatMessage) => !msg.isStatus);
                setInitialMessages(filteredMessages);
            } catch (error) {
                console.error('Error loading saved messages:', error);
            }
        }
        setLoading(false);
    }, [sessionId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto">
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                        <div className="animate-pulse">
                            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
                            <div className="space-y-3">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Chat Session</h1>
                    <ChatInterface 
                        sessionId={sessionId} 
                        initialMessages={initialMessages}
                    />
                </div>
            </div>
        </div>
    );
}