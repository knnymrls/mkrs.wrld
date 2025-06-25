// Component Props Interfaces

import { TrackedMention } from './mention';
import { PostImage, Post } from '@/app/models/Post';
import { ChatMessage, ChatSession } from '@/app/models/chat';
import { Profile } from '@/app/models/Profile';
import { Project } from '@/app/models/Project';
import { Source } from '@/app/models/Search';

// UI Components Props
export type MentionSuggestion = 
  | (Profile & { type: 'person' })
  | (Project & { type: 'project' })
  | { id: 'create-project'; title: string; type: 'create-project' };

export interface MentionDropdownProps {
  search: string;
  onSelect: (suggestion: MentionSuggestion) => void;
  selectedIndex: number;
  onChangeSelection: (index: number) => void;
}

export interface SuggestionItemProps {
  suggestion: MentionSuggestion;
  index: number;
  selectedIndex: number;
  onChangeSelection: (index: number) => void;
  onClick: () => void;
}

export interface MentionLinkProps {
  mention: {
    id: string;
    name: string;
    type: 'person' | 'project';
  };
}

export interface PostCardSkeletonProps {
  className?: string;
}

export interface ImageUploadProps {
  onImageSelect: (file: File, preview: string) => void;
  existingImage?: string | null;
  className?: string;
}

export interface ImageUploadWithCropProps {
  onImageCropped: (croppedImageUrl: string) => void;
  existingImage?: string | null;
  buttonText?: string;
  className?: string;
}

export interface ImageUploadCropModalProps {
  onImageCropped: (croppedImageUrl: string) => void;
  existingImage?: string | null;
  buttonText?: string;
  className?: string;
}

export interface ImageModalProps {
  imageUrl: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export interface PostImageUploadProps {
  images: PostImage[];
  onImagesChange: (images: PostImage[]) => void;
  maxImages?: number;
}

export interface SourceCardProps {
  source: Source;
}

export interface MentionInputProps {
  value: string;
  onChange: (value: string, mentions: TrackedMention[]) => void;
  placeholder?: string;
  className?: string;
  onEnterPress?: () => void;
  onCreateProject?: (projectName: string) => Promise<{ id: string; title: string }>;
  autoFocus?: boolean;
}

// Feature Components Props
export interface LikeButtonProps {
  postId: string;
  likesCount: number;
  userHasLiked: boolean;
  onLikeUpdate?: (liked: boolean, newCount: number) => void;
}


export interface PostCardProps {
  post: Post;
  onUpdate?: () => void;
}

export interface QuickCommentInputProps {
  postId: string;
  onCommentAdded: () => void;
  className?: string;
}

export interface ChatInterfaceProps {
  sessionId: string;
  initialMessage?: string;
}

export interface ChatInputProps {
  onSendMessage: (content: string, images?: PostImage[]) => void;
  isLoading?: boolean;
  className?: string;
}

export interface CreatePostModalProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated?: () => void;
}

export interface CommentsListProps {
  postId: string;
  commentsCount: number;
}

export interface PostModalProps {
  post: Post;
  onClose: () => void;
  onUpdate: (updatedPost: Post) => void;
  onDelete: () => void;
}

export interface AuthorLinkProps {
  author: {
    id: string;
    name: string;
  };
  className?: string;
}

// Shared Types
export interface ImageData {
  file: File | null;
  preview: string;
  cropped: boolean;
}