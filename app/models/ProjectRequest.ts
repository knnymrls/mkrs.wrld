export interface ProjectRequest {
  id: string;
  title: string;
  description: string;
  skills_needed: string[];
  time_commitment: 'few_hours' | 'few_days' | 'week' | 'few_weeks' | 'month' | 'months';
  urgency: 'low' | 'medium' | 'high';
  department?: string;
  division?: string;
  status: 'open' | 'in_review' | 'filled' | 'cancelled';
  max_participants: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  embedding?: number[];
  creator?: {
    id: string;
    name: string;
    title?: string;
    avatar_url?: string;
  };
  interest_count?: number;
  is_interested?: boolean;
}

export interface ProjectInterest {
  id: string;
  project_request_id: string;
  interested_user_id: string;
  message?: string;
  status: 'interested' | 'selected' | 'rejected' | 'withdrawn';
  created_at: string;
  updated_at: string;
  interested_user?: {
    id: string;
    name: string;
    title?: string;
    avatar_url?: string;
    skills?: string[];
  };
}

export const TIME_COMMITMENT_LABELS = {
  few_hours: 'A few hours',
  few_days: 'A few days',
  week: '1 week',
  few_weeks: '2-3 weeks',
  month: '1 month',
  months: '2+ months'
};

export const URGENCY_LABELS = {
  low: 'Low - Flexible timeline',
  medium: 'Medium - Next few weeks',
  high: 'High - ASAP'
};

export const STATUS_LABELS = {
  open: 'Open for applications',
  in_review: 'Reviewing applicants',
  filled: 'Position filled',
  cancelled: 'Cancelled'
};