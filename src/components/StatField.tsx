import { SPACE, TYPE } from "@/lib/theme";

export function StatField({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <div className={TYPE.statLabel}>{label}</div>
      <div className={`${SPACE.stat} ${TYPE.statValue} ${tone ?? ""} truncate`}>{value}</div>
    </div>
  );
}
