import React from 'react';

interface UploadProgressProps {
  percent: number;
  showLabel?: boolean;
  className?: string;
  height?: number;
  color?: string;
}

export default function UploadProgress({
  percent,
  showLabel = true,
  className = '',
  height = 4,
  color = 'bg-blue-500'
}: UploadProgressProps) {
  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Uploading...</span>
          <span>{Math.round(percent)}%</span>
        </div>
      )}
      <div 
        className="w-full bg-gray-200 rounded-full overflow-hidden"
        style={{ height: `${height}px` }}
      >
        <div
          className={`h-full ${color} transition-all duration-300 ease-out`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}