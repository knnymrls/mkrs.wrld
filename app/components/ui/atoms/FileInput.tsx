import React, { useRef } from 'react';

interface FileInputProps {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  onChange: (files: FileList) => void;
  className?: string;
  children?: React.ReactNode;
}

export default function FileInput({
  accept = 'image/*',
  multiple = false,
  disabled = false,
  onChange,
  className,
  children
}: FileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onChange(e.target.files);
      // Reset input to allow selecting the same file again
      e.target.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />
      {children ? (
        <div onClick={handleClick} className={className}>
          {children}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled}
          className={className || "px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"}
        >
          Choose File{multiple ? 's' : ''}
        </button>
      )}
    </>
  );
}