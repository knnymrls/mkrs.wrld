'use client';

import React, { useState, useEffect } from 'react';
import { Upload, X } from 'lucide-react';
import { useFileUpload } from '@/app/hooks/useFileUpload';
import { useImageCropper } from '@/app/hooks/useImageCropper';
import { FileInput, CropArea, ZoomSlider } from './atoms';

interface ImageUploadCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (croppedImage: File) => void;
  currentImageUrl?: string | null;
  shape?: 'circle' | 'square';
  outputSize?: number;
}

export default function ImageUploadCropModal({
  isOpen,
  onClose,
  onSave,
  currentImageUrl,
  shape = 'circle',
  outputSize = 256
}: ImageUploadCropModalProps) {
  const [activeImage, setActiveImage] = useState<string | null>(currentImageUrl || null);
  
  const {
    file,
    preview,
    error,
    selectFile,
    removeFile
  } = useFileUpload({
    accept: 'image/*',
    maxSize: 5 * 1024 * 1024
  });

  const {
    zoom,
    position,
    cropperProps,
    getCroppedImage,
    resetCrop,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  } = useImageCropper({
    initialZoom: 1.2,
    minZoom: 0.1,
    maxZoom: 3,
    outputSize,
    cropShape: shape
  });

  // Update active image when new file is selected
  useEffect(() => {
    if (preview) {
      setActiveImage(preview);
      resetCrop();
    }
  }, [preview, resetCrop]);

  // Update active image when modal opens with existing image
  useEffect(() => {
    if (isOpen && currentImageUrl && !preview) {
      setActiveImage(currentImageUrl);
      resetCrop();
    }
  }, [isOpen, currentImageUrl, preview, resetCrop]);

  const handleSave = async () => {
    if (!activeImage) return;

    try {
      const blob = await getCroppedImage(activeImage);
      const file = new File([blob], 'avatar.png', { type: 'image/png' });
      onSave(file);
      handleClose();
    } catch (error) {
      // Handle error
    }
  };

  const handleClose = () => {
    removeFile();
    setActiveImage(null);
    resetCrop();
    onClose();
  };

  const handleRemoveImage = () => {
    removeFile();
    setActiveImage(null);
    resetCrop();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div 
        className="bg-card-bg rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-light flex items-center justify-between">
          <h2 className="text-xl font-semibold text-text-primary">
            {activeImage ? 'Crop Image' : 'Upload Avatar'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-button-bg rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 bg-background">
          {!activeImage ? (
            // Upload state
            <div className="text-center">
              <FileInput
                accept="image/*"
                onChange={(files) => selectFile(files[0])}
              >
                <div className="mx-auto w-64 h-64 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                  <Upload className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Click to upload image</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">PNG, JPG up to 5MB</p>
                </div>
              </FileInput>
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>
          ) : (
            // Crop state
            <>
              <div className="relative mx-auto" style={{ width: '300px', height: '300px' }}>
                <CropArea
                  image={activeImage}
                  zoom={zoom}
                  position={position}
                  cropShape={shape}
                  cropSize={300}
                  showGrid
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className="rounded-lg"
                />
              </div>

              {/* Change image button */}
              <div className="mt-4 text-center">
                <FileInput
                  accept="image/*"
                  onChange={(files) => selectFile(files[0])}
                >
                  <button
                    type="button"
                    className="text-sm text-primary hover:text-primary-hover transition-colors"
                  >
                    Choose different image
                  </button>
                </FileInput>
              </div>
            </>
          )}
        </div>

        {/* Controls */}
        {activeImage && (
          <div className="px-6 py-4 space-y-4">
            {/* Zoom slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-text-secondary">Zoom</label>
              </div>
              <ZoomSlider
                zoom={zoom}
                minZoom={0.1}
                maxZoom={3}
                onChange={cropperProps.onZoomChange}
                showButtons
                showLabel
              />
            </div>

            {/* Action buttons */}
            <div className="flex justify-between">
              <button
                onClick={handleRemoveImage}
                className="px-5 py-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
              >
                Remove Image
              </button>
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="px-5 py-2 text-sm font-medium text-text-secondary bg-button-bg hover:bg-button-bg-hover rounded-full transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-full transition-colors"
                >
                  Save Image
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}