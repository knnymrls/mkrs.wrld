import { useState, useCallback, useRef } from 'react';

interface Position {
  x: number;
  y: number;
}

interface UseImageCropperOptions {
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  outputSize?: number;
  cropShape?: 'circle' | 'square';
}

interface UseImageCropperReturn {
  zoom: number;
  position: Position;
  isDragging: boolean;
  cropperProps: {
    zoom: number;
    position: Position;
    onZoomChange: (zoom: number) => void;
    onPositionChange: (position: Position) => void;
  };
  setZoom: (zoom: number) => void;
  setPosition: (position: Position) => void;
  resetCrop: () => void;
  getCroppedImage: (imageSrc: string) => Promise<Blob>;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
}

export function useImageCropper(options: UseImageCropperOptions = {}): UseImageCropperReturn {
  const {
    initialZoom = 1,
    minZoom = 0.1,
    maxZoom = 3,
    outputSize = 256,
    cropShape = 'circle'
  } = options;

  const [zoom, setZoom] = useState(initialZoom);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<Position>({ x: 0, y: 0 });
  const lastPosition = useRef<Position>({ x: 0, y: 0 });

  const resetCrop = useCallback(() => {
    setZoom(initialZoom);
    setPosition({ x: 0, y: 0 });
  }, [initialZoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    lastPosition.current = position;
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStart.current.x;
    const deltaY = e.clientY - dragStart.current.y;
    
    setPosition({
      x: lastPosition.current.x + deltaX,
      y: lastPosition.current.y + deltaY
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    setIsDragging(true);
    dragStart.current = { x: touch.clientX, y: touch.clientY };
    lastPosition.current = position;
  }, [position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStart.current.x;
    const deltaY = touch.clientY - dragStart.current.y;
    
    setPosition({
      x: lastPosition.current.x + deltaX,
      y: lastPosition.current.y + deltaY
    });
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const getCroppedImage = useCallback(async (imageSrc: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        canvas.width = outputSize;
        canvas.height = outputSize;

        // Calculate scaled dimensions
        const scaledWidth = image.width * zoom;
        const scaledHeight = image.height * zoom;

        // Calculate source coordinates
        const sourceX = (image.width - image.width / zoom) / 2 - position.x / zoom;
        const sourceY = (image.height - image.height / zoom) / 2 - position.y / zoom;
        const sourceWidth = image.width / zoom;
        const sourceHeight = image.height / zoom;

        // Fill background
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(0, 0, outputSize, outputSize);

        // Apply crop shape
        if (cropShape === 'circle') {
          ctx.beginPath();
          ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, 2 * Math.PI);
          ctx.closePath();
          ctx.clip();
        }

        // Draw image
        ctx.drawImage(
          image,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          outputSize,
          outputSize
        );

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, 'image/png');
      };

      image.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      image.src = imageSrc;
    });
  }, [zoom, position, outputSize, cropShape]);

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(Math.max(minZoom, Math.min(maxZoom, newZoom)));
  }, [minZoom, maxZoom]);

  return {
    zoom,
    position,
    isDragging,
    cropperProps: {
      zoom,
      position,
      onZoomChange: handleZoomChange,
      onPositionChange: setPosition
    },
    setZoom: handleZoomChange,
    setPosition,
    resetCrop,
    getCroppedImage,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
}