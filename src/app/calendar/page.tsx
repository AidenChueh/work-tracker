"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useDevice } from "@/hooks/useDevice";
import { calcSessionIncome, calcSessionGross } from "@/lib/income";

type Job = {
  id: string;
  name: string;
  hourlyRate: number | null;
  commissionPercentage: number | null;
  commissionRequired: boolean;
  payFrequency: string;
  payDay: number | null;
  taxEnabled: boolean;
  overtimeTiers: { afterHours: number; rate: number }[];
  breakDuration: number | null;
  breakRate: number | null;
  penaltyRatesEnabled: boolean;
  penaltyBaseRate: number | null;
  publicHolidayRate: number;
  saturdayRate: number;
  sundayRate: number;
};

type Break = {
  id: string;
  startTime: string;
  endTime: string | null;
  isPaid: boolean;
};

type WorkSession = {
  id: string;
  jobId: string;
  job: Job;
  clockIn: string;
  clockOut: string | null;
  isPublicHoliday: boolean;
  dailyRevenue: number | null;
  breaks: Break[];
};

type SelectionMode =
  | { type: "day"; date: string }
  | { type: "period"; jobIds: string[]; periodStart: string; periodEnd: string; payDayLabel: string };

const WEEKDAYS_COL = ["一", "二", "三", "四", "五", "六", "日"];

function formatHours(ms: number): string {
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

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

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function weeklyPeriodForCell(cellDate: Date): { start: Date; end: Date } {
  const dayBefore = new Date(cellDate);
  dayBefore.setDate(dayBefore.getDate() - 1);
  const end = endOfDay(dayBefore);
  const start = startOfDay(new Date(dayBefore));
  start.setDate(start.getDate() - 6);
  return { start, end };
}

export default function CalendarPage() {
  const { deviceId, loaded } = useDevice();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<SelectionMode | null>(null);
  const [taxRate, setTaxRate] = useState(0);

  useEffect(() => {
    const stored = parseFloat(localStorage.getItem("taxRate") ?? "0");
    setTaxRate(isNaN(stored) ? 0 : stored);
  }, []);

  const fetchJobs = useCallback(async (id: string) => {
    const res = await fetch("/api/jobs", { headers: { "x-device-id": id } });
    if (res.ok) setJobs(await res.json());
  }, []);

  const fetchSessions = useCallback(async (id: string, year: number, month: number) => {
    const from = new Date(year, month, -5);
    const to = new Date(year, month + 1, 0, 23, 59, 59);
    const res = await fetch(
      `/api/sessions?since=${from.toISOString()}&to=${to.toISOString()}`,
      { headers: { "x-device-id": id } }
    );
    if (res.ok) {
      const data: WorkSession[] = await res.json();
      setSessions(data.filter((s) => s.clockOut !== null));
    }
  }, []);

  useEffect(() => {
    if (!deviceId || !loaded) return;
    setLoading(true);
    setSelection(null);
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

  const weeklyJobs = useMemo(
    () => jobs.filter((j) => j.payFrequency === "weekly" && j.payDay != null),
    [jobs]
  );
  const monthlyJobs = useMemo(
    () => jobs.filter((j) => j.payFrequency === "monthly" && j.payDay != null),
    [jobs]
  );

  // Precompute which days are in a weekly pay period (for background highlight)
  const payPeriodDaySet = useMemo(() => {
    const set = new Set<string>();
    for (const day of calendarDays) {
      const cellDow = day.getDay();
      for (const job of weeklyJobs) {
        if (job.payDay === cellDow) {
          const { start, end } = weeklyPeriodForCell(day);
          let cur = new Date(start);
          while (cur <= end) {
            set.add(localDateStr(cur));
            cur.setDate(cur.getDate() + 1);
          }
        }
      }
    }
    return set;
  }, [calendarDays, weeklyJobs]);

  function getWeeklyBadge(cellDate: Date): { total: number; jobCount: number } | null {
    const cellDow = cellDate.getDay();
    const matching = weeklyJobs.filter((j) => j.payDay === cellDow);
    if (matching.length === 0) return null;

    const { start, end } = weeklyPeriodForCell(cellDate);

    const total = sessions
      .filter((s) => {
        const t = new Date(s.clockIn).getTime();
        return matching.some((j) => j.id === s.jobId) && t >= start.getTime() && t <= end.getTime();
      })
      .reduce((sum, s) => sum + (calcSessionGross(s) ?? 0), 0);

    return total > 0 ? { total, jobCount: matching.length } : null;
  }

  function getMonthlyBadge(cellDate: Date): { total: number; jobCount: number } | null {
    const matching = monthlyJobs.filter((j) => j.payDay === cellDate.getDate() && cellDate.getMonth() === viewMonth);
    if (matching.length === 0) return null;
    const monthStart = new Date(viewYear, viewMonth, 1, 0, 0, 0);
    const monthEnd = endOfDay(cellDate);
    const total = sessions
      .filter((s) => {
        if (!matching.some((j) => j.id === s.jobId)) return false;
        const t = new Date(s.clockIn).getTime();
        return t >= monthStart.getTime() && t <= monthEnd.getTime();
      })
      .reduce((sum, s) => sum + (calcSessionGross(s) ?? 0), 0);
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
        <div className="text-white">載入中...</div>
      </div>
    );
  }

  return (
    <main className="bg-gray-950 text-white">
      <div className="max-w-md mx-auto px-4 py-6">

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-2 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-lg font-semibold">
            {viewYear}年{viewMonth + 1}月
          </span>
          <button
            onClick={() => navigateMonth(1)}
            className="p-2 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day of week headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS_COL.map((d) => (
            <div key={d} className="text-center text-xs text-gray-500 py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {calendarDays.map((day) => {
            const dateStr = localDateStr(day);
            const isCurrentMonth = day.getMonth() === viewMonth;
            const isToday = dateStr === todayStr;
            const daySessions = sessionsByDay.get(dateStr) ?? [];
            const dayIncome = daySessions.reduce((sum, s) => sum + (calcSessionGross(s) ?? 0), 0);
            const hasIncome = daySessions.some((s) => calcSessionGross(s) !== null);
            const weeklyBadge = getWeeklyBadge(day);
            const monthlyBadge = getMonthlyBadge(day);
            const isSelected = selection?.type === "day" && selection.date === dateStr;
            const isFuture = day > new Date();
            const isClickable = isCurrentMonth && !isFuture && daySessions.length > 0;
            const isInPeriod = isCurrentMonth && payPeriodDaySet.has(dateStr);
            const isInSelectedPeriod = isCurrentMonth && selection?.type === "period"
              && startOfDay(day).getTime() >= new Date(selection.periodStart).getTime()
              && startOfDay(day).getTime() <= new Date(selection.periodEnd).getTime();

            return (
              <div
                key={dateStr}
                onClick={() => {
                  if (!isClickable) return;
                  setSelection(isSelected ? null : { type: "day", date: dateStr });
                }}
                className={`relative flex flex-col items-center pt-1 pb-1.5 rounded-xl min-h-[64px] transition-colors
                  ${isClickable ? "cursor-pointer hover:bg-gray-800" : ""}
                  ${isSelected ? "bg-gray-800 ring-1 ring-blue-500" : isInSelectedPeriod ? "bg-amber-500/20" : isInPeriod ? "bg-amber-500/5" : ""}
                `}
              >
                <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-0.5
                  ${isToday ? "bg-blue-600 text-white" : isCurrentMonth ? "text-white" : "text-gray-700"}
                `}>
                  {day.getDate()}
                </div>

                {daySessions.length > 0 && (
                  <div className="flex gap-0.5 mb-0.5">
                    {daySessions.slice(0, 3).map((s) => (
                      <div key={s.id} className="w-1 h-1 bg-green-400 rounded-full" />
                    ))}
                    {daySessions.length > 3 && (
                      <span className="text-[9px] text-gray-500 leading-none">+{daySessions.length - 3}</span>
                    )}
                  </div>
                )}

                {hasIncome && dayIncome > 0 && (
                  <span className="text-[10px] text-green-400 leading-tight">
                    ${dayIncome.toFixed(0)}
                  </span>
                )}

                {/* Weekly payout badge */}
                {weeklyBadge && (() => {
                  const { start, end } = weeklyPeriodForCell(day);
                  const cellDow = day.getDay();
                  const matchingJobIds = weeklyJobs.filter((j) => j.payDay === cellDow).map((j) => j.id);
                  const label = `${start.toLocaleDateString("zh-TW")} – ${end.toLocaleDateString("zh-TW")}`;
                  const isActive = selection?.type === "period" && selection.periodStart === start.toISOString();
                  return (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelection((prev) =>
                          prev?.type === "period" && prev.periodStart === start.toISOString()
                            ? null
                            : { type: "period", jobIds: matchingJobIds, periodStart: start.toISOString(), periodEnd: end.toISOString(), payDayLabel: label }
                        );
                      }}
                      className={`mt-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-[9px] text-amber-400 hover:bg-amber-500/30 transition-colors leading-tight w-full text-center ${isActive ? "ring-1 ring-amber-400/60" : ""}`}
                    >
                      ${weeklyBadge.total.toFixed(0)}
                    </button>
                  );
                })()}

                {/* Monthly payout badge */}
                {monthlyBadge && (() => {
                  const start = new Date(viewYear, viewMonth, 1).toISOString();
                  const end = endOfDay(day).toISOString();
                  const label = `${viewYear}年${viewMonth + 1}月`;
                  const matchingJobIds = monthlyJobs.filter((j) => j.payDay === day.getDate() && day.getMonth() === viewMonth).map((j) => j.id);
                  const isActive = selection?.type === "period" && selection.periodStart === start;
                  return (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelection((prev) =>
                          prev?.type === "period" && prev.periodStart === start
                            ? null
                            : { type: "period", jobIds: matchingJobIds, periodStart: start, periodEnd: end, payDayLabel: label }
                        );
                      }}
                      className={`mt-0.5 px-1.5 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/40 text-[9px] text-purple-400 hover:bg-purple-500/30 transition-colors leading-tight w-full text-center ${isActive ? "ring-1 ring-purple-400/60" : ""}`}
                    >
                      ${monthlyBadge.total.toFixed(0)}
                    </button>
                  );
                })()}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-3 px-1">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
            上班
          </div>
          {weeklyJobs.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/50" />
              發薪日
            </div>
          )}
          {monthlyJobs.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded bg-purple-500/30 border border-purple-500/50" />
              月薪日
            </div>
          )}
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
              <p className="text-gray-400 text-sm text-center py-6">這段期間沒有打卡紀錄</p>
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
                    const groupGross = groupSessions.reduce((sum, s) => sum + (calcSessionGross(s) ?? 0), 0);
                    const groupHasIncome = groupSessions.some((s) => calcSessionGross(s) !== null);

                    return (
                      <div key={job.id}>
                        {showJobHeader && (
                          <div className="flex justify-between items-center px-4 py-2 bg-gray-750 border-b border-gray-700/50">
                            <span className="text-xs font-medium text-gray-300">{job.name}</span>
                            {groupHasIncome && (
                              <span className="text-xs text-green-400">小計 ${groupGross.toFixed(2)}</span>
                            )}
                          </div>
                        )}
                        {groupSessions
                          .sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime())
                          .map((s) => {
                            const gross = calcSessionGross(s);
                            const workedMs = s.clockOut
                              ? new Date(s.clockOut).getTime() - new Date(s.clockIn).getTime()
                              : 0;
                            const unpaidMs = s.breaks
                              .filter((b) => !b.isPaid && b.endTime)
                              .reduce((sum, b) => sum + (new Date(b.endTime!).getTime() - new Date(b.startTime).getTime()), 0);
                            const effectiveMs = workedMs - unpaidMs;

                            return (
                              <div key={s.id} className="px-4 py-3 border-b border-gray-700/40 last:border-0">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="text-sm font-medium">
                                      {new Date(s.clockIn).toLocaleDateString("zh-TW")}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      {fmtTime(s.clockIn)}
                                      {" — "}
                                      {s.clockOut ? fmtTime(s.clockOut) : "進行中"}
                                    </p>
                                    {unpaidMs > 0 && (
                                      <p className="text-xs text-gray-500 mt-0.5">
                                        休息 {formatHours(unpaidMs)} 未計
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-gray-400">{formatHours(effectiveMs)}</p>
                                    {job.hourlyRate != null && (
                                      <p className="text-xs text-gray-500">${job.hourlyRate}/hr</p>
                                    )}
                                    {gross !== null ? (
                                      <p className="text-sm font-semibold text-green-400">${gross.toFixed(2)}</p>
                                    ) : (
                                      <p className="text-xs text-gray-500">佣金制</p>
                                    )}
                                  </div>
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
                  const gross = detailData.sessions.reduce((sum, s) => sum + (calcSessionGross(s) ?? 0), 0);
                  const isPeriod = selection.type === "period";
                  const hasTax = taxRate > 0 && detailData.sessions.some((s) => s.job.taxEnabled);
                  const net = detailData.sessions.reduce((sum, s) => sum + (calcSessionIncome(s, taxRate) ?? 0), 0);
                  const label = !isPeriod ? "當日合計"
                    : detailData.sessions.some((s) => selection.type === "period" && jobs.find((j) => j.id === s.jobId)?.payFrequency === "monthly") ? "月薪合計"
                    : "週薪合計";
                  return (
                    <div className="px-4 py-3 border-t border-gray-700 bg-gray-900/40">
                      {isPeriod && hasTax ? (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-400">{label}</span>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">稅前 ${gross.toFixed(2)}</div>
                            <div className="text-base font-bold text-green-400">稅後 ${net.toFixed(2)}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-400">{label}</span>
                          <span className="text-base font-bold text-green-400">${gross.toFixed(2)}</span>
                        </div>
                      )}
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
