export interface Post {
    id: number;
    profile_id: string;
    content: string;
    embedding: number[] | null;
    created_at: string;
}
