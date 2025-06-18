import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

interface UseImageStorageOptions {
  bucket: string;
  path?: string;
  onUploadComplete?: (url: string) => void;
  onUploadError?: (error: Error) => void;
}

interface UseImageStorageReturn {
  isUploading: boolean;
  uploadProgress: number;
  uploadError: Error | null;
  uploadImage: (file: File) => Promise<string | null>;
  deleteImage: (path: string) => Promise<boolean>;
  getPublicUrl: (path: string) => string;
}

export function useImageStorage(options: UseImageStorageOptions): UseImageStorageReturn {
  const { bucket, path = '', onUploadComplete, onUploadError } = options;
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<Error | null>(null);

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExt = file.name.split('.').pop();
      const fileName = `${timestamp}-${randomString}.${fileExt}`;
      const filePath = path ? `${path}/${fileName}` : fileName;

      // Upload file
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      setUploadProgress(100);
      onUploadComplete?.(publicUrl);
      
      return publicUrl;
    } catch (error) {
      const err = error as Error;
      setUploadError(err);
      onUploadError?.(err);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [bucket, path, onUploadComplete, onUploadError]);

  const deleteImage = useCallback(async (imagePath: string): Promise<boolean> => {
    try {
      // Extract path from URL if full URL is provided
      let deletePath = imagePath;
      if (imagePath.includes(bucket)) {
        const parts = imagePath.split(`/${bucket}/`);
        if (parts.length > 1) {
          deletePath = parts[1];
        }
      }

      const { error } = await supabase.storage
        .from(bucket)
        .remove([deletePath]);

      if (error) throw error;
      
      return true;
    } catch (error) {
      return false;
    }
  }, [bucket]);

  const getPublicUrl = useCallback((filePath: string): string => {
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
    
    return publicUrl;
  }, [bucket]);

  return {
    isUploading,
    uploadProgress,
    uploadError,
    uploadImage,
    deleteImage,
    getPublicUrl
  };
}