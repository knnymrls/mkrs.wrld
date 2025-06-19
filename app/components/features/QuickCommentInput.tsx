'use client';

import React, { useState } from 'react';
import CommentMentionInput from '../ui/CommentMentionInput';
import { TrackedMention } from '@/app/types/mention';

interface QuickCommentInputProps {
  postId: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onMentionsChange: (mentions: TrackedMention[]) => void;
  disabled?: boolean;
  userId?: string;
}

export default function QuickCommentInput({
  postId,
  value,
  onChange,
  onSubmit,
  onMentionsChange,
  disabled,
  userId
}: QuickCommentInputProps) {
  return (
    <div className="flex-1">
      <CommentMentionInput
        postId={postId}
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        onMentionsChange={onMentionsChange}
        disabled={disabled}
        placeholder="Add a comment..."
        userId={userId}
        className=""
      />
    </div>
  );
}