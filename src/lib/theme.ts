export type PeriodKind = "weekly" | "biweekly" | "monthly";

export const RADIUS = {
  card: "rounded-2xl",
  cell: "rounded-xl",
  chip: "rounded-lg",
  pill: "rounded-md",
} as const;

export const SPACE = {
  page: "px-4 py-6",
  card: "px-4 py-4",
  afterHeader: "mb-6",
  afterCard: "mb-4",
  afterLegend: "mb-2",
  stat: "mt-1.5",
  cellGap: "gap-y-1.5",
} as const;

export const SURFACE = {
  card: "bg-gray-900 border border-gray-800 shadow-lg shadow-black/30",
  today: "bg-blue-500/15",
  selected: "bg-gray-800 ring-1 ring-blue-500",
  hover: "hover:bg-gray-800/70 active:bg-gray-800",
  navBtn: "hover:bg-gray-800 active:bg-gray-700 active:scale-95",
  segment: "bg-gray-800",
  segmentOn: "bg-gray-700 text-white shadow-sm shadow-black/20",
  segmentOff: "text-gray-500 hover:text-gray-300",
  divider: "border-t border-gray-800",
} as const;

export const TYPE = {
  monthTitle: "text-[17px] font-semibold leading-6 tracking-tight",
  cardLabel: "text-[11px] font-medium leading-4 text-gray-400",
  cardValue: "text-[28px] font-bold leading-8 tracking-tight tabular-nums",
  cardSubLabel: "text-[11px] font-medium leading-4 text-gray-500",
  cardSubValue: "text-[15px] font-semibold leading-5 tabular-nums",
  statLabel: "text-[10px] font-medium leading-4 text-gray-500",
  statValue: "text-[12px] font-semibold leading-4 tabular-nums text-gray-100",
  segment: "text-[11px] font-semibold leading-4",
  weekday: "text-[11px] font-semibold leading-4 tracking-wide",
  dayNum: "text-[13px] font-semibold leading-4 tabular-nums",
  dayIncome: "text-[10px] font-semibold leading-[14px] tabular-nums",
  dayEmpty: "text-[11px] leading-[14px] text-gray-700",
  badgeLabel: "text-[7px] font-medium leading-[9px] tracking-wide",
  badgeValue: "text-[9px] font-semibold leading-[11px] tabular-nums",
  legend: "text-[11px] leading-4 text-gray-400",
} as const;

export const INCOME = {
  dot: "bg-emerald-400",
  pill: "bg-emerald-500/15 text-emerald-300",
  pillToday: "bg-emerald-500/25 text-emerald-200",
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
    badge: "bg-amber-500/10 border-amber-500/20 text-amber-300/80 hover:bg-amber-500/20",
    ring: "ring-amber-400/50",
    swatch: "bg-amber-500/20 border-amber-500/35",
  },
  biweekly: {
    selectedBg: "bg-cyan-500/20",
    faintBg: "bg-cyan-500/5",
    badge: "bg-cyan-500/10 border-cyan-500/20 text-cyan-300/80 hover:bg-cyan-500/20",
    ring: "ring-cyan-400/50",
    swatch: "bg-cyan-500/20 border-cyan-500/35",
  },
  monthly: {
    selectedBg: "bg-purple-500/20",
    faintBg: "bg-purple-500/5",
    badge: "bg-purple-500/10 border-purple-500/20 text-purple-300/80 hover:bg-purple-500/20",
    ring: "ring-purple-400/50",
    swatch: "bg-purple-500/20 border-purple-500/35",
  },
};

export function money(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}
