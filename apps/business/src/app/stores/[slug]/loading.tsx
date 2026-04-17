export default function StoreLoading() {
  return (
    <div className="min-h-screen bg-surface-950">
      {/* Hero Skeleton */}
      <div className="h-48 sm:h-64 md:h-80 lg:h-96 animate-pulse bg-surface-800" />

      {/* Header Skeleton */}
      <div className="relative -mt-16 sm:-mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
            {/* Logo Skeleton */}
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-surface-700 animate-pulse" />
            
            {/* Info Skeleton */}
            <div className="flex-1 pb-2 space-y-3">
              <div className="h-8 w-48 rounded bg-surface-700 animate-pulse" />
              <div className="h-4 w-96 rounded bg-surface-700 animate-pulse" />
              <div className="flex gap-4">
                <div className="h-6 w-24 rounded bg-surface-700 animate-pulse" />
                <div className="h-6 w-24 rounded bg-surface-700 animate-pulse" />
                <div className="h-6 w-24 rounded bg-surface-700 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nav Skeleton */}
      <div className="mt-6 border-b border-surface-300/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-6 w-24 rounded bg-surface-700 animate-pulse" />
            ))}
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-surface-800 overflow-hidden">
              <div className="aspect-[4/5] bg-surface-700 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-full rounded bg-surface-700 animate-pulse" />
                <div className="h-4 w-2/3 rounded bg-surface-700 animate-pulse" />
                <div className="h-6 w-1/2 rounded bg-surface-700 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
