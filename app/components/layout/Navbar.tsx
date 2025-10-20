"use client";

interface NavbarProps {
  onCreatePost?: () => void;
  onTagChange?: (tag: string | null) => void;
  selectedTag?: string | null;
}

export default function Navbar({ onCreatePost, onTagChange, selectedTag }: NavbarProps) {
  const tags = [
    { value: null, label: 'All posts' },
    { value: 'ask', label: '#ask' },
    { value: 'help', label: '#help' },
    { value: 'announcement', label: '#announcement' },
    { value: 'discussion', label: '#discussion' },
    { value: 'showcase', label: '#showcase' }
  ];

  return (
    <div className="h-20 bg-surface flex items-center justify-between">
      {/* Left: Tag filters */}
      <div className="flex items-center gap-6">
        {tags.map((tag) => (
          <button
            key={tag.value || 'all'}
            type="button"
            onClick={() => onTagChange?.(tag.value)}
            className={`text-lg transition-colors ${
              selectedTag === tag.value
                ? "text-onsurface-primary font-medium"
                : "text-onsurface-secondary font-normal"
            }`}
          >
            {tag.label}
          </button>
        ))}
      </div>

      {/* Right: Create Post */}
      <button
        type="button"
        onClick={onCreatePost}
        className="bg-onsurface-primary text-surface-container px-3.5 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Create a post
      </button>
    </div>
  );
}
