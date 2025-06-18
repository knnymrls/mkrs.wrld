// Component Props Interfaces

import { TrackedMention } from './mention';
import { PostImage } from '@/app/models/Post';
import { ChatMessage, ChatSession } from '@/app/models/chat';

// UI Components Props
export interface MentionDropdownProps {
  search: string;
  onSelect: (suggestion: any) => void;
  selectedIndex: number;
  onChangeSelection: (index: number) => void;
}

export interface SuggestionItemProps {
  suggestion: any;
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
  source: any;
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

export interface PostGridProps {
  posts: any[];
}

export interface PostCardProps {
  post: any;
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
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
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