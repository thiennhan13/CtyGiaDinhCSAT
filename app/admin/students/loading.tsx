export default function StudentsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="h-8 bg-slate-200 rounded w-48 mb-2" />
          <div className="h-4 bg-slate-200 rounded w-32" />
        </div>
        <div className="h-9 bg-slate-200 rounded w-32 shrink-0" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border border-slate-200 overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 border-b flex gap-4">
          <div className="h-9 bg-slate-200 rounded flex-1" />
          <div className="h-9 bg-slate-200 rounded w-40" />
          <div className="h-9 bg-slate-200 rounded w-48" />
        </div>

        {/* Table header */}
        <div className="bg-slate-50 grid grid-cols-4 gap-4 p-3 border-b">
          {['Họ tên', 'Liên hệ', 'Trạng thái', 'Hành động'].map(h => (
            <div key={h} className="h-3 bg-slate-200 rounded w-2/3" />
          ))}
        </div>

        {/* Table rows */}
        {[...Array(8)].map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4 p-4 border-b last:border-0">
            <div className="space-y-1.5">
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
            </div>
            <div className="h-4 bg-slate-200 rounded w-2/3" />
            <div className="h-5 bg-slate-200 rounded w-20" />
            <div className="flex justify-end gap-2">
              <div className="h-8 w-8 bg-slate-200 rounded" />
              <div className="h-8 w-8 bg-slate-200 rounded" />
              <div className="h-8 w-8 bg-slate-200 rounded" />
            </div>
          </div>
        ))}

        {/* Pagination */}
        <div className="p-4 border-t flex justify-between items-center">
          <div className="h-4 bg-slate-200 rounded w-48" />
          <div className="flex gap-2">
            <div className="h-8 w-16 bg-slate-200 rounded" />
            <div className="h-8 w-16 bg-slate-200 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
