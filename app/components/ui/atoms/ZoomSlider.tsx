import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface ZoomSliderProps {
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
  step?: number;
  onChange: (zoom: number) => void;
  showButtons?: boolean;
  showLabel?: boolean;
  className?: string;
}

export default function ZoomSlider({
  zoom,
  minZoom = 0.1,
  maxZoom = 3,
  step = 0.1,
  onChange,
  showButtons = true,
  showLabel = true,
  className = ''
}: ZoomSliderProps) {
  const percentage = Math.round(zoom * 100);

  const handleDecrease = () => {
    const newZoom = Math.max(minZoom, zoom - step);
    onChange(newZoom);
  };

  const handleIncrease = () => {
    const newZoom = Math.min(maxZoom, zoom + step);
    onChange(newZoom);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showButtons && (
        <button
          type="button"
          onClick={handleDecrease}
          className="p-1 rounded hover:bg-gray-100"
          disabled={zoom <= minZoom}
        >
          <Minus size={16} />
        </button>
      )}
      
      <div className="flex-1">
        <input
          type="range"
          min={minZoom}
          max={maxZoom}
          step={step}
          value={zoom}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      {showButtons && (
        <button
          type="button"
          onClick={handleIncrease}
          className="p-1 rounded hover:bg-gray-100"
          disabled={zoom >= maxZoom}
        >
          <Plus size={16} />
        </button>
      )}

      {showLabel && (
        <span className="text-sm text-gray-600 min-w-[3rem] text-right">
          {percentage}%
        </span>
      )}
    </div>
  );
}