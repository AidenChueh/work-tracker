import { RADIUS, SPACE, SURFACE } from "@/lib/theme";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-800 rounded-lg ${className}`} />;
}

export function CardSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className={`${SURFACE.card} ${RADIUS.card} ${SPACE.card}`}>
      <Skeleton className="h-4 w-1/3" />
      <div className="mt-3 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={`h-3 ${i % 2 === 0 ? "w-full" : "w-2/3"}`} />
        ))}
      </div>
    </div>
  );
}

// 每頁 loading 用同一個骨架：標題列 + N 張卡，避免出現空白畫面
export function PageSkeleton({ cards = 3, lines = 2 }: { cards?: number; lines?: number }) {
  return (
    <main className="bg-gray-950 text-white">
      <div className={`max-w-md mx-auto ${SPACE.page}`}>
        <div className={`flex items-center justify-between ${SPACE.afterHeader}`}>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: cards }).map((_, i) => (
            <CardSkeleton key={i} lines={lines} />
          ))}
        </div>
      </div>
    </main>
  );
}
