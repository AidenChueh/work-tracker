"use client";

import { useState, useEffect, useCallback, useMemo, type Dispatch, type SetStateAction } from "react";
import { useDevice } from "@/hooks/useDevice";
import { useTaxRate } from "@/hooks/useTaxRate";
import { useLocale } from "@/hooks/useLocale";
import { useIncomeMode, type IncomeMode } from "@/hooks/useIncomeMode";
import { calcSessionIncome, calcSessionGross, effectiveWorkMs } from "@/lib/income";
import { formatDuration, formatHoursMinutes, fmtTime, fmtDateWeekday } from "@/lib/format";
import { getCached, hasCached, setCached } from "@/lib/api-cache";
import { INCOME, PERIOD, RADIUS, SURFACE, TYPE, money, type PeriodKind } from "@/lib/theme";
import type { Job, WorkSession } from "@/types/api";

type SelectionMode =
  | { type: "day"; date: string }
  | { type: "period"; jobIds: string[]; periodStart: string; periodEnd: string; payDayLabel: string; kind: PeriodKind };

const WEEKDAY_KEYS = ["cal.weekday.mon", "cal.weekday.tue", "cal.weekday.wed", "cal.weekday.thu", "cal.weekday.fri", "cal.weekday.sat", "cal.weekday.sun"] as const;
const PERIOD_LABEL_KEY: Record<PeriodKind, string> = {
  weekly: "cal.legend.weekly",
  biweekly: "cal.legend.biweekly",
  monthly: "cal.legend.monthly",
};

function localDateStr(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function periodForCellWithSpan(cellDate: Date, payWeekStart: number | null | undefined, periodDays: number): { start: Date; end: Date } {
  if (payWeekStart != null) {
    const periodEndDow = (payWeekStart - 1 + 7) % 7;
    const cellDow = cellDate.getDay();
    const daysFromPeriodEndToPayday = (cellDow - periodEndDow + 7) % 7 || 7;
    const end = new Date(cellDate);
    end.setDate(cellDate.getDate() - daysFromPeriodEndToPayday);
    const endDay = endOfDay(end);
    const start = startOfDay(new Date(end));
    start.setDate(start.getDate() - (periodDays - 1));
    return { start, end: endDay };
  }
  const dayBefore = new Date(cellDate);
  dayBefore.setDate(dayBefore.getDate() - 1);
  const end = endOfDay(dayBefore);
  const start = startOfDay(new Date(dayBefore));
  start.setDate(start.getDate() - (periodDays - 1));
  return { start, end };
}

function biweeklyAnchor(createdAt: string, payDay: number): Date {
  const anchor = new Date(createdAt);
  anchor.setHours(0, 0, 0, 0);
  const anchorDow = anchor.getDay();
  const offset = (payDay - anchorDow + 7) % 7;
  anchor.setDate(anchor.getDate() + offset);
  return anchor;
}

function isBiweeklyPayday(cellDate: Date, job: Job): boolean {
  if (job.payDay == null) return false;
  if (cellDate.getDay() !== job.payDay) return false;
  const anchor = biweeklyAnchor(job.createdAt, job.payDay);
  const cellStart = startOfDay(cellDate);
  if (cellStart.getTime() < anchor.getTime()) return false;
  const days = Math.round((cellStart.getTime() - anchor.getTime()) / 86400000);
  return days % 14 === 0;
}

type BadgeCellProps = {
  total: number;
  kind: PeriodKind;
  periodStart: Date;
  periodEnd: Date;
  periodLabel: string;
  matchingJobIds: string[];
  selection: SelectionMode | null;
  setSelection: Dispatch<SetStateAction<SelectionMode | null>>;
};

function BadgeCell({ total, kind, periodStart, periodEnd, periodLabel, matchingJobIds, selection, setSelection }: BadgeCellProps) {
  const { t } = useLocale();
  const isActive = selection?.type === "period" && selection.periodStart === periodStart.toISOString();
  const style = PERIOD[kind];
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setSelection((prev) =>
          prev?.type === "period" && prev.periodStart === periodStart.toISOString()
            ? null
            : { type: "period", jobIds: matchingJobIds, periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString(), payDayLabel: periodLabel, kind }
        );
      }}
      className={`mt-1 w-full px-1 py-1 border ${RADIUS.chip} transition-colors ${style.badge} ${isActive ? `ring-1 ${style.ring}` : ""}`}
    >
      <span className={`block truncate ${TYPE.badgeLabel}`}>{t(PERIOD_LABEL_KEY[kind])}</span>
      <span className={`mt-1 block ${TYPE.badgeValue}`}>{money(total)}</span>
    </button>
  );
}

export default function CalendarPage() {
  const { deviceId, loaded } = useDevice();
  const { t, locale } = useLocale();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<SelectionMode | null>(null);
  const taxRate = useTaxRate();
  const [incomeMode, setIncomeMode] = useIncomeMode();

  const amountOf = useCallback(
    (s: WorkSession) => (incomeMode === "net" ? calcSessionIncome(s, taxRate) : calcSessionGross(s)),
    [incomeMode, taxRate]
  );

  const fetchJobs = useCallback(async (id: string) => {
    const res = await fetch("/api/jobs", { headers: { "x-device-id": id } });
    if (res.ok) {
      const data: Job[] = await res.json();
      setJobs(data);
      setCached(`jobs:${id}`, data);
    }
  }, []);

  const fetchSessions = useCallback(async (id: string, year: number, month: number) => {
    // Fetch from start of previous month to cover monthly + biweekly pay period display
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month + 1, 0, 23, 59, 59);
    const res = await fetch(
      `/api/sessions?since=${from.toISOString()}&to=${to.toISOString()}`,
      { headers: { "x-device-id": id } }
    );
    if (res.ok) {
      const data: WorkSession[] = await res.json();
      const completed = data.filter((s) => s.clockOut !== null);
      setSessions(completed);
      setCached(`cal:${id}:${year}-${month}`, completed);
    }
  }, []);

  useEffect(() => {
    if (!deviceId || !loaded) return;
    setSelection(null);
    const key = `cal:${deviceId}:${viewYear}-${viewMonth}`;
    if (hasCached(key) && hasCached(`jobs:${deviceId}`)) {
      setSessions(getCached<WorkSession[]>(key) ?? []);
      setJobs(getCached<Job[]>(`jobs:${deviceId}`) ?? []);
      setLoading(false);
    } else {
      setLoading(true);
    }
    Promise.all([
      fetchJobs(deviceId),
      fetchSessions(deviceId, viewYear, viewMonth),
    ]).finally(() => setLoading(false));
  }, [deviceId, loaded, viewYear, viewMonth, fetchJobs, fetchSessions]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startDow = firstDay.getDay();
    const startOffset = startDow === 0 ? 6 : startDow - 1;
    const gridStart = new Date(firstDay);
    gridStart.setDate(gridStart.getDate() - startOffset);
    const endDow = lastDay.getDay();
    const endOffset = endDow === 0 ? 0 : 7 - endDow;
    const gridEnd = new Date(lastDay);
    gridEnd.setDate(gridEnd.getDate() + endOffset);

    const days: Date[] = [];
    const cur = new Date(gridStart);
    while (cur <= gridEnd) {
      days.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }, [viewYear, viewMonth]);

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, WorkSession[]>();
    for (const s of sessions) {
      const key = localDateStr(new Date(s.clockIn));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [sessions]);

  const monthStats = useMemo(() => {
    const days = new Set<string>();
    const workedDays = new Set<string>();
    let income = 0;
    let workMs = 0;
    for (const s of sessions) {
      const d = new Date(s.clockIn);
      if (d.getFullYear() !== viewYear || d.getMonth() !== viewMonth) continue;
      const key = localDateStr(d);
      days.add(key);
      income += amountOf(s) ?? 0;
      const ms = effectiveWorkMs(s);
      if (ms !== null) {
        workMs += ms;
        workedDays.add(key);
      }
    }
    return {
      income,
      dayCount: days.size,
      avgIncome: days.size > 0 ? income / days.size : 0,
      avgWorkMs: workedDays.size > 0 ? workMs / workedDays.size : null,
    };
  }, [sessions, viewYear, viewMonth, amountOf]);

  const weeklyJobs = useMemo(
    () => jobs.filter((j) => j.payFrequency === "weekly" && j.payDay != null),
    [jobs]
  );
  const biweeklyJobs = useMemo(
    () => jobs.filter((j) => j.payFrequency === "bi_weekly" && j.payDay != null),
    [jobs]
  );
  const monthlyJobs = useMemo(
    () => jobs.filter((j) => j.payFrequency === "monthly" && j.payDay != null),
    [jobs]
  );

  const weeklyPeriodDaySet = useMemo(() => {
    const set = new Set<string>();
    for (const day of calendarDays) {
      const cellDow = day.getDay();
      for (const job of weeklyJobs) {
        if (job.payDay === cellDow) {
          const { start, end } = periodForCellWithSpan(day, job.payWeekStart, 7);
          let cur = new Date(start);
          while (cur <= end) { set.add(localDateStr(cur)); cur.setDate(cur.getDate() + 1); }
        }
      }
    }
    return set;
  }, [calendarDays, weeklyJobs]);

  const biweeklyPeriodDaySet = useMemo(() => {
    const set = new Set<string>();
    for (const day of calendarDays) {
      for (const job of biweeklyJobs) {
        if (isBiweeklyPayday(day, job)) {
          const { start, end } = periodForCellWithSpan(day, job.payWeekStart, 14);
          let cur = new Date(start);
          while (cur <= end) { set.add(localDateStr(cur)); cur.setDate(cur.getDate() + 1); }
        }
      }
    }
    return set;
  }, [calendarDays, biweeklyJobs]);

  function getWeeklyBadge(cellDate: Date): { total: number; jobCount: number } | null {
    const cellDow = cellDate.getDay();
    const matching = weeklyJobs.filter((j) => j.payDay === cellDow);
    if (matching.length === 0) return null;

    const total = matching.reduce((sum, job) => {
      const { start, end } = periodForCellWithSpan(cellDate, job.payWeekStart, 7);
      const jobTotal = sessions
        .filter((s) => {
          const t = new Date(s.clockIn).getTime();
          return s.jobId === job.id && t >= start.getTime() && t <= end.getTime();
        })
        .reduce((s2, s) => s2 + (amountOf(s) ?? 0), 0);
      return sum + jobTotal;
    }, 0);

    return total > 0 ? { total, jobCount: matching.length } : null;
  }

  function getBiweeklyBadge(cellDate: Date): { total: number; jobCount: number } | null {
    const matching = biweeklyJobs.filter((j) => isBiweeklyPayday(cellDate, j));
    if (matching.length === 0) return null;
    const total = matching.reduce((sum, job) => {
      const { start, end } = periodForCellWithSpan(cellDate, job.payWeekStart, 14);
      const jobTotal = sessions
        .filter((s) => {
          const t = new Date(s.clockIn).getTime();
          return s.jobId === job.id && t >= start.getTime() && t <= end.getTime();
        })
        .reduce((s2, s) => s2 + (amountOf(s) ?? 0), 0);
      return sum + jobTotal;
    }, 0);
    return total > 0 ? { total, jobCount: matching.length } : null;
  }

  function getMonthlyBadge(cellDate: Date): { total: number; jobCount: number } | null {
    const matching = monthlyJobs.filter((j) => j.payDay === cellDate.getDate() && cellDate.getMonth() === viewMonth);
    if (matching.length === 0) return null;
    const prevMonthStart = new Date(viewYear, viewMonth - 1, 1, 0, 0, 0);
    const prevMonthEnd = new Date(viewYear, viewMonth, 0, 23, 59, 59);
    const total = sessions
      .filter((s) => {
        if (!matching.some((j) => j.id === s.jobId)) return false;
        const t = new Date(s.clockIn).getTime();
        return t >= prevMonthStart.getTime() && t <= prevMonthEnd.getTime();
      })
      .reduce((sum, s) => sum + (amountOf(s) ?? 0), 0);
    return total > 0 ? { total, jobCount: matching.length } : null;
  }

  const detailData = useMemo(() => {
    if (!selection) return null;
    if (selection.type === "day") {
      const daySessions = sessionsByDay.get(selection.date) ?? [];
      return { sessions: daySessions, label: selection.date };
    }
    const start = new Date(selection.periodStart).getTime();
    const end = new Date(selection.periodEnd).getTime();
    const periodSessions = sessions.filter((s) => {
      const t = new Date(s.clockIn).getTime();
      return selection.jobIds.includes(s.jobId) && t >= start && t <= end;
    });
    return { sessions: periodSessions, label: selection.payDayLabel };
  }, [selection, sessions, sessionsByDay]);

  function navigateMonth(delta: number) {
    setViewMonth((m) => {
      const next = m + delta;
      if (next < 0) { setViewYear((y) => y - 1); return 11; }
      if (next > 11) { setViewYear((y) => y + 1); return 0; }
      return next;
    });
  }

  const todayStr = localDateStr(new Date());

  if (!loaded || loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-950">
        <div className="text-white">{t("common.loading")}</div>
      </div>
    );
  }

  const monthsEn = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const monthLabel = locale === "en" ? `${monthsEn[viewMonth]} ${viewYear}` : `${viewYear}年${viewMonth + 1}月`;

  return (
    <main className="bg-gray-950 text-white">
      <div className="max-w-md mx-auto px-4 py-6">

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateMonth(-1)}
            aria-label={t("cal.prevMonth")}
            className={`-ml-2 w-11 h-11 flex items-center justify-center ${RADIUS.cell} hover:bg-gray-800 active:bg-gray-800 text-gray-400 hover:text-white transition-colors`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className={TYPE.monthTitle}>{monthLabel}</span>
          <button
            onClick={() => navigateMonth(1)}
            aria-label={t("cal.nextMonth")}
            className={`-mr-2 w-11 h-11 flex items-center justify-center ${RADIUS.cell} hover:bg-gray-800 active:bg-gray-800 text-gray-400 hover:text-white transition-colors`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Month summary */}
        <div className={`${SURFACE.card} ${RADIUS.card} px-4 py-3.5 mb-4`}>
          <div className="flex items-center justify-between gap-3">
            <span className={TYPE.cardLabel}>{t("cal.summary.title")}</span>
            <div className={`flex items-center gap-0.5 p-0.5 ${RADIUS.chip} ${SURFACE.segment}`}>
              {(["net", "gross"] as IncomeMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setIncomeMode(m)}
                  className={`px-2 py-1 ${RADIUS.pill} ${TYPE.segment} transition-colors ${incomeMode === m ? SURFACE.segmentOn : SURFACE.segmentOff}`}
                >
                  {t(`cal.mode.${m}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className={`${TYPE.cardValue} ${INCOME.text}`}>{money(monthStats.income)}</span>
            {monthStats.dayCount > 0 && (
              <span className={TYPE.cardMeta}>{t("cal.summary.avgIncome", { amount: money(monthStats.avgIncome) })}</span>
            )}
          </div>

          <div className={`mt-3 pt-3 grid grid-cols-2 gap-3 ${SURFACE.divider}`}>
            <div>
              <div className={TYPE.statLabel}>{t("cal.summary.days")}</div>
              <div className={`mt-1.5 ${TYPE.statValue}`}>
                {monthStats.dayCount > 0 ? t("cal.summary.daysValue", { days: monthStats.dayCount }) : "—"}
              </div>
            </div>
            <div>
              <div className={TYPE.statLabel}>{t("cal.summary.avgHours")}</div>
              <div className={`mt-1.5 ${TYPE.statValue}`}>
                {monthStats.avgWorkMs !== null ? formatHoursMinutes(monthStats.avgWorkMs) : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3 px-1">
          <span className={`flex items-center gap-1.5 ${TYPE.legend}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${INCOME.dot}`} />
            {t("cal.legend.work")}
          </span>
          <span className={`flex items-center gap-1.5 ${TYPE.legend}`}>
            <span className={`px-1 ${RADIUS.pill} ${INCOME.pill} text-[9px] font-semibold leading-4`}>$</span>
            {t("cal.legend.income")}
          </span>
          {weeklyJobs.length > 0 && (
            <span className={`flex items-center gap-1.5 ${TYPE.legend}`}>
              <span className={`w-3 h-3 rounded border ${PERIOD.weekly.swatch}`} />
              {t("cal.legend.weekly")}
            </span>
          )}
          {biweeklyJobs.length > 0 && (
            <span className={`flex items-center gap-1.5 ${TYPE.legend}`}>
              <span className={`w-3 h-3 rounded border ${PERIOD.biweekly.swatch}`} />
              {t("cal.legend.biweekly")}
            </span>
          )}
          {monthlyJobs.length > 0 && (
            <span className={`flex items-center gap-1.5 ${TYPE.legend}`}>
              <span className={`w-3 h-3 rounded border ${PERIOD.monthly.swatch}`} />
              {t("cal.legend.monthly")}
            </span>
          )}
        </div>

        {/* Day of week headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAY_KEYS.map((k, i) => (
            <div key={k} className={`text-center py-1 ${TYPE.weekday} ${i >= 5 ? "text-gray-500" : "text-gray-300"}`}>{t(k)}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {calendarDays.map((day) => {
            const dateStr = localDateStr(day);
            const isCurrentMonth = day.getMonth() === viewMonth;
            const isToday = dateStr === todayStr;
            const daySessions = sessionsByDay.get(dateStr) ?? [];
            const dayIncome = daySessions.reduce((sum, s) => sum + (amountOf(s) ?? 0), 0);
            const hasIncome = daySessions.some((s) => calcSessionGross(s) !== null);
            const weeklyBadge = getWeeklyBadge(day);
            const biweeklyBadge = getBiweeklyBadge(day);
            const monthlyBadge = getMonthlyBadge(day);
            const isSelected = selection?.type === "day" && selection.date === dateStr;
            const isFuture = day > new Date();
            const isClickable = isCurrentMonth && !isFuture && daySessions.length > 0;
            const isInSelectedPeriod = selection?.type === "period"
              && startOfDay(day).getTime() >= new Date(selection.periodStart).getTime()
              && startOfDay(day).getTime() <= new Date(selection.periodEnd).getTime();
            const selectedBg = isInSelectedPeriod && selection?.type === "period" ? PERIOD[selection.kind].selectedBg : "";
            const faintBg = biweeklyPeriodDaySet.has(dateStr)
              ? PERIOD.biweekly.faintBg
              : weeklyPeriodDaySet.has(dateStr)
              ? PERIOD.weekly.faintBg
              : "";
            const cellBg = isSelected
              ? SURFACE.selected
              : isInSelectedPeriod
              ? selectedBg
              : isToday
              ? SURFACE.today
              : faintBg;

            return (
              <div
                key={dateStr}
                onClick={() => {
                  if (!isClickable) return;
                  setSelection(isSelected ? null : { type: "day", date: dateStr });
                }}
                className={`relative flex flex-col items-center gap-1 px-0.5 py-2 ${RADIUS.cell} min-h-[68px] transition-colors
                  ${isClickable ? `cursor-pointer ${SURFACE.hover}` : ""}
                  ${cellBg}
                `}
              >
                <span className={`${TYPE.dayNum}
                  ${!isCurrentMonth ? "text-gray-700" : isToday ? "text-blue-200" : "text-white"}
                `}>
                  {day.getDate()}
                </span>

                {daySessions.length > 0 && (
                  <div className="flex items-center gap-0.5">
                    {daySessions.slice(0, 3).map((s) => (
                      <div key={s.id} className={`w-1 h-1 rounded-full ${INCOME.dot}`} />
                    ))}
                    {daySessions.length > 3 && (
                      <span className="text-[9px] text-gray-500 leading-none">+{daySessions.length - 3}</span>
                    )}
                  </div>
                )}

                {hasIncome && dayIncome > 0 ? (
                  <span className={`px-1.5 py-0.5 ${RADIUS.pill} ${TYPE.dayIncome} ${isToday ? INCOME.pillToday : INCOME.pill}`}>
                    {money(dayIncome)}
                  </span>
                ) : isCurrentMonth && daySessions.length === 0 ? (
                  <span className={TYPE.dayEmpty}>–</span>
                ) : null}

                {weeklyBadge && (() => {
                  const cellDow = day.getDay();
                  const matchingJob = weeklyJobs.find((j) => j.payDay === cellDow);
                  const { start, end } = periodForCellWithSpan(day, matchingJob?.payWeekStart, 7);
                  const localeStr = locale === "en" ? "en-US" : "zh-TW";
                  return (
                    <BadgeCell
                      total={weeklyBadge.total} kind="weekly"
                      periodStart={start} periodEnd={end}
                      periodLabel={`${start.toLocaleDateString(localeStr)} – ${end.toLocaleDateString(localeStr)}`}
                      matchingJobIds={weeklyJobs.filter((j) => j.payDay === cellDow).map((j) => j.id)}
                      selection={selection} setSelection={setSelection}
                    />
                  );
                })()}

                {biweeklyBadge && (() => {
                  const matchingJob = biweeklyJobs.find((j) => isBiweeklyPayday(day, j));
                  const { start, end } = periodForCellWithSpan(day, matchingJob?.payWeekStart, 14);
                  const localeStr = locale === "en" ? "en-US" : "zh-TW";
                  return (
                    <BadgeCell
                      total={biweeklyBadge.total} kind="biweekly"
                      periodStart={start} periodEnd={end}
                      periodLabel={`${start.toLocaleDateString(localeStr)} – ${end.toLocaleDateString(localeStr)}`}
                      matchingJobIds={biweeklyJobs.filter((j) => isBiweeklyPayday(day, j)).map((j) => j.id)}
                      selection={selection} setSelection={setSelection}
                    />
                  );
                })()}

                {monthlyBadge && (() => {
                  const prevMonthStart = new Date(viewYear, viewMonth - 1, 1);
                  const prevMonthEnd = new Date(viewYear, viewMonth, 0, 23, 59, 59);
                  const prevMonth = viewMonth === 0 ? 12 : viewMonth;
                  const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
                  const label = locale === "en" ? `${monthsEn[prevMonth - 1]} ${prevYear}` : `${prevYear}年${prevMonth}月`;
                  return (
                    <BadgeCell
                      total={monthlyBadge.total} kind="monthly"
                      periodStart={prevMonthStart} periodEnd={prevMonthEnd}
                      periodLabel={label}
                      matchingJobIds={monthlyJobs.filter((j) => j.payDay === day.getDate() && day.getMonth() === viewMonth).map((j) => j.id)}
                      selection={selection} setSelection={setSelection}
                    />
                  );
                })()}
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        {selection && detailData && (
          <div className="mt-6 bg-gray-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <h3 className="font-semibold text-sm">
                {selection.type === "day" ? selection.date : detailData.label}
              </h3>
              <button
                onClick={() => setSelection(null)}
                className="text-gray-500 hover:text-white text-lg leading-none px-1"
              >
                ×
              </button>
            </div>

            {detailData.sessions.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">{t("cal.empty")}</p>
            ) : (
              <>
                {(() => {
                  const groupedMap = new Map<string, WorkSession[]>();
                  for (const s of detailData.sessions) {
                    if (!groupedMap.has(s.jobId)) groupedMap.set(s.jobId, []);
                    groupedMap.get(s.jobId)!.push(s);
                  }
                  const groups = Array.from(groupedMap.values());
                  const showJobHeader = groups.length > 1 || selection.type === "period";

                  return groups.map((groupSessions) => {
                    const job = groupSessions[0].job;
                    const groupTotal = groupSessions.reduce((sum, s) => sum + (amountOf(s) ?? 0), 0);
                    const groupHasIncome = groupSessions.some((s) => calcSessionGross(s) !== null);
                    const isPeriodView = selection.type === "period";

                    return (
                      <div key={job.id}>
                        {showJobHeader && (
                          <div className="flex justify-between items-center px-4 py-2 bg-gray-750 border-b border-gray-700/50">
                            <span className="text-xs font-medium text-gray-300">{job.name}</span>
                            {isPeriodView && groupHasIncome && (
                              <span className="text-xs text-green-400">{t("cal.subtotal", { amount: groupTotal.toFixed(2) })}</span>
                            )}
                          </div>
                        )}
                        {groupSessions
                          .sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime())
                          .map((s) => {
                            const amount = amountOf(s);
                            const duration = effectiveWorkMs(s) ?? 0;

                            return (
                              <div key={s.id} className="px-4 py-3 border-b border-gray-700/40 last:border-0">
                                <div className="grid grid-cols-2 gap-y-1 items-center">
                                  <span className="text-sm text-white">
                                    {fmtTime(s.clockIn)}
                                    {" — "}
                                    {s.clockOut ? fmtTime(s.clockOut) : t("cal.inProgress")}
                                  </span>
                                  <span className="font-mono text-gray-300 text-sm text-right">{formatDuration(duration)}</span>
                                  <span className="text-gray-400 text-sm">{fmtDateWeekday(s.clockIn)}</span>
                                  <span className="text-sm font-semibold text-green-400 text-right">
                                    {amount !== null ? `$${amount.toFixed(2)}` : t("cal.commissionLabel")}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    );
                  });
                })()}

                {/* Footer total */}
                {(() => {
                  const hasIncome = detailData.sessions.some((s) => calcSessionGross(s) !== null);
                  if (!hasIncome) return null;
                  const isPeriod = selection.type === "period";
                  const total = detailData.sessions.reduce((sum, s) => sum + (amountOf(s) ?? 0), 0);
                  let label = t("cal.dayTotal");
                  if (isPeriod) {
                    const freqs = new Set(detailData.sessions.map((s) => jobs.find((j) => j.id === s.jobId)?.payFrequency));
                    if (freqs.has("monthly")) label = t("cal.monthlyTotal");
                    else if (freqs.has("bi_weekly")) label = t("cal.biweeklyTotal");
                    else label = t("cal.weeklyTotal");
                  }
                  const totalHoursMs = detailData.sessions.reduce((sum, s) => sum + (effectiveWorkMs(s) ?? 0), 0);
                  return (
                    <div className="px-4 py-3 border-t border-gray-700 bg-gray-900/40">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">
                          {label}
                          <span className="ml-1.5 text-xs text-gray-500">{t(`cal.mode.${incomeMode}`)}</span>
                        </span>
                        <div className="text-right">
                          {isPeriod && (
                            <div className="text-xs text-gray-400">{t("cal.hoursTotal", { hours: formatHoursMinutes(totalHoursMs) })}</div>
                          )}
                          <div className="text-base font-bold text-green-400">${total.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
