import { useCallback } from 'react';

interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

interface UseImageDimensionsReturn {
  calculateDimensions: (file: File) => Promise<ImageDimensions>;
  getDimensionsFromUrl: (url: string) => Promise<ImageDimensions>;
}

export function useImageDimensions(): UseImageDimensionsReturn {
  const calculateDimensions = useCallback((file: File): Promise<ImageDimensions> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          resolve({
            width: img.width,
            height: img.height,
            aspectRatio: img.width / img.height
          });
        };
        
        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };
        
        img.src = e.target?.result as string;
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  }, []);

  const getDimensionsFromUrl = useCallback((url: string): Promise<ImageDimensions> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          aspectRatio: img.width / img.height
        });
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image from URL'));
      };
      
      img.src = url;
    });
  }, []);

  return {
    calculateDimensions,
    getDimensionsFromUrl
  };
}