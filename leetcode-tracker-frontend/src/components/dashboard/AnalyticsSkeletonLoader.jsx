import Card from '../ui/Card';

/**
 * AnalyticsSkeletonLoader component
 * Displays skeleton loading state for analytics page
 * Prevents layout shift by matching final content dimensions
 * 
 * Requirements: 4.2, 7.5
 */
const AnalyticsSkeletonLoader = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] p-8">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-10 bg-gray-800 rounded animate-pulse mb-2 w-64" />
        <div className="h-5 bg-gray-800 rounded animate-pulse w-96" />
      </div>

      {/* Grid of card skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Streak card skeleton */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="h-6 bg-gray-800 rounded animate-pulse mb-2 w-32" />
              <div className="h-4 bg-gray-800 rounded animate-pulse w-48" />
            </div>
            <div className="w-10 h-10 bg-gray-800 rounded-full animate-pulse" />
          </div>
          
          <div className="mb-4">
            <div className="h-14 bg-gray-800 rounded animate-pulse mb-2 w-40" />
            <div className="h-4 bg-gray-800 rounded animate-pulse w-48" />
          </div>

          <div className="mt-6">
            <div className="h-4 bg-gray-800 rounded animate-pulse mb-3 w-24" />
            <div className="grid grid-cols-10 gap-1.5">
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} className="aspect-square bg-gray-800 rounded-sm animate-pulse" />
              ))}
            </div>
          </div>
        </Card>

        {/* Difficulty breakdown skeleton */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="h-6 bg-gray-800 rounded animate-pulse mb-2 w-48" />
              <div className="h-4 bg-gray-800 rounded animate-pulse w-56" />
            </div>
            <div>
              <div className="h-8 bg-gray-800 rounded animate-pulse mb-1 w-12" />
              <div className="h-3 bg-gray-800 rounded animate-pulse w-12" />
            </div>
          </div>

          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-2">
                  <div className="h-4 bg-gray-800 rounded animate-pulse w-20" />
                  <div className="h-4 bg-gray-800 rounded animate-pulse w-12" />
                </div>
                <div className="h-3 bg-gray-800 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        </Card>

        {/* Calendar heatmap skeleton */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="h-6 bg-gray-800 rounded animate-pulse mb-2 w-40" />
              <div className="h-4 bg-gray-800 rounded animate-pulse w-56" />
            </div>
            <div className="w-8 h-8 bg-gray-800 rounded animate-pulse" />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-gray-800/50 rounded-lg p-3">
                <div className="h-8 bg-gray-800 rounded animate-pulse mb-1 w-16" />
                <div className="h-3 bg-gray-800 rounded animate-pulse w-20" />
              </div>
            ))}
          </div>

          <div>
            <div className="h-4 bg-gray-800 rounded animate-pulse mb-3 w-32" />
            <div className="grid grid-cols-10 gap-1.5">
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} className="aspect-square bg-gray-800 rounded-sm animate-pulse" />
              ))}
            </div>
          </div>
        </Card>

        {/* Weak topics skeleton */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="h-6 bg-gray-800 rounded animate-pulse mb-2 w-32" />
              <div className="h-4 bg-gray-800 rounded animate-pulse w-56" />
            </div>
            <div className="w-8 h-8 bg-gray-800 rounded animate-pulse" />
          </div>

          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-2">
                  <div className="h-4 bg-gray-800 rounded animate-pulse w-32" />
                  <div className="h-4 bg-gray-800 rounded animate-pulse w-16" />
                </div>
                <div className="h-2 bg-gray-800 rounded-full animate-pulse mb-2" />
                <div className="h-8 bg-gray-800 rounded animate-pulse w-full" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsSkeletonLoader;
