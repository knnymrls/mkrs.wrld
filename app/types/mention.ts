export interface MentionSuggestion {
  id: string;
  name: string;
  type: 'person' | 'project';
  subtitle?: string;
}

export interface TrackedMention {
  id: string;
  name: string;
  type: 'person' | 'project';
  start: number;
  end: number;
}

export interface DropdownPosition {
  top: number;
  left: number;
}