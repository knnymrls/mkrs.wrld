import React from 'react';
import MentionLink from '@/app/components/ui/MentionLink';
import { TrackedMention } from '@/app/types/mention';

interface CommentMention {
  id: string;
  profile_id?: string;
  project_id?: string;
  profile?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  project?: {
    id: string;
    title: string;
  };
}

export function renderContentWithMentions(
  content: string,
  mentions: CommentMention[]
): React.ReactNode {
  if (!mentions || mentions.length === 0) {
    return content;
  }

  // Sort mentions by their position in content
  const sortedMentions = mentions
    .map(mention => {
      const name = mention.profile?.name || mention.project?.title || '';
      const index = content.indexOf(name);
      return { ...mention, name, index };
    })
    .filter(m => m.index !== -1)
    .sort((a, b) => a.index - b.index);

  if (sortedMentions.length === 0) {
    return content;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  sortedMentions.forEach((mention, idx) => {
    // Add text before mention
    if (mention.index > lastIndex) {
      parts.push(
        <span key={`text-before-${idx}`} className="align-middle">
          {content.substring(lastIndex, mention.index)}
        </span>
      );
    }

    // Add mention as link
    if (mention.profile_id && mention.profile) {
      parts.push(
        <MentionLink
          key={`mention-${idx}`}
          id={mention.profile_id}
          name={mention.profile.name}
          type="person"
          imageUrl={mention.profile.avatar_url}
          onClick={(e) => e.stopPropagation()}
        />
      );
    } else if (mention.project_id && mention.project) {
      parts.push(
        <MentionLink
          key={`mention-${idx}`}
          id={mention.project_id}
          name={mention.project.title}
          type="project"
          onClick={(e) => e.stopPropagation()}
        />
      );
    }

    lastIndex = mention.index + mention.name.length;
  });

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(
      <span key="text-end" className="align-middle">
        {content.substring(lastIndex)}
      </span>
    );
  }

  return <>{parts}</>;
}