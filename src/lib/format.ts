import { getLocale } from "./locale-store";

const WD_SHORT_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const WD_ZH = ["日", "一", "二", "三", "四", "五", "六"];
const WD_LONG_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_SHORT_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export function fmtDateWeekday(iso: string): string {
  const d = new Date(iso);
  const md = `${d.getMonth() + 1}/${d.getDate()}`;
  return getLocale() === "en" ? `${WD_SHORT_EN[d.getDay()]} ${md}` : `週${WD_ZH[d.getDay()]} ${md}`;
}

export function formatTodayLabel(): string {
  const d = new Date();
  if (getLocale() === "en") {
    return `${WD_LONG_EN[d.getDay()]}, ${MONTH_SHORT_EN[d.getMonth()]} ${d.getDate()}`;
  }
  return `${d.getMonth() + 1}月${d.getDate()}日 星期${WD_ZH[d.getDay()]}`;
}
