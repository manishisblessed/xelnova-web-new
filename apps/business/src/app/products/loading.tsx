export default function Loading() {
  return (
    <div className="min-h-screen bg-surface-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-800" />
          <div className="mt-2 h-4 w-32 animate-pulse rounded-lg bg-surface-800" />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-2xl bg-surface-800" />
          ))}
        </div>
      </div>
    </div>
  );
}
