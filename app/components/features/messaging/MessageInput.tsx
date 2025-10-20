'use client';

import React, { useState } from 'react';

interface MessageInputProps {
  onSend: (content: string) => Promise<void>;
}

export default function MessageInput({ onSend }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sending) return;

    setSending(true);
    await onSend(message);
    setMessage('');
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        disabled={sending}
        rows={1}
        className="flex-1 px-4 py-2 bg-surface-container border border-border rounded-xl text-sm text-onsurface-primary placeholder:text-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-onsurface-primary resize-none"
        style={{ minHeight: '40px', maxHeight: '120px' }}
      />
      <button
        type="submit"
        disabled={!message.trim() || sending}
        className="px-4 py-2 bg-onsurface-primary text-surface-container rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {sending ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}
