export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* KPI Skeleton Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border border-slate-200 shadow-none p-5">
            <div className="h-2.5 bg-slate-200 rounded w-3/4 mb-3" />
            <div className="h-7 bg-slate-200 rounded w-1/2" />
          </div>
        ))}
      </div>

      {/* Calendar + Announcements Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-2 rounded-lg border border-slate-200 overflow-hidden">
          {/* Calendar header */}
          <div className="px-6 py-3 border-b flex items-center gap-2">
            <div className="h-8 w-8 bg-slate-200 rounded" />
            <div className="h-5 bg-slate-200 rounded w-24 mx-2" />
            <div className="h-8 w-8 bg-slate-200 rounded" />
          </div>
          {/* Weekday row */}
          <div className="grid grid-cols-7 border-b bg-slate-50">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="py-3 flex flex-col items-center gap-1">
                <div className="h-2 w-5 bg-slate-200 rounded" />
                <div className="h-5 w-6 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
          {/* Session list */}
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex rounded-sm border border-slate-200 overflow-hidden">
                <div className="w-24 bg-slate-100 py-8" />
                <div className="flex-1 p-4 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Announcements Skeleton */}
        <div className="col-span-1 rounded-lg border border-slate-200 p-5 space-y-4">
          <div className="h-5 bg-slate-200 rounded w-1/3" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2 pb-3 border-b border-slate-100">
              <div className="h-3 bg-slate-200 rounded w-full" />
              <div className="h-3 bg-slate-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
