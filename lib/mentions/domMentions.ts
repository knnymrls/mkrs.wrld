import { TrackedMention } from '@/app/types/mention';

export interface MentionElement extends TrackedMention {
  element: HTMLSpanElement;
  range: Range;
}

export class DOMmentionManager {
  private container: HTMLElement;
  private mentions: Map<string, MentionElement> = new Map();
  private onMentionChange?: (mentions: TrackedMention[]) => void;

  constructor(container: HTMLElement, onMentionChange?: (mentions: TrackedMention[]) => void) {
    this.container = container;
    this.onMentionChange = onMentionChange;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.container.addEventListener('input', this.handleInput.bind(this));
    this.container.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  private handleInput() {
    this.validateMentions();
    this.notifyChange();
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      // Let browser handle deletion, then validate mentions
      setTimeout(() => {
        this.validateMentions();
        this.notifyChange();
      }, 0);
    }
  }

  private validateMentions() {
    const toRemove: string[] = [];
    
    this.mentions.forEach((mention, id) => {
      if (!this.container.contains(mention.element) || 
          !mention.element.textContent ||
          mention.element.textContent !== mention.name) {
        toRemove.push(id);
      }
    });

    toRemove.forEach(id => this.mentions.delete(id));
  }

  private notifyChange() {
    if (this.onMentionChange) {
      const mentions = Array.from(this.mentions.values()).map(m => ({
        id: m.id,
        name: m.name,
        type: m.type,
        start: 0, // Not needed with DOM approach
        end: 0,   // Not needed with DOM approach
        imageUrl: m.imageUrl
      }));
      this.onMentionChange(mentions);
    }
  }

  getCurrentCursorPosition(): number {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 0;
    
    const range = selection.getRangeAt(0);
    return this.getOffsetFromContainer(range.startContainer, range.startOffset);
  }

  private getOffsetFromContainer(node: Node, offset: number): number {
    const walker = document.createTreeWalker(
      this.container,
      NodeFilter.SHOW_TEXT,
      null
    );

    let totalOffset = 0;
    let currentNode;

    while (currentNode = walker.nextNode()) {
      if (currentNode === node) {
        return totalOffset + offset;
      }
      totalOffset += currentNode.textContent?.length || 0;
    }

    return totalOffset;
  }

  findAtSymbolBeforeCursor(): { position: number; query: string } | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;
    
    if (textNode.nodeType !== Node.TEXT_NODE) return null;
    
    const textContent = textNode.textContent || '';
    const cursorOffset = range.startOffset;
    
    // Look for @ symbol before cursor
    const textBeforeCursor = textContent.substring(0, cursorOffset);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex === -1) return null;
    
    const query = textBeforeCursor.substring(lastAtIndex + 1);
    
    // Don't show if there's a space in the query
    if (query.includes(' ')) return null;
    
    return {
      position: this.getOffsetFromContainer(textNode, lastAtIndex),
      query
    };
  }

  getDropdownPosition(): { top: number; left: number } {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return { top: 0, left: 0 };
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Position dropdown below the cursor
    return {
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX
    };
  }

  addMention(mention: TrackedMention, atPosition: number): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    // Find the @ symbol and replace it with the mention
    const range = this.findRangeForAtSymbol(atPosition);
    if (!range) return;

    // Create mention element
    const mentionElement = document.createElement('span');
    mentionElement.className = 'mention-tag text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1 rounded';
    mentionElement.contentEditable = 'false';
    mentionElement.textContent = mention.name;
    mentionElement.dataset.mentionId = mention.id;
    mentionElement.dataset.mentionType = mention.type;

    // Replace the @ and query text with the mention element
    range.deleteContents();
    range.insertNode(mentionElement);

    // Add a space after the mention
    const spaceNode = document.createTextNode(' ');
    range.setStartAfter(mentionElement);
    range.insertNode(spaceNode);

    // Position cursor after the space
    const newRange = document.createRange();
    newRange.setStartAfter(spaceNode);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);

    // Store the mention
    const mentionEl: MentionElement = {
      ...mention,
      element: mentionElement,
      range: newRange.cloneRange()
    };
    this.mentions.set(mention.id, mentionEl);
    
    this.notifyChange();
  }

  private findRangeForAtSymbol(atPosition: number): Range | null {
    const walker = document.createTreeWalker(
      this.container,
      NodeFilter.SHOW_TEXT,
      null
    );

    let currentOffset = 0;
    let currentNode;

    while (currentNode = walker.nextNode()) {
      const nodeLength = currentNode.textContent?.length || 0;
      
      if (currentOffset + nodeLength > atPosition) {
        const offsetInNode = atPosition - currentOffset;
        const textContent = currentNode.textContent || '';
        
        // Find the @ symbol and any text after it until space or end
        const atIndex = textContent.indexOf('@', offsetInNode);
        if (atIndex === -1) return null;
        
        const queryStart = atIndex + 1;
        let queryEnd = queryStart;
        
        // Find end of query (space or end of text)
        while (queryEnd < textContent.length && textContent[queryEnd] !== ' ') {
          queryEnd++;
        }
        
        const range = document.createRange();
        range.setStart(currentNode, atIndex);
        range.setEnd(currentNode, queryEnd);
        
        return range;
      }
      
      currentOffset += nodeLength;
    }

    return null;
  }

  getMentions(): TrackedMention[] {
    return Array.from(this.mentions.values()).map(m => ({
      id: m.id,
      name: m.name,
      type: m.type,
      start: 0, // Not needed with DOM approach
      end: 0,   // Not needed with DOM approach
      imageUrl: m.imageUrl
    }));
  }

  clear(): void {
    this.mentions.clear();
    this.notifyChange();
  }

  destroy(): void {
    this.container.removeEventListener('input', this.handleInput.bind(this));
    this.container.removeEventListener('keydown', this.handleKeyDown.bind(this));
  }
}

// Utility function to create a contentEditable div with mention support
export function createMentionEditor(
  container: HTMLElement,
  options: {
    placeholder?: string;
    onMentionChange?: (mentions: TrackedMention[]) => void;
    onInput?: (content: string) => void;
  } = {}
): DOMmentionManager {
  container.contentEditable = 'true';
  container.style.outline = 'none';
  
  if (options.placeholder) {
    container.dataset.placeholder = options.placeholder;
    
    // Add placeholder styling
    const style = document.createElement('style');
    style.textContent = `
      [contenteditable][data-placeholder]:empty::before {
        content: attr(data-placeholder);
        color: #9ca3af;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }

  const manager = new DOMmentionManager(container, options.onMentionChange);

  if (options.onInput) {
    container.addEventListener('input', () => {
      options.onInput!(container.textContent || '');
    });
  }

  return manager;
}

// Helper to get text content without mention elements
export function getPlainTextContent(container: HTMLElement): string {
  const clone = container.cloneNode(true) as HTMLElement;
  
  // Replace mention elements with their text content
  const mentions = clone.querySelectorAll('.mention-tag');
  mentions.forEach(mention => {
    const text = document.createTextNode(mention.textContent || '');
    mention.parentNode?.replaceChild(text, mention);
  });
  
  return clone.textContent || '';
}