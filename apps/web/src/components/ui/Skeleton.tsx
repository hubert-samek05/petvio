'use client';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`pv-skeleton ${className}`} />;
}

/** Szkielet karty statystycznej */
export function StatCardSkeleton() {
  return (
    <div className="pv-card p-5">
      <Skeleton className="w-11 h-11 mb-4 rounded-2xl" />
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}

/** Szkielet wiersza listy (awatar + 2 linie tekstu) */
export function ListRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4">
      <Skeleton className="w-12 h-12 rounded-2xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="w-10 h-10 rounded-full" />
    </div>
  );
}

/** Szkielet kafelka */
export function TileSkeleton() {
  return (
    <div className="pv-tile">
      <Skeleton className="w-12 h-12 rounded-2xl" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}
