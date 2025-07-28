export interface MentionSuggestion {
  id: string;
  name: string;
  type: 'person' | 'project';
  subtitle?: string;
  imageUrl?: string | null;
  icon?: string | null;
}

export interface TrackedMention {
  id: string;
  name: string;
  type: 'person' | 'project';
  start: number;
  end: number;
  imageUrl?: string | null;
  icon?: string | null;
}

export interface DropdownPosition {
  top: number;
  left: number;
}