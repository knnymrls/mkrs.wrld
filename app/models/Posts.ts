export interface Post {
    id: string;
    author_id: string;
    content: string;
    embedding: number[] | null;
    created_at: string;
    updated_at: string;
}

export interface PostProject {
    post_id: string;
    project_id: string;
    created_at: string;
}

export interface PostMention {
    post_id: string;
    profile_id: string;
    created_at: string;
}
