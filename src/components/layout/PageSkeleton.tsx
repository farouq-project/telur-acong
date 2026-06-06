import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {/* Fixed header placeholder */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-40" />
      <div className="px-4 py-4 space-y-3">
        {/* Search bar placeholder */}
        <Skeleton className="h-11 w-full rounded-lg" />
        {/* Row skeletons */}
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </>
  );
}

export function DashboardSkeleton() {
  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-40" />
      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </>
  );
}
