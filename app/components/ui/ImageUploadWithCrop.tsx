'use client';

import React, { useState, useEffect } from 'react';
import { Camera } from 'lucide-react';
import { useFileUpload } from '@/app/hooks/useFileUpload';
import { FileInput, ImagePreview } from './atoms';
import ImageUploadCropModal from './ImageUploadCropModal';

interface ImageUploadWithCropProps {
  currentImageUrl?: string | null;
  onImageSelected: (file: File) => void;
  onImageRemoved?: () => void;
  label?: string;
  shape?: 'circle' | 'square';
}

export default function ImageUploadWithCrop({ 
  currentImageUrl, 
  onImageSelected, 
  onImageRemoved,
  label = "Upload Avatar",
  shape = 'circle'
}: ImageUploadWithCropProps) {
  const [showModal, setShowModal] = useState(false);
  const [displayPreview, setDisplayPreview] = useState<string | null>(currentImageUrl || null);
  const [isRemoved, setIsRemoved] = useState(false);
  
  const { 
    preview: selectedPreview,
    selectFile,
    removeFile 
  } = useFileUpload({
    accept: 'image/*',
    maxSize: 10 * 1024 * 1024 // 10MB for initial selection
  });

  // Update display preview when currentImageUrl changes
  useEffect(() => {
    if (currentImageUrl) {
      setDisplayPreview(currentImageUrl);
      setIsRemoved(false);
    }
  }, [currentImageUrl]);

  // Open modal when file is selected
  useEffect(() => {
    if (selectedPreview) {
      setShowModal(true);
    }
  }, [selectedPreview]);

  const handleSave = (croppedFile: File) => {
    // Create preview of cropped image
    const reader = new FileReader();
    reader.onloadend = () => {
      setDisplayPreview(reader.result as string);
      setIsRemoved(false);
    };
    reader.readAsDataURL(croppedFile);
    
    onImageSelected(croppedFile);
    removeFile(); // Clear the file selection
  };

  const handleRemove = () => {
    setDisplayPreview(null);
    setIsRemoved(true);
    removeFile();
    onImageRemoved?.();
  };

  const handleModalClose = () => {
    setShowModal(false);
    removeFile(); // Clear selection if modal is closed without saving
  };

  const shapeClasses = shape === 'circle' ? 'rounded-full' : 'rounded-lg';

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        <FileInput
          accept="image/*"
          onChange={(files) => selectFile(files[0])}
          className="w-32 h-32"
        >
          {displayPreview && !isRemoved ? (
            <ImagePreview
              src={displayPreview}
              alt="Avatar"
              shape={shape}
              size={128}
              onClick={() => {}}
              showHoverOverlay
              overlayContent={<Camera className="w-8 h-8 text-white" />}
              className="cursor-pointer"
            />
          ) : (
            <div className={`w-32 h-32 bg-gray-100 dark:bg-gray-800 ${shapeClasses} flex flex-col items-center justify-center text-gray-400 hover:text-gray-500 transition-colors cursor-pointer`}>
              <Camera className="w-12 h-12 mb-2" />
              <span className="text-xs">Click to upload</span>
            </div>
          )}
        </FileInput>

        {displayPreview && !isRemoved && (
          <button
            onClick={handleRemove}
            className="text-sm text-red-600 hover:text-red-700 transition-colors"
            type="button"
          >
            Remove {label}
          </button>
        )}
      </div>

      {/* Upload and Crop Modal */}
      <ImageUploadCropModal
        isOpen={showModal}
        onClose={handleModalClose}
        onSave={handleSave}
        currentImageUrl={selectedPreview || displayPreview}
        shape={shape}
      />
    </>
  );
}