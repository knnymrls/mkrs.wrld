export interface Experience {
  id: string;
  profile_id: string;
  company: string;
  role: string;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  created_at: string;
}