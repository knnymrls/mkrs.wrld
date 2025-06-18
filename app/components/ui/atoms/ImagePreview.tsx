import React from 'react';

interface ImagePreviewProps {
  src: string | null;
  alt?: string;
  shape?: 'circle' | 'square';
  size?: number | string;
  className?: string;
  onClick?: () => void;
  showHoverOverlay?: boolean;
  overlayContent?: React.ReactNode;
}

export default function ImagePreview({
  src,
  alt = 'Preview',
  shape = 'square',
  size = 128,
  className = '',
  onClick,
  showHoverOverlay = false,
  overlayContent
}: ImagePreviewProps) {
  if (!src) return null;

  const sizeStyle = typeof size === 'number' ? `${size}px` : size;
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-lg';

  return (
    <div
      className={`relative overflow-hidden ${shapeClass} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ width: sizeStyle, height: sizeStyle }}
      onClick={onClick}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
      />
      {showHoverOverlay && overlayContent && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          {overlayContent}
        </div>
      )}
    </div>
  );
}