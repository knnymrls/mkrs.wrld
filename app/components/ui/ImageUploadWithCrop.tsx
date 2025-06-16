'use client';

import React, { useState } from 'react';
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
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [showModal, setShowModal] = useState(false);

  const handleSave = (croppedFile: File) => {
    // Create preview of cropped image
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(croppedFile);
    
    onImageSelected(croppedFile);
  };

  const handleRemove = () => {
    setPreview(null);
    onImageRemoved?.();
  };

  const shapeClasses = shape === 'circle' ? 'rounded-full' : 'rounded-lg';

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        <div 
          className={`relative w-32 h-32 bg-gray-100 dark:bg-gray-800 ${shapeClasses} overflow-hidden cursor-pointer group`}
          onClick={() => setShowModal(true)}
        >
          {preview ? (
            <>
              <img 
                src={preview} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 group-hover:text-gray-500 transition-colors">
              <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs">Click to upload</span>
            </div>
          )}
        </div>

        {preview && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
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
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        currentImageUrl={preview}
        shape={shape}
      />
    </>
  );
}