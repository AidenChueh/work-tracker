import type { ReactNode } from "react";
import { SPACE, TYPE } from "@/lib/theme";

export function StatField({ label, value, icon, tone }: {
  label: string;
  value: string;
  icon?: ReactNode;
  tone?: string;
}) {
  return (
    <div className="min-w-0">
      <div className={`flex items-center gap-1 ${TYPE.statLabel}`}>
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className={`${SPACE.stat} ${TYPE.statValue} ${tone ?? ""} truncate`}>{value}</div>
    </div>
  );
}
