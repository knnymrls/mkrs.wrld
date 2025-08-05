import React from 'react';
import MentionLink from '@/app/components/ui/MentionLink';

interface PostMention {
  id: string;
  name: string;
  type: 'person' | 'project';
  imageUrl?: string | null;
  icon?: string | null;
}

/**
 * Renders post content with mentions as clickable links
 * This function handles the complex logic of finding and replacing mention names in the content
 */
export function renderPostContentWithMentions(
  content: string,
  mentions: PostMention[]
): React.ReactNode {
  if (!mentions || mentions.length === 0) {
    return content;
  }

  // Create a map of all possible mention patterns to look for
  // This includes the name as-is and with potential @ prefixes
  const mentionMap = new Map<string, PostMention>();
  
  mentions.forEach(mention => {
    // Add the mention name as stored in the database
    mentionMap.set(mention.name, mention);
    // Also add with @ prefix in case it's still in the content
    mentionMap.set(`@${mention.name}`, mention);
  });

  // Find all mentions in the content
  const mentionMatches: Array<{
    mention: PostMention;
    start: number;
    end: number;
    matchedText: string;
  }> = [];

  // Look for each mention pattern in the content
  for (const [pattern, mention] of mentionMap) {
    let index = 0;
    while (index < content.length) {
      const foundIndex = content.indexOf(pattern, index);
      if (foundIndex === -1) break;
      
      // Check if this is a whole word match (not part of another word)
      const beforeChar = foundIndex > 0 ? content[foundIndex - 1] : ' ';
      const afterChar = foundIndex + pattern.length < content.length 
        ? content[foundIndex + pattern.length] 
        : ' ';
      
      // Only consider it a mention if it's a whole word
      // (preceded and followed by whitespace or punctuation)
      const isWholeWord = /[\s@]/.test(beforeChar) && /[\s.,!?;)]/.test(afterChar);
      
      if (isWholeWord) {
        // Check if this position is already covered by another mention
        const isAlreadyCovered = mentionMatches.some(match => 
          foundIndex >= match.start && foundIndex < match.end
        );
        
        if (!isAlreadyCovered) {
          mentionMatches.push({
            mention,
            start: foundIndex,
            end: foundIndex + pattern.length,
            matchedText: pattern
          });
        }
      }
      
      index = foundIndex + 1;
    }
  }

  // Sort mentions by their position in the content
  mentionMatches.sort((a, b) => a.start - b.start);

  // If no mentions found, return the original content
  if (mentionMatches.length === 0) {
    return content;
  }

  // Build the rendered content with mention links
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  mentionMatches.forEach((match, idx) => {
    // Add text before this mention
    if (match.start > lastIndex) {
      parts.push(
        <span key={`text-${idx}`}>
          {content.substring(lastIndex, match.start)}
        </span>
      );
    }

    // Add the mention as a link
    parts.push(
      <MentionLink
        key={`mention-${match.mention.id}-${idx}`}
        id={match.mention.id}
        name={match.mention.name}
        type={match.mention.type}
        imageUrl={match.mention.imageUrl}
        icon={match.mention.icon}
      />
    );

    lastIndex = match.end;
  });

  // Add any remaining text after the last mention
  if (lastIndex < content.length) {
    parts.push(
      <span key="text-end">
        {content.substring(lastIndex)}
      </span>
    );
  }

  return <>{parts}</>;
}