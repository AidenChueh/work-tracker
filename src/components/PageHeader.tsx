import type { ReactNode } from "react";
import { SPACE, TYPE } from "@/lib/theme";

export function PageHeader({ title, subtitle, action }: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className={`flex items-start justify-between gap-3 ${SPACE.afterHeader}`}>
      <div className="min-w-0">
        <h1 className={`${TYPE.pageTitle} truncate`}>{title}</h1>
        {subtitle && <p className={`mt-0.5 ${TYPE.rowMeta}`}>{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 flex items-center gap-1.5">{action}</div>}
    </div>
  );
}
