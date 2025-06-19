'use client';

import React from 'react';
import MentionInput from './MentionInput';
import { TrackedMention } from '@/app/types/mention';

interface CommentMentionInputProps {
  postId: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onMentionsChange: (mentions: TrackedMention[]) => void;
  disabled?: boolean;
  placeholder?: string;
  userId?: string;
  autoFocus?: boolean;
  className?: string;
}

export default function CommentMentionInput({
  postId,
  value,
  onChange,
  onSubmit,
  onMentionsChange,
  disabled,
  placeholder = "Write a comment...",
  userId,
  autoFocus = false,
  className = ""
}: CommentMentionInputProps) {
  return (
    <MentionInput
      value={value}
      onChange={onChange}
      onMentionsChange={onMentionsChange}
      onSubmit={onSubmit}
      placeholder={placeholder}
      rows={1}
      disabled={disabled}
      userId={userId}
      autoFocus={autoFocus}
      className={className}
    />
  );
}