import { useState, useCallback } from 'react';

interface UseFileUploadOptions {
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  onError?: (error: string) => void;
}

interface UseFileUploadReturn {
  file: File | null;
  files: File[];
  preview: string | null;
  previews: string[];
  error: string | null;
  isLoading: boolean;
  selectFile: (file: File | FileList) => void;
  removeFile: (index?: number) => void;
  clearAll: () => void;
}

export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const {
    accept = 'image/*',
    maxSize = 5 * 1024 * 1024, // 5MB default
    multiple = false,
    onError
  } = options;

  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validateFile = useCallback((file: File): boolean => {
    // Check file type
    if (accept && !file.type.match(accept.replace('*', '.*'))) {
      const errorMsg = 'Please select a valid file type';
      setError(errorMsg);
      onError?.(errorMsg);
      return false;
    }

    // Check file size
    if (maxSize && file.size > maxSize) {
      const errorMsg = `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`;
      setError(errorMsg);
      onError?.(errorMsg);
      return false;
    }

    setError(null);
    return true;
  }, [accept, maxSize, onError]);

  const createPreview = useCallback((file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const selectFile = useCallback(async (input: File | FileList) => {
    setIsLoading(true);
    
    try {
      if (input instanceof FileList) {
        if (!multiple && input.length > 0) {
          // Single file mode
          const file = input[0];
          if (validateFile(file)) {
            setFile(file);
            const preview = await createPreview(file);
            setPreview(preview);
          }
        } else if (multiple) {
          // Multiple files mode
          const validFiles: File[] = [];
          const newPreviews: string[] = [];
          
          for (let i = 0; i < input.length; i++) {
            const file = input[i];
            if (validateFile(file)) {
              validFiles.push(file);
              const preview = await createPreview(file);
              newPreviews.push(preview);
            }
          }
          
          setFiles(prev => [...prev, ...validFiles]);
          setPreviews(prev => [...prev, ...newPreviews]);
        }
      } else {
        // Single File object
        if (validateFile(input)) {
          if (multiple) {
            setFiles(prev => [...prev, input]);
            const preview = await createPreview(input);
            setPreviews(prev => [...prev, preview]);
          } else {
            setFile(input);
            const preview = await createPreview(input);
            setPreview(preview);
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [multiple, validateFile, createPreview]);

  const removeFile = useCallback((index?: number) => {
    if (multiple && typeof index === 'number') {
      setFiles(prev => prev.filter((_, i) => i !== index));
      setPreviews(prev => prev.filter((_, i) => i !== index));
    } else {
      // Single file mode or clear all
      setFile(null);
      setPreview(null);
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    }
    setError(null);
  }, [multiple, preview]);

  const clearAll = useCallback(() => {
    setFile(null);
    setFiles([]);
    setPreview(null);
    setPreviews([]);
    setError(null);
    
    // Clean up previews
    if (preview) URL.revokeObjectURL(preview);
    previews.forEach(p => URL.revokeObjectURL(p));
  }, [preview, previews]);

  return {
    file,
    files,
    preview,
    previews,
    error,
    isLoading,
    selectFile,
    removeFile,
    clearAll
  };
}