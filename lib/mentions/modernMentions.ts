import { TrackedMention } from '@/app/types/mention';

export interface MentionToken {
  id: string;
  name: string;
  type: 'person' | 'project';
  imageUrl?: string;
}

export class ModernMentionManager {
  private element: HTMLElement;
  private onMentionTrigger?: (query: string, position: { top: number; left: number }) => void;
  private onMentionDismiss?: () => void;
  private onMentionsChange?: (mentions: TrackedMention[]) => void;
  private onTextChange?: (text: string) => void;
  private mutationObserver!: MutationObserver;

  constructor(
    element: HTMLElement,
    options: {
      onMentionTrigger?: (query: string, position: { top: number; left: number }) => void;
      onMentionDismiss?: () => void;
      onMentionsChange?: (mentions: TrackedMention[]) => void;
      onTextChange?: (text: string) => void;
    } = {}
  ) {
    this.element = element;
    this.onMentionTrigger = options.onMentionTrigger;
    this.onMentionDismiss = options.onMentionDismiss;
    this.onMentionsChange = options.onMentionsChange;
    this.onTextChange = options.onTextChange;

    this.setupElement();
    this.setupEventListeners();
    this.setupMutationObserver();
  }

  private setupElement() {
    this.element.contentEditable = 'true';
    this.element.style.outline = 'none';
    this.element.setAttribute('data-mention-container', 'true');
  }

  private setupEventListeners() {
    this.element.addEventListener('input', this.handleInput.bind(this));
    this.element.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.element.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  private setupMutationObserver() {
    this.mutationObserver = new MutationObserver((mutations) => {
      let hasChanges = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        this.notifyMentionsChange();
        this.notifyTextChange();
      }
    });

    this.mutationObserver.observe(this.element, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  private handleInput() {
    this.checkForMentionTrigger();
    this.notifyTextChange();
  }

  private handleKeyDown(e: KeyboardEvent) {
    // Handle backspace on mention tokens
    if (e.key === 'Backspace') {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const { startContainer, startOffset } = range;

      // Check if we're at the beginning of a mention token
      const mentionToken = this.findMentionTokenAt(startContainer, startOffset);
      if (mentionToken) {
        e.preventDefault();
        this.deleteMentionToken(mentionToken);
      }
    }
  }

  private handleKeyUp() {
    this.checkForMentionTrigger();
  }

  private checkForMentionTrigger() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const { startContainer, startOffset } = range;

    if (startContainer.nodeType !== Node.TEXT_NODE) return;

    const textContent = startContainer.textContent || '';
    const textBeforeCursor = textContent.substring(0, startOffset);
    
    // Find the last @ symbol
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex === -1) {
      this.onMentionDismiss?.();
      return;
    }

    // Get the query after @
    const query = textBeforeCursor.substring(lastAtIndex + 1);
    
    // Don't trigger if there's a space in the query
    if (query.includes(' ')) {
      this.onMentionDismiss?.();
      return;
    }

    // Get position for dropdown
    const position = this.getDropdownPosition(range, lastAtIndex);
    this.onMentionTrigger?.(query, position);
  }

  private getDropdownPosition(range: Range, atIndex: number): { top: number; left: number } {
    // Create a range that starts at the @ symbol
    const atRange = document.createRange();
    atRange.setStart(range.startContainer, atIndex);
    atRange.setEnd(range.startContainer, atIndex + 1);

    const rect = atRange.getBoundingClientRect();
    
    return {
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX
    };
  }

  private findMentionTokenAt(node: Node, offset: number): HTMLElement | null {
    // Check if we're right before a mention token
    if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
      const nextSibling = node.nextSibling;
      if (nextSibling && this.isMentionToken(nextSibling as HTMLElement)) {
        return nextSibling as HTMLElement;
      }
    }

    // Check if we're inside a mention token
    let current: Node | null = node;
    while (current && current !== this.element) {
      if (this.isMentionToken(current as HTMLElement)) {
        return current as HTMLElement;
      }
      current = current.parentNode;
    }

    return null;
  }

  private isMentionToken(element: HTMLElement): boolean {
    return element.hasAttribute && element.hasAttribute('data-mention-id');
  }

  private deleteMentionToken(token: HTMLElement) {
    token.remove();
    this.notifyMentionsChange();
    this.notifyTextChange();
  }

  insertMention(mention: MentionToken) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const { startContainer, startOffset } = range;

    if (startContainer.nodeType !== Node.TEXT_NODE) return;

    const textContent = startContainer.textContent || '';
    const textBeforeCursor = textContent.substring(0, startOffset);
    
    // Find the @ symbol
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex === -1) return;

    // Create mention element
    const mentionElement = document.createElement('span');
    mentionElement.className = 'mention-token bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1 rounded border border-blue-300 dark:border-blue-700';
    mentionElement.contentEditable = 'false';
    mentionElement.textContent = mention.name;
    mentionElement.setAttribute('data-mention-id', mention.id);
    mentionElement.setAttribute('data-mention-type', mention.type);
    mentionElement.setAttribute('data-mention-name', mention.name);
    if (mention.imageUrl) {
      mentionElement.setAttribute('data-mention-image', mention.imageUrl);
    }

    // Split the text node and insert the mention
    const beforeAt = textContent.substring(0, lastAtIndex);
    const afterQuery = textContent.substring(startOffset);

    // Update the text node to only contain text before @
    startContainer.textContent = beforeAt;

    // Create new text node for content after mention
    const afterNode = document.createTextNode(' ' + afterQuery);

    // Insert mention and after text
    const parent = startContainer.parentNode!;
    parent.insertBefore(mentionElement, startContainer.nextSibling);
    parent.insertBefore(afterNode, mentionElement.nextSibling);

    // Position cursor after the mention
    const newRange = document.createRange();
    newRange.setStart(afterNode, 1);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);

    this.notifyMentionsChange();
    this.notifyTextChange();
    this.onMentionDismiss?.();
  }

  getMentions(): TrackedMention[] {
    const mentions: TrackedMention[] = [];
    const tokens = this.element.querySelectorAll('[data-mention-id]');
    
    tokens.forEach((token) => {
      const element = token as HTMLElement;
      const id = element.getAttribute('data-mention-id');
      const name = element.getAttribute('data-mention-name');
      const type = element.getAttribute('data-mention-type') as 'person' | 'project';
      const imageUrl = element.getAttribute('data-mention-image');
      
      if (id && name && type) {
        mentions.push({
          id,
          name,
          type,
          start: 0, // Not needed in this approach
          end: 0,   // Not needed in this approach
          imageUrl: imageUrl || undefined
        });
      }
    });

    return mentions;
  }

  getPlainText(): string {
    // Clone the element and replace mention tokens with their names
    const clone = this.element.cloneNode(true) as HTMLElement;
    const mentions = clone.querySelectorAll('[data-mention-id]');
    
    mentions.forEach((mention) => {
      const name = mention.getAttribute('data-mention-name');
      if (name) {
        mention.replaceWith(document.createTextNode(name));
      }
    });

    return clone.textContent || '';
  }

  setContent(text: string) {
    this.element.textContent = text;
    this.notifyMentionsChange();
  }

  private notifyMentionsChange() {
    if (this.onMentionsChange) {
      const mentions = this.getMentions();
      this.onMentionsChange(mentions);
    }
  }

  private notifyTextChange() {
    if (this.onTextChange) {
      const text = this.getPlainText();
      this.onTextChange(text);
    }
  }

  destroy() {
    this.element.removeEventListener('input', this.handleInput.bind(this));
    this.element.removeEventListener('keydown', this.handleKeyDown.bind(this));
    this.element.removeEventListener('keyup', this.handleKeyUp.bind(this));
    this.mutationObserver.disconnect();
  }
}