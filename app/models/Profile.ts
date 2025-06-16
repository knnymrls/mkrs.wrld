export interface Profile {
    id: string;
    name: string | null;
    email: string | null;
    bio: string | null;
    location: string | null;
    title: string | null;
    avatar_url: string | null;
    embedding: number[] | null;
    created_at: string;
    updated_at: string;
}
