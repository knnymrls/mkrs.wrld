// Predefined Nelnet divisions
export const NELNET_DIVISIONS = [
  'Catalyst',
  'NBS',
  'NDS',
  'Corporate'
] as const;

export type NelnetDivision = typeof NELNET_DIVISIONS[number];

// Division color mapping for graph visualization
export const DIVISION_COLORS: Record<string, string> = {
  'Catalyst': '#3B82F6',          // Blue
  'NBS': '#10B981',               // Green
  'NDS': '#8B5CF6',               // Purple
  'Corporate': '#0EA5E9',         // Sky Blue
  // Default color for unknown divisions
  'default': '#6B7280'
};

// Get color for a division
export function getDivisionColor(division: string | null | undefined): string {
  if (!division) return DIVISION_COLORS.default;
  return DIVISION_COLORS[division] || DIVISION_COLORS.default;
}

// Common job role categories based on title parsing
export const JOB_CATEGORIES = {
  'Engineering': ['engineer', 'developer', 'programmer', 'architect', 'devops', 'sre'],
  'Product': ['product manager', 'product owner', 'pm', 'po'],
  'Design': ['designer', 'ux', 'ui', 'creative'],
  'Finance': ['finance', 'accounting', 'accountant', 'controller', 'analyst'],
  'Operations': ['operations', 'ops', 'administrator', 'coordinator'],
  'Leadership': ['director', 'manager', 'vp', 'president', 'chief', 'head'],
  'Sales': ['sales', 'account manager', 'business development'],
  'Marketing': ['marketing', 'brand', 'communications'],
  'HR': ['hr', 'human resources', 'recruiting', 'talent'],
  'Legal': ['legal', 'lawyer', 'counsel', 'compliance'],
  'Data': ['data scientist', 'data analyst', 'data engineer', 'analytics'],
  'Support': ['support', 'customer service', 'help desk']
} as const;

export type JobCategory = keyof typeof JOB_CATEGORIES;

// Categorize job title into a category
export function categorizeJobTitle(title: string | null | undefined): JobCategory | 'Other' {
  if (!title) return 'Other';
  
  const lowerTitle = title.toLowerCase();
  
  for (const [category, keywords] of Object.entries(JOB_CATEGORIES)) {
    if (keywords.some(keyword => lowerTitle.includes(keyword))) {
      return category as JobCategory;
    }
  }
  
  return 'Other';
}

// Job category colors for potential future use
export const JOB_CATEGORY_COLORS: Record<JobCategory | 'Other', string> = {
  'Engineering': '#3B82F6',
  'Product': '#8B5CF6',
  'Design': '#EC4899',
  'Finance': '#10B981',
  'Operations': '#F59E0B',
  'Leadership': '#EF4444',
  'Sales': '#14B8A6',
  'Marketing': '#F97316',
  'HR': '#A78BFA',
  'Legal': '#6B7280',
  'Data': '#06B6D4',
  'Support': '#84CC16',
  'Other': '#9CA3AF'
};