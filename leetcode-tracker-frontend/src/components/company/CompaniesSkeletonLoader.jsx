import Card from '../ui/Card';

/**
 * CompaniesSkeletonLoader component
 * Displays skeleton loading state for companies grid
 * Prevents layout shift by matching final content dimensions
 * 
 * Requirements: 3.2, 7.5
 */
const CompaniesSkeletonLoader = ({ count = 12 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="p-6 h-full">
          {/* Company icon and name skeleton */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 flex-1">
              {/* Icon skeleton */}
              <div className="w-12 h-12 rounded-lg bg-gray-800 animate-pulse" />
              
              {/* Name and count skeleton */}
              <div className="flex-1">
                <div className="h-5 bg-gray-800 rounded animate-pulse mb-2 w-3/4" />
                <div className="h-4 bg-gray-800 rounded animate-pulse w-1/2" />
              </div>
            </div>
            
            {/* Arrow skeleton */}
            <div className="w-4 h-4 bg-gray-800 rounded animate-pulse" />
          </div>

          {/* Badges skeleton */}
          <div className="flex flex-wrap gap-2 mt-4">
            <div className="h-6 w-20 bg-gray-800 rounded-full animate-pulse" />
            <div className="h-6 w-16 bg-gray-800 rounded-full animate-pulse" />
          </div>
        </Card>
      ))}
    </div>
  );
};

export default CompaniesSkeletonLoader;
