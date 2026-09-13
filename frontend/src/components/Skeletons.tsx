export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`glass rounded-2xl p-5 dark:bg-slate-900/60 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="skeleton h-10 w-10 rounded-xl" />
        <div className="skeleton h-4 w-12 rounded-full" />
      </div>
      <div className="skeleton mt-4 h-7 w-20 rounded-md" />
      <div className="skeleton mt-2 h-3 w-28 rounded-md" />
      <div className="skeleton mt-1 h-3 w-16 rounded-md" />
    </div>
  );
}

export function SkeletonChart({ height = 200 }: { height?: number }) {
  return (
    <div className="glass rounded-2xl p-5 dark:bg-slate-900/60">
      <div className="skeleton mb-4 h-5 w-40 rounded-md" />
      <div className="skeleton rounded-xl" style={{ height }} />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 border-b border-brand-50 py-3 dark:border-slate-800">
      <div className="skeleton h-7 w-7 rounded-full" />
      <div className="skeleton h-4 flex-1 rounded-md" />
      <div className="skeleton h-4 w-12 rounded-md" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-32 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <SkeletonChart />
        <SkeletonChart />
        <SkeletonChart />
      </div>
    </div>
  );
}

import { LogoSpinner } from "@/components/ui/LogoSpinner";

export function PageSkeleton() {
  return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
      <LogoSpinner size="lg" />
    </div>
  );
}
