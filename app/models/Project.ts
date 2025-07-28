export interface Project {
  id: string;
  title: string;
  description: string | null;
  status: 'active' | 'paused' | 'complete';
  created_by: string;
  image_url: string | null;
  icon: string | null;
  embedding: number[] | null;
  created_at: string;
  updated_at: string;
}

export interface Contribution {
  id: string;
  person_id: string;
  project_id: string;
  role: string | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  created_at: string;
}