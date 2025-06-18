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
  // Get the exact pixel position of the @ symbol
  const caretPos = getCaretCoordinates(textarea, atPosition);
  const rect = textarea.getBoundingClientRect();

  // Constants
  const offset = 8;
  const dropdownWidth = 320;
  const dropdownHeight = 320;

  // Calculate the exact position of the @ symbol in viewport coordinates
  const cursorX = rect.left + caretPos.left;
  const cursorY = rect.top + caretPos.top;

  // Position dropdown below the cursor by default
  let top = cursorY + 24;
  let left = cursorX + offset;

  // Get viewport dimensions
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // If positioning to the right would go off-screen, position to the left
  if (left + dropdownWidth > viewportWidth - 20) {
    left = cursorX - dropdownWidth - offset;
  }

  // Ensure minimum distances from edges
  left = Math.max(20, left);
  top = Math.max(20, top);

  // Removed final safety check to allow flexible positioning

  if (left < 20) {
    left = 20;
  }

  return { top, left };
}