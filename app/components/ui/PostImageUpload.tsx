'use client';

import React, { useState, useEffect } from 'react';
import { ImageIcon } from 'lucide-react';
import { useFileUpload } from '@/app/hooks/useFileUpload';
import { useImageStorage } from '@/app/hooks/useImageStorage';
import { useImageDimensions } from '@/app/hooks/useImageDimensions';
import { FileInput, ImagePreview, RemoveButton, UploadProgress } from './atoms';

interface PostImageUploadProps {
  onImageUpload: (url: string, width: number, height: number) => void;
  onImageRemove: () => void;
  userId: string;
  disabled?: boolean;
  imageUrl?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
}

export default function PostImageUpload({ 
  onImageUpload, 
  onImageRemove, 
  userId, 
  disabled = false,
  imageUrl,
  imageWidth,
  imageHeight
}: PostImageUploadProps) {
  const [displayPreview, setDisplayPreview] = useState<string | null>(imageUrl || null);
  
  const { 
    file,
    preview,
    error,
    selectFile,
    removeFile 
  } = useFileUpload({
    accept: 'image/*',
    maxSize: 5 * 1024 * 1024,
    onError: (err) => alert(err)
  });

  const { 
    isUploading,
    uploadProgress,
    uploadImage
  } = useImageStorage({
    bucket: 'post-images',
    path: userId
  });

  const { calculateDimensions } = useImageDimensions();

  // Handle file selection and upload
  useEffect(() => {
    if (file && preview) {
      handleUpload();
    }
  }, [file, preview]);

  const handleUpload = async () => {
    if (!file) return;

    try {
      // Get dimensions first
      const dimensions = await calculateDimensions(file);
      
      // Upload to storage
      const publicUrl = await uploadImage(file);
      
      if (publicUrl) {
        setDisplayPreview(publicUrl);
        onImageUpload(publicUrl, dimensions.width, dimensions.height);
      }
    } catch (error) {
      removeFile();
      setDisplayPreview(null);
    }
  };

  const handleRemove = () => {
    setDisplayPreview(null);
    removeFile();
    onImageRemove();
  };

  return (
    <div className="space-y-2">
      {!displayPreview ? (
        <div>
          <FileInput
            accept="image/*"
            onChange={(files) => selectFile(files[0])}
            disabled={disabled || isUploading}
          >
            <button
              type="button"
              disabled={disabled || isUploading}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-colors
                ${disabled || isUploading 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-button-bg text-text-secondary hover:bg-button-bg-hover cursor-pointer'
                }`}
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-text-secondary border-t-transparent" />
                  Uploading...
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4" />
                  Add Image
                </>
              )}
            </button>
          </FileInput>
          
          {/* Upload progress */}
          {isUploading && uploadProgress > 0 && uploadProgress < 100 && (
            <div className="mt-2">
              <UploadProgress 
                percent={uploadProgress} 
                height={2}
                showLabel={false}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="relative inline-block">
          <ImagePreview
            src={displayPreview}
            alt="Upload preview"
            shape="square"
            size="auto"
            className="h-auto rounded-lg object-contain bg-gray-50 max-h-[120px] w-auto"
          />
          <div className="absolute -top-2 -right-2">
            <RemoveButton
              onClick={handleRemove}
              size="sm"
              variant="circle"
            />
          </div>
        </div>
      )}
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}