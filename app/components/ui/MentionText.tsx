'use client';

import React from 'react';
import MentionLink from './MentionLink';
import { TrackedMention } from '@/app/types/mention';

interface MentionTextProps {
  text: string;
  mentions: TrackedMention[];
  className?: string;
}

export default function MentionText({ text, mentions, className = '' }: MentionTextProps) {
  // Sort mentions by position
  const sortedMentions = [...mentions].sort((a, b) => a.start - b.start);

  if (sortedMentions.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  sortedMentions.forEach((mention, index) => {
    // Add text before mention
    if (mention.start > lastIndex) {
      parts.push(
        <span key={`text-${index}`}>
          {text.substring(lastIndex, mention.start)}
        </span>
      );
    }

    // Add mention link
    if (mention.end <= text.length) {
      parts.push(
        <MentionLink
          key={`mention-${index}`}
          id={mention.id}
          name={mention.name}
          type={mention.type}
          imageUrl={mention.imageUrl}
        />
      );
    }

    lastIndex = mention.end;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key="text-end">
        {text.substring(lastIndex)}
      </span>
    );
  }

  return <span className={className}>{parts}</span>;
}