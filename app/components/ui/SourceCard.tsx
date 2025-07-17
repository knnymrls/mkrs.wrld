import Link from 'next/link';

interface Source {
  type: 'profile' | 'project' | 'post' | 'project_request';
  id: string;
  name?: string;
  title?: string;
  description?: string;
  preview?: string;
  author?: string;
  relevanceScore: number;
}

interface SourceCardProps {
  source: Source;
}

export default function SourceCard({ source }: SourceCardProps) {
  const getIcon = () => {
    switch (source.type) {
      case 'profile':
        return '👤';
      case 'project':
        return '📁';
      case 'post':
        return '📝';
      case 'project_request':
        return '💼';
    }
  };

  const getLink = () => {
    switch (source.type) {
      case 'profile':
        return `/profile/${source.id}`;
      case 'project':
        return `/projects/${source.id}`;
      case 'post':
        // For now, posts don't have individual pages
        return '#';
      case 'project_request':
        return `/project-requests/${source.id}`;
    }
  };

  const getContent = () => {
    switch (source.type) {
      case 'profile':
        return <span>{source.name}</span>;
      case 'project':
        return <span>{source.name}</span>;
      case 'post':
        return <span>Post by {source.author}</span>;
      case 'project_request':
        return <span>{source.title || source.name}</span>;
    }
  };

  const isClickable = source.type !== 'post';

  return (
    <Link
      href={getLink()}
      className={`
        inline-flex items-start gap-2 p-2 px-3 bg-gray-50 dark:bg-gray-800 rounded-md
        border border-gray-200 dark:border-gray-700 transition-all text-sm
        ${isClickable ? 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer' : 'cursor-default'}
      `}
      onClick={isClickable ? undefined : (e) => e.preventDefault()}
    >
      <span className="text-base">{getIcon()}</span>
      <div className="min-w-0">
        {getContent()}
      </div>
    </Link>
  );
}