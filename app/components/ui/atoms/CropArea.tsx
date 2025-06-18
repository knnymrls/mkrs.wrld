import React from 'react';

interface Position {
  x: number;
  y: number;
}

interface CropAreaProps {
  image: string;
  zoom: number;
  position: Position;
  cropShape?: 'circle' | 'square';
  cropSize?: number;
  showGrid?: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseMove?: (e: React.MouseEvent) => void;
  onMouseUp?: () => void;
  onMouseLeave?: () => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchMove?: (e: React.TouchEvent) => void;
  onTouchEnd?: () => void;
  className?: string;
}

export default function CropArea({
  image,
  zoom,
  position,
  cropShape = 'circle',
  cropSize = 256,
  showGrid = true,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  className = ''
}: CropAreaProps) {
  const maskId = `mask-${Date.now()}`;

  return (
    <div
      className={`relative overflow-hidden bg-gray-100 ${className}`}
      style={{ width: cropSize, height: cropSize }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Crop area with mask */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={cropSize}
        height={cropSize}
        style={{ zIndex: 2 }}
      >
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width={cropSize} height={cropSize} fill="white" />
            {cropShape === 'circle' ? (
              <circle
                cx={cropSize / 2}
                cy={cropSize / 2}
                r={cropSize / 2}
                fill="black"
              />
            ) : (
              <rect
                x="0"
                y="0"
                width={cropSize}
                height={cropSize}
                fill="black"
                rx="8"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width={cropSize}
          height={cropSize}
          fill="rgba(0, 0, 0, 0.5)"
          mask={`url(#${maskId})`}
        />
      </svg>

      {/* Image */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
          transformOrigin: 'center',
          cursor: 'move'
        }}
      >
        <img
          src={image}
          alt="Crop"
          className="max-w-none"
          style={{
            width: cropSize,
            height: cropSize,
            objectFit: 'cover'
          }}
          draggable={false}
        />
      </div>

      {/* Grid overlay */}
      {showGrid && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 3 }}>
          <div className="w-full h-full grid grid-cols-3 grid-rows-3">
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                className="border border-white/20"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}