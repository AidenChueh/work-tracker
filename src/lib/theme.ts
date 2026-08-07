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
  afterHeader: "mb-4",
  afterCard: "mb-4",
  afterLegend: "mb-2",
  stat: "mt-1.5",
  cellGap: "gap-y-1.5",
  group: "space-y-5",
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

// 語意色：所有頁面只用這裡的組合，不要在頁面裡寫死顏色
export const COLOR = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white",
  primaryText: "text-blue-400 hover:text-blue-300",
  success: "text-emerald-400",
  successSoft: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  warningSoft: "bg-amber-500/10 text-amber-300 border-amber-500/25",
  dangerText: "text-red-400",
  dangerSoft: "bg-red-500/15 text-red-200 border-red-500/30",
  infoSoft: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  neutralSoft: "bg-gray-700/60 text-gray-300 border-gray-600",
  muted: "text-gray-500",
  body: "text-gray-300",
} as const;

// icon 尺寸：xs 內文用、sm 欄位/badge、md 按鈕、lg Empty State
export const ICON = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-10 h-10",
} as const;

// 44×44 是 HIG 的最小點擊區，所有純 icon 按鈕都用這個
export const HIT = "w-11 h-11 flex items-center justify-center";

export const TYPE = {
  pageTitle: "text-xl font-semibold leading-7 tracking-tight",
  body: "text-[13px] leading-5",
  caption: "text-[11px] leading-4",
  emptyTitle: "text-[15px] font-semibold leading-5",
  sectionLabel: "text-[10px] font-semibold leading-4 tracking-wider text-gray-500 uppercase",
  control: "text-[13px] font-medium leading-5",
  rowTitle: "text-[15px] font-semibold leading-5 tracking-tight",
  rowMeta: "text-[11px] font-medium leading-4 text-gray-500",
  rowValue: "text-[13px] font-semibold leading-4 tabular-nums",
  badgeLabel: "text-[10px] font-semibold leading-4 tracking-wide",
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
  badgeValue: "text-[9px] font-semibold leading-[11px] tabular-nums",
  legend: "text-[11px] leading-4 text-gray-400",
} as const;

// 新增工作與編輯工作共用同一組 token，兩邊 UI 必須完全一致
export const FORM = {
  card: "bg-gray-800 border border-gray-700 rounded-2xl p-4",
  title: "text-[15px] font-semibold leading-5",
  sectionTitle: "text-[13px] font-semibold leading-5 text-gray-200",
  label: "text-[13px] font-medium leading-5 text-gray-400",
  input:
    "block w-full max-w-full min-w-0 h-11 bg-gray-700 border border-gray-600 rounded-xl px-3.5 text-[15px] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
  inputSm:
    "block w-full max-w-full min-w-0 h-9 bg-gray-700 border border-gray-600 rounded-lg px-3 text-[13px] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
  textarea:
    "block w-full max-w-full min-w-0 bg-gray-700 border border-gray-600 rounded-xl px-3.5 py-2.5 text-[15px] leading-5 text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
  // 原生 date/time input 的顯示外殼：真正的 input 疊在上面（透明），外殼只負責樣式
  inputShell:
    "flex items-center justify-between gap-2 w-full max-w-full min-w-0 h-11 bg-gray-700 border border-gray-600 rounded-xl px-3.5 text-[15px] text-white",
  inputError: "ring-2 ring-red-500 border-red-500",
  helper: "text-[11px] leading-4 text-gray-500",
  panel: "bg-gray-700/40 border border-gray-600 rounded-xl px-3.5 py-3",
  error: "text-[11px] leading-4 text-red-400",
  segment: "flex-1 h-9 rounded-lg text-[13px] font-medium transition-colors",
  segmentOn: "bg-blue-600 text-white",
  segmentOff: "bg-gray-700 text-gray-300 hover:bg-gray-600",
  btnPrimary:
    "h-11 rounded-xl bg-blue-600 text-white text-[15px] font-semibold hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 transition-all duration-150",
  btnSecondary:
    "h-11 rounded-xl bg-gray-700 text-gray-300 text-[15px] font-medium hover:bg-gray-600 active:scale-[0.98] disabled:opacity-50 transition-all duration-150",
  btnStop:
    "h-11 rounded-xl bg-red-600 text-white text-[15px] font-semibold hover:bg-red-700 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 transition-all duration-150",
  btnDanger:
    "h-11 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-[13px] font-medium hover:bg-red-500/20 active:scale-[0.98] disabled:opacity-50 transition-all duration-150",
  dangerLabel: "text-[11px] font-semibold leading-4 tracking-wide text-red-400/70 uppercase",
  fieldGap: "space-y-4",
  labelGap: "mb-1.5",
  btnRow: "flex gap-3",
} as const;

export const INCOME = {
  dot: "bg-emerald-400",
  pill: "bg-emerald-500/15 text-emerald-300",
  pillToday: "bg-emerald-500/25 text-emerald-200",
  text: "text-emerald-400",
} as const;

// Highlight 只是提示：未選取 8%、選取 12% + 內描邊，永遠低於收入 Badge 的視覺權重
export const PERIOD: Record<PeriodKind, {
  selectedBg: string;
  faintBg: string;
  badge: string;
  ring: string;
  swatch: string;
  banner: string;
  bannerLabel: string;
}> = {
  weekly: {
    selectedBg: "bg-amber-500/[0.12] ring-1 ring-inset ring-amber-500/30",
    faintBg: "bg-amber-500/[0.08]",
    badge: "bg-amber-500/10 border-amber-500/20 text-amber-300/80 hover:bg-amber-500/20",
    ring: "ring-amber-400/50",
    swatch: "bg-amber-500/20 border-amber-500/35",
    banner: "bg-amber-500/[0.08] border-amber-500/25",
    bannerLabel: "text-amber-300/90",
  },
  biweekly: {
    selectedBg: "bg-cyan-500/[0.12] ring-1 ring-inset ring-cyan-500/30",
    faintBg: "bg-cyan-500/[0.08]",
    badge: "bg-cyan-500/10 border-cyan-500/20 text-cyan-300/80 hover:bg-cyan-500/20",
    ring: "ring-cyan-400/50",
    swatch: "bg-cyan-500/20 border-cyan-500/35",
    banner: "bg-cyan-500/[0.08] border-cyan-500/25",
    bannerLabel: "text-cyan-300/90",
  },
  monthly: {
    selectedBg: "bg-purple-500/[0.12] ring-1 ring-inset ring-purple-500/30",
    faintBg: "bg-purple-500/[0.08]",
    badge: "bg-purple-500/10 border-purple-500/20 text-purple-300/80 hover:bg-purple-500/20",
    ring: "ring-purple-400/50",
    swatch: "bg-purple-500/20 border-purple-500/35",
    banner: "bg-purple-500/[0.08] border-purple-500/25",
    bannerLabel: "text-purple-300/90",
  },
};

export function money(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}
