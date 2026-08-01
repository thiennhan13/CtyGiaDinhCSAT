export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* KPI Skeleton Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border border-border shadow-none overflow-hidden bg-card">
            <div className="p-5">
              <div className="h-9 w-9 bg-secondary rounded-lg mb-3" />
              <div className="h-2.5 bg-secondary rounded-lg w-3/4 mb-3" />
              <div className="h-7 bg-secondary rounded-lg w-1/2" />
            </div>
            <div className="h-1 bg-border" />
          </div>
        ))}
      </div>

      {/* Calendar + Announcements Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-2 rounded-lg border border-border overflow-hidden bg-card">
          {/* Calendar header */}
          <div className="px-6 py-3 border-b border-border flex items-center gap-2">
            <div className="h-8 w-8 bg-secondary rounded-lg" />
            <div className="h-5 bg-secondary rounded-lg w-24 mx-2" />
            <div className="h-8 w-8 bg-secondary rounded-lg" />
          </div>
          {/* Weekday row */}
          <div className="grid grid-cols-7 border-b border-border bg-secondary/50">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="py-3 flex flex-col items-center gap-1">
                <div className="h-2 w-5 bg-border rounded-full" />
                <div className="h-5 w-6 bg-border rounded-full" />
              </div>
            ))}
          </div>
          {/* Session list */}
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex rounded-lg border border-border overflow-hidden">
                <div className="w-24 bg-secondary py-8" />
                <div className="flex-1 p-4 space-y-2">
                  <div className="h-4 bg-secondary rounded-lg w-3/4" />
                  <div className="h-3 bg-secondary rounded-lg w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Announcements Skeleton */}
        <div className="col-span-1 rounded-lg border border-border p-5 space-y-4 bg-card">
          <div className="h-5 bg-secondary rounded-lg w-1/3" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2 pb-3 border-b border-border/60">
              <div className="h-3 bg-secondary rounded-lg w-full" />
              <div className="h-3 bg-secondary rounded-lg w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
