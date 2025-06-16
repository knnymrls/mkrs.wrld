'use client';

import React, { useRef, useEffect } from 'react';

interface QuickCommentInputProps {
  postId: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export default function QuickCommentInput({
  postId,
  value,
  onChange,
  onSubmit,
  disabled
}: QuickCommentInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const adjustHeight = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    };

    adjustHeight();
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => {
        e.stopPropagation();
        onChange(e.target.value);
      }}
      onKeyPress={async (e) => {
        e.stopPropagation();
        if (e.key === 'Enter' && !e.shiftKey && value.trim() && !disabled) {
          e.preventDefault();
          onSubmit();
        }
      }}
      onClick={(e) => e.stopPropagation()}
      placeholder="Add a comment..."
      disabled={disabled}
      className="flex-1 text-sm text-text-primary placeholder-text-secondary bg-input-bg rounded-lg px-3 py-2 border-none outline-none focus:outline-none focus:bg-input-bg-focus focus:ring-1 focus:ring-text-primary transition-all disabled:opacity-50 resize-none"
      style={{
        minHeight: '38px',
        maxHeight: '120px',
        overflow: 'hidden'
      }}
      rows={1}
    />
  );
}