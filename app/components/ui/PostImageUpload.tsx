'use client';

import React, { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

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
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(imageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Get image dimensions
      const img = new Image();
      const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
        img.onload = () => {
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.src = URL.createObjectURL(file);
      });

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('post-images')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(data.path);

      onImageUpload(publicUrl, dimensions.width, dimensions.height);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onImageRemove();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {!preview ? (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={disabled || uploading}
            className="hidden"
            id="post-image-upload"
          />
          <label
            htmlFor="post-image-upload"
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-colors cursor-pointer
              ${disabled || uploading 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-button-bg text-text-secondary hover:bg-button-bg-hover'
              }`}
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-text-secondary border-t-transparent" />
                Uploading...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Add Image
              </>
            )}
          </label>
        </div>
      ) : (
        <div className="relative inline-block">
          <img 
            src={preview} 
            alt="Upload preview" 
            className="h-auto rounded-lg object-contain bg-gray-50"
            style={{ maxHeight: '120px', width: 'auto' }}
          />
          <button
            onClick={handleRemove}
            disabled={disabled}
            className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors shadow-lg"
          >
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}