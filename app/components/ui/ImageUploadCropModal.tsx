'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

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
  const [imageUrl, setImageUrl] = useState<string | null>(currentImageUrl || null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const cropAreaRef = useRef<HTMLDivElement>(null);

  // Load image and calculate initial scale
  useEffect(() => {
    if (!isOpen || !imageUrl) return;

    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
      
      // Calculate initial scale to fill the crop area
      const cropSize = 300; // Size of the crop area in the modal
      const minScale = Math.max(cropSize / img.width, cropSize / img.height);
      setScale(minScale * 1.2); // Add 20% padding
      setPosition({ x: 0, y: 0 });
    };
    img.src = imageUrl;
  }, [isOpen, imageUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageUrl) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    // Calculate bounds to prevent image from going outside crop area
    if (imageRef.current && cropAreaRef.current) {
      const imgRect = imageRef.current.getBoundingClientRect();
      const cropRect = cropAreaRef.current.getBoundingClientRect();
      
      const maxX = (imgRect.width - cropRect.width) / 2;
      const maxY = (imgRect.height - cropRect.height) / 2;
      
      setPosition({
        x: Math.max(-maxX, Math.min(maxX, newX)),
        y: Math.max(-maxY, Math.min(maxY, newY))
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!imageUrl) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y
    });
    e.preventDefault();
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || e.touches.length === 0) return;

    const touch = e.touches[0];
    const newX = touch.clientX - dragStart.x;
    const newY = touch.clientY - dragStart.y;

    if (imageRef.current && cropAreaRef.current) {
      const imgRect = imageRef.current.getBoundingClientRect();
      const cropRect = cropAreaRef.current.getBoundingClientRect();
      
      const maxX = (imgRect.width - cropRect.width) / 2;
      const maxY = (imgRect.height - cropRect.height) / 2;
      
      setPosition({
        x: Math.max(-maxX, Math.min(maxX, newX)),
        y: Math.max(-maxY, Math.min(maxY, newY))
      });
    }
  }, [isDragging, dragStart]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  const handleSave = () => {
    if (!canvasRef.current || !imageUrl) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = outputSize;
    canvas.height = outputSize;

    // Clear canvas
    ctx.clearRect(0, 0, outputSize, outputSize);

    // Create clipping path for circle
    if (shape === 'circle') {
      ctx.beginPath();
      ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
      ctx.clip();
    }

    // Load and draw image
    const img = new Image();
    img.onload = () => {
      const cropSize = 300; // Size of the crop area in modal
      const scaleFactor = outputSize / cropSize;
      
      const drawWidth = imageSize.width * scale * scaleFactor;
      const drawHeight = imageSize.height * scale * scaleFactor;
      
      const x = (outputSize - drawWidth) / 2 + position.x * scaleFactor;
      const y = (outputSize - drawHeight) / 2 + position.y * scaleFactor;

      ctx.drawImage(img, x, y, drawWidth, drawHeight);

      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'avatar.png', { type: 'image/png' });
          onSave(file);
          onClose();
        }
      }, 'image/png', 0.9);
    };
    img.src = imageUrl;
  };

  const handleRemoveImage = () => {
    setImageUrl(null);
    setScale(1);
    setPosition({ x: 0, y: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  const minScale = 0.1;
  const maxScale = 3;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-card-bg rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-light flex items-center justify-between">
          <h2 className="text-xl font-semibold text-text-primary">
            {imageUrl ? 'Crop Image' : 'Upload Avatar'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-button-bg rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 bg-background">
          {!imageUrl ? (
            // Upload state
            <div className="text-center">
              <div 
                className="mx-auto w-64 h-64 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Click to upload image</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">PNG, JPG up to 5MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            // Crop state
            <>
              <div className="relative mx-auto" style={{ width: '300px', height: '300px' }}>
                {/* Background */}
                <div className="absolute inset-0 bg-black/20 rounded-lg overflow-hidden">
                  {/* Image container */}
                  <div 
                    ref={containerRef}
                    className="relative w-full h-full overflow-hidden cursor-move"
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                  >
                    <img 
                      ref={imageRef}
                      src={imageUrl}
                      alt="Crop preview"
                      className="absolute top-1/2 left-1/2"
                      style={{
                        transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        transformOrigin: 'center',
                        maxWidth: 'none',
                        userSelect: 'none',
                        pointerEvents: 'none',
                        touchAction: 'none'
                      }}
                      draggable={false}
                    />
                  </div>
                </div>

                {/* Crop overlay - using mask instead of box-shadow */}
                <div 
                  ref={cropAreaRef}
                  className="absolute inset-0 pointer-events-none"
                >
                  {/* Dark overlay with hole */}
                  <svg className="absolute inset-0 w-full h-full">
                    <defs>
                      <mask id="crop-mask">
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        {shape === 'circle' ? (
                          <circle cx="150" cy="150" r="150" fill="black" />
                        ) : (
                          <rect x="0" y="0" width="300" height="300" rx="8" fill="black" />
                        )}
                      </mask>
                    </defs>
                    <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.5)" mask="url(#crop-mask)" />
                  </svg>
                  
                  {/* Crop area border */}
                  <div className={`absolute inset-0 border-2 border-white/50 ${
                    shape === 'circle' ? 'rounded-full' : 'rounded-lg'
                  }`} />
                </div>

                {/* Grid lines */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-x-0 top-1/3 h-px bg-white/20" />
                  <div className="absolute inset-x-0 top-2/3 h-px bg-white/20" />
                  <div className="absolute inset-y-0 left-1/3 w-px bg-white/20" />
                  <div className="absolute inset-y-0 left-2/3 w-px bg-white/20" />
                </div>
              </div>

              {/* Change image button */}
              <div className="mt-4 text-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-primary hover:text-primary-hover transition-colors"
                >
                  Choose different image
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </>
          )}
        </div>

        {/* Controls */}
        {imageUrl && (
          <div className="px-6 py-4 space-y-4">
            {/* Zoom slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-text-secondary">Zoom</label>
                <span className="text-sm text-text-muted">{Math.round(scale * 100)}%</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setScale(Math.max(minScale, scale - 0.1))}
                  className="p-1.5 hover:bg-button-bg rounded transition-colors"
                >
                  <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <input
                  type="range"
                  min={minScale}
                  max={maxScale}
                  step="0.01"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  style={{
                    background: `linear-gradient(to right, #4F46E5 0%, #4F46E5 ${((scale - minScale) / (maxScale - minScale)) * 100}%, #E5E7EB ${((scale - minScale) / (maxScale - minScale)) * 100}%, #E5E7EB 100%)`
                  }}
                />
                <button
                  onClick={() => setScale(Math.min(maxScale, scale + 0.1))}
                  className="p-1.5 hover:bg-button-bg rounded transition-colors"
                >
                  <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
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
                  onClick={onClose}
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

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}