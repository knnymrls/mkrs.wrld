export interface Profile {
    id: string;
    full_name: string | null;
    email: string | null;
    bio: string | null;
    skills: string[] | null;
    location: string | null;
    title: string | null;
    embedding: number[] | null;
    created_at: string;
}
