export function PageSkeleton() {
  return (
    <div className="p-4 md:p-8 lg:p-8 space-y-6 min-h-full font-sans animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 mb-4 gap-4">
        <div className="space-y-3 w-full max-w-sm">
          <div className="h-4 w-32 bg-slate-200 rounded-md" />
          <div className="h-8 w-64 bg-slate-200 rounded-xl" />
        </div>
        <div className="h-10 w-32 bg-slate-200 rounded-xl" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-slate-100 rounded-2xl border border-slate-200/50" />
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="h-[400px] bg-slate-100 rounded-2xl border border-slate-200/50 p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center mb-4">
          <div className="h-6 w-48 bg-slate-200 rounded-lg" />
          <div className="h-8 w-64 bg-slate-200 rounded-xl" />
        </div>
        <div className="flex-1 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 w-full bg-slate-200/60 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
