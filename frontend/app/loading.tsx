/**
 * Loading State Component
 * Displays loading spinner/skeleton for property list
 */

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-4 bg-muted rounded w-48"></div>
      </div>

      {/* Property card skeletons */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-border p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="h-5 bg-muted rounded w-3/4"></div>
            <div className="h-5 bg-muted rounded w-16"></div>
          </div>
          <div className="h-4 bg-muted rounded w-1/2 mb-3"></div>
          <div className="h-6 bg-muted rounded w-32 mb-3"></div>
          <div className="flex gap-4">
            <div className="h-4 bg-muted rounded w-20"></div>
            <div className="h-4 bg-muted rounded w-20"></div>
          </div>
        </div>
      ))}

      {/* Pagination skeleton */}
      <div className="flex items-center justify-center gap-2 pt-6 border-t border-border">
        <div className="h-9 bg-muted rounded w-24"></div>
        <div className="h-9 bg-muted rounded w-10"></div>
        <div className="h-9 bg-muted rounded w-10"></div>
        <div className="h-9 bg-muted rounded w-10"></div>
        <div className="h-9 bg-muted rounded w-24"></div>
      </div>
    </div>
  );
}
