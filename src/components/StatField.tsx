import type { ReactNode } from "react";
import { SPACE, TYPE } from "@/lib/theme";

export function StatField({ label, value, icon, tone, size = "sm" }: {
  label: string;
  value: string;
  icon?: ReactNode;
  tone?: string;
  size?: "sm" | "md";
}) {
  const labelType = size === "md" ? TYPE.cardSubLabel : TYPE.statLabel;
  const valueType = size === "md" ? TYPE.cardSubValue : TYPE.statValue;
  return (
    <div className="min-w-0">
      <div className={`flex items-center gap-1 ${labelType}`}>
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className={`${SPACE.stat} ${valueType} ${tone ?? ""} truncate`}>{value}</div>
    </div>
  );
}
