import { Skeleton } from '@/components/ui/skeleton';

/** Full-page skeleton for dashboard loading states */
export const DashboardSkeleton = () => (
  <div className="space-y-6 p-4 md:p-6 lg:p-8 animate-in fade-in duration-300">
    {/* Header skeleton */}
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
    </div>

    {/* KPI row */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>

    {/* Content cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      ))}
    </div>
  </div>
);

/** List skeleton for action lists / command center */
export const ActionListSkeleton = () => (
  <div className="space-y-3 animate-in fade-in duration-300">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="bg-card rounded-xl border border-border p-4 flex items-start gap-3">
        <Skeleton className="h-5 w-5 rounded mt-0.5" />
        <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-6 w-full rounded" />
        </div>
        <div className="flex gap-1.5">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
    ))}
  </div>
);

/** Volunteer dashboard card skeleton */
export const VolunteerCardsSkeleton = () => (
  <div className="space-y-4 animate-in fade-in duration-300">
    {/* Profile header */}
    <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
      <Skeleton className="h-16 w-16 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>

    {/* Task cards */}
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    ))}
  </div>
);
