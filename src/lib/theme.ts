export type PeriodKind = "weekly" | "biweekly" | "monthly";

export const RADIUS = {
  card: "rounded-2xl",
  cell: "rounded-xl",
  chip: "rounded-lg",
  pill: "rounded-md",
} as const;

export const SURFACE = {
  card: "bg-gray-900 border border-gray-800",
  cardInset: "bg-gray-800/60",
  today: "bg-blue-500/10 ring-1 ring-inset ring-blue-500/40",
  selected: "bg-gray-800 ring-1 ring-blue-500",
  hover: "hover:bg-gray-800/70",
} as const;

export const TYPE = {
  monthTitle: "text-[17px] font-semibold tracking-tight",
  cardLabel: "text-[11px] font-medium text-gray-400",
  cardValue: "text-[26px] font-bold leading-none tabular-nums",
  cardMeta: "text-[11px] leading-tight text-gray-400 tabular-nums",
  weekday: "text-[11px] font-semibold tracking-wide",
  dayNum: "text-[13px] font-semibold leading-none tabular-nums",
  dayIncome: "text-[10px] font-semibold leading-none tabular-nums",
  dayEmpty: "text-[11px] leading-none text-gray-700",
  badgeLabel: "text-[8px] font-semibold leading-none tracking-wide opacity-80",
  badgeValue: "text-[10px] font-bold leading-none tabular-nums",
  legend: "text-[11px] text-gray-400",
} as const;

export const INCOME = {
  dot: "bg-emerald-400",
  pill: "bg-emerald-500/15 text-emerald-300",
  pillToday: "bg-emerald-500/20 text-emerald-200",
  text: "text-emerald-400",
} as const;

export const PERIOD: Record<PeriodKind, {
  selectedBg: string;
  faintBg: string;
  badge: string;
  ring: string;
  swatch: string;
}> = {
  weekly: {
    selectedBg: "bg-amber-500/20",
    faintBg: "bg-amber-500/5",
    badge: "bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25",
    ring: "ring-amber-400/60",
    swatch: "bg-amber-500/30 border-amber-500/50",
  },
  biweekly: {
    selectedBg: "bg-cyan-500/20",
    faintBg: "bg-cyan-500/5",
    badge: "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25",
    ring: "ring-cyan-400/60",
    swatch: "bg-cyan-500/30 border-cyan-500/50",
  },
  monthly: {
    selectedBg: "bg-purple-500/20",
    faintBg: "bg-purple-500/5",
    badge: "bg-purple-500/15 border-purple-500/40 text-purple-300 hover:bg-purple-500/25",
    ring: "ring-purple-400/60",
    swatch: "bg-purple-500/30 border-purple-500/50",
  },
};

export function money(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}
