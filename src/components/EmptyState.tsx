import type { ReactNode } from "react";
import { RADIUS, SURFACE, TYPE } from "@/lib/theme";

export function EmptyState({ icon, title, description, action, compact = false }: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`${SURFACE.card} ${RADIUS.card} text-center ${compact ? "px-5 py-7" : "px-6 py-10"}`}>
      <div className="flex justify-center text-gray-600">{icon}</div>
      <p className={`mt-3 ${TYPE.emptyTitle}`}>{title}</p>
      {description && <p className={`mt-1 ${TYPE.body} text-gray-500`}>{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
