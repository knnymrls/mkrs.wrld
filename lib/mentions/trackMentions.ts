import { TrackedMention } from '@/app/types/mention';
import { getCaretCoordinates } from './getCaretCoordinates';

export function updateMentionPositions(
  mentions: TrackedMention[],
  previousContent: string,
  newContent: string,
  cursorPosition: number
): TrackedMention[] {
  // Check if any mentions were deleted
  const updatedMentions = mentions.filter(mention => {
    // Check if the mention text still exists at the expected position
    const mentionText = mention.name; // No @ symbol
    const textAtPosition = newContent.substring(mention.start, mention.end);
    
    if (textAtPosition !== mentionText) {
      // Mention was modified or deleted
      return false;
    }
    return true;
  });

  // Update mention positions if text before them changed
  const lengthDiff = newContent.length - previousContent.length;
  if (lengthDiff !== 0 && cursorPosition <= newContent.length) {
    updatedMentions.forEach(mention => {
      if (mention.start >= cursorPosition && previousContent.length > 0) {
        mention.start += lengthDiff;
        mention.end += lengthDiff;
      }
    });
  }

  return updatedMentions;
}

export function isInsideExistingMention(
  position: number,
  mentions: TrackedMention[]
): boolean {
  return mentions.some(m => position >= m.start && position < m.end);
}

export function getMentionAtCursor(
  cursorPosition: number,
  mentions: TrackedMention[]
): TrackedMention | undefined {
  return mentions.find(m => m.end === cursorPosition);
}

export function calculateDropdownPosition(
  textarea: HTMLTextAreaElement,
  atPosition: number,
  content: string
): { top: number; left: number } {
  // Get caret coordinates using more accurate method
  const caretPos = getCaretCoordinates(textarea, atPosition);
  const rect = textarea.getBoundingClientRect();
  
  // Constants
  const offset = -4; // Perfect offset - slightly overlapping
  const dropdownWidth = 220;
  const dropdownHeight = 200;
  
  // Calculate absolute position
  let top = rect.top + caretPos.top + caretPos.height + offset;
  let left = rect.left + caretPos.left;
  
  // Check viewport boundaries
  if (top + dropdownHeight > window.innerHeight - 20) {
    // Position above cursor instead
    top = rect.top + caretPos.top - dropdownHeight - offset;
  }
  
  if (left + dropdownWidth > window.innerWidth - 20) {
    // Align to left of cursor position instead
    left = Math.max(20, left - dropdownWidth + 50); // 50px to keep some alignment with cursor
  }
  
  // Ensure minimum distances from edges
  left = Math.max(20, left);
  top = Math.max(20, top);
  
  return { top, left };
}