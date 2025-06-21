// app/chatbot/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import ChatInput from '../../components/features/ChatInput';
import ChatHistory from '../../components/features/ChatHistory';
import { TrackedMention } from '../../types/mention';

export default function ChatbotPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [sessionId, setSessionId] = useState<string>('');
    const [input, setInput] = useState('');
    const [trackedMentions, setTrackedMentions] = useState<TrackedMention[]>([]);

    // Initialize session ID on component mount
    useEffect(() => {
        // Always create a new session ID for the initial chatbot page
        const newSessionId = uuidv4();
        setSessionId(newSessionId);
        // Clear the old localStorage key
        localStorage.removeItem('chatSessionId');
    }, []);

    const handleSubmit = () => {
        if (!input.trim() || !sessionId) return;

        // Save the pending message to localStorage so the session page can send it
        const pendingMessage = {
            text: input,
            mentions: trackedMentions
        };
        localStorage.setItem(`pending-message-${sessionId}`, JSON.stringify(pendingMessage));

        // Redirect to the chat session page
        router.push(`/chatbot/${sessionId}`);
    };

    if (!sessionId) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-9 py-12">
                <div className="max-w-3xl w-full text-center">
                    <div className="bg-surface-container rounded-2xl shadow-lg p-8 border border-border">
                        <div className="animate-pulse">
                            <div className="h-8 bg-surface-container-muted rounded-xl w-1/4 mb-6 mx-auto"></div>
                            <div className="h-4 bg-surface-container-muted rounded-lg w-1/2 mx-auto"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 md:px-9 md:py-12">
            <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]">
                <div className="w-full max-w-4xl">
                    <div className="text-center mb-8 md:mb-12">
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-medium text-onsurface-primary mb-4">
                            Who can I help you find?
                        </h1>
                        <p className="text-lg sm:text-xl text-onsurface-secondary max-w-2xl mx-auto">
                            Ask about people, projects, or expertise within your organization. Use @ to mention specific people or projects.
                        </p>
                    </div>
                    
                    <div className="mb-8">
                        <ChatInput
                            value={input}
                            onChange={setInput}
                            onMentionsChange={setTrackedMentions}
                            onSubmit={handleSubmit}
                            placeholder="Ask about someone's expertise, find project contributors, or discover who's working on something..."
                            userId={user?.id}
                            allowProjectCreation={false}
                            rows={3}
                        />
                    </div>
                    
                    {/* Example prompts */}
                    <div className="text-center mb-8">
                        <p className="text-sm text-onsurface-secondary mb-4">Try asking:</p>
                        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                            {[
                                "Who knows React?",
                                "Find someone with design experience",
                                "Who's working on @ProjectX?",
                                "Recent activity from the ML team"
                            ].map((prompt, index) => (
                                <button
                                    key={index}
                                    onClick={() => setInput(prompt)}
                                    className="px-3 py-2 sm:px-4 bg-surface-container hover:bg-surface-container-muted text-onsurface-primary border border-border rounded-xl transition-all text-xs sm:text-sm hover:scale-105"
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="mt-12">
                        <ChatHistory />
                    </div>
                </div>
            </div>
        </div>
    );
}
