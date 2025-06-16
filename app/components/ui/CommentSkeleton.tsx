export default function CommentSkeleton() {
  return (
    <div className="flex items-start gap-3 animate-pulse">
      {/* Avatar skeleton */}
      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0"></div>
      
      <div className="flex-1">
        {/* Comment bubble skeleton */}
        <div className="bg-gray-200 dark:bg-gray-700 rounded-lg px-3 py-2">
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-20 mb-1"></div>
          <div className="space-y-1">
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
          </div>
        </div>
        
        {/* Timestamp skeleton */}
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-16 mt-1"></div>
      </div>
    </div>
  );
}