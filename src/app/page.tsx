"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useDevice } from "@/hooks/useDevice";
import { useTaxRate } from "@/hooks/useTaxRate";
import { useLocale } from "@/hooks/useLocale";
import { calcSessionIncome, totalWorkMs, type SessionBase } from "@/lib/income";
import { formatDuration, formatHoursMinutes, fmtTime, fmtDateWeekday, formatTodayLabel } from "@/lib/format";
import { getCached, hasCached, invalidateCache, setCached } from "@/lib/api-cache";
import { SettingsModal } from "@/components/SettingsModal";
import { StatField } from "@/components/StatField";
import { SelectField, TextField, TextAreaField, TimeField, ToggleRow, Spinner } from "@/components/FormControls";
import { PageHeader } from "@/components/PageHeader";
import { PageSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import { getNextPayday } from "@/lib/payday";
import { fmtMonthDay } from "@/lib/format";
import { COLOR, FORM, HIT, ICON, RADIUS, SPACE, SURFACE, TYPE } from "@/lib/theme";
import type { Job, WorkSession } from "@/types/api";

function dateWithTime(base: Date, time: string): Date {
  const [h, m] = time.split(":").map((s) => parseInt(s, 10));
  const d = new Date(base);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// 本週從星期一算起
function startOfWeek(): Date {
  const d = new Date();
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

function ClockIcon() {
  return (
    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 7v5l3 2" />
    </svg>
  );
}

function MoneyIcon() {
  return (
    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M14.5 9.5a2.5 2.5 0 0 0-2.5-1.5c-1.4 0-2.5.7-2.5 2s1.1 1.8 2.5 2 2.5.7 2.5 2-1.1 2-2.5 2a2.5 2.5 0 0 1-2.5-1.5M12 6.5v11" />
    </svg>
  );
}

type TodayStatus = "idle" | "working" | "done";

const STATUS_STYLE: Record<TodayStatus, string> = {
  idle: "bg-gray-700/60 text-gray-300 border-gray-600",
  working: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  done: "bg-blue-500/15 text-blue-300 border-blue-500/30",
};

export default function Home() {
  const { deviceId, loaded } = useDevice();
  const { t } = useLocale();
  const toast = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [elapsed, setElapsed] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState("");
  const [notes, setNotes] = useState("");
  const [isPublicHoliday, setIsPublicHoliday] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittingFixed, setSubmittingFixed] = useState(false);
  const [fixedFeedback, setFixedFeedback] = useState("");
  const [clockError, setClockError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [fixedTimeIn, setFixedTimeIn] = useState("");
  const [fixedTimeOut, setFixedTimeOut] = useState("");
  const [clockAgain, setClockAgain] = useState(false);
  const taxRate = useTaxRate();

  const fetchJobs = useCallback(async (id: string) => {
    const res = await fetch("/api/jobs", { headers: { "x-device-id": id } });
    if (res.ok) {
      const data: Job[] = await res.json();
      setJobs(data);
      setCached(`jobs:${id}`, data);
      if (data.length > 0) setSelectedJobId((prev) => prev || data[0].id);
    }
  }, []);

  const fetchActiveSession = useCallback(async (id: string) => {
    const res = await fetch("/api/sessions/active", { headers: { "x-device-id": id } });
    if (res.ok) {
      const data: WorkSession | null = await res.json();
      setActiveSession(data);
      setCached(`active:${id}`, data);
    }
  }, []);

  const fetchRecentSessions = useCallback(async (id: string) => {
    // 一次抓夠：今日／本週／本月統計與最近紀錄都從這份資料算
    const res = await fetch("/api/sessions?limit=120", { headers: { "x-device-id": id } });
    if (res.ok) {
      const data: WorkSession[] = await res.json();
      setSessions(data);
      setCached(`recent:${id}`, data);
    }
  }, []);

  useEffect(() => {
    if (!deviceId || !loaded) return;
    // 有快取先渲染，fetch 在背景 revalidate；spinner 只在第一次出現
    if (hasCached(`jobs:${deviceId}`)) {
      const cachedJobs = getCached<Job[]>(`jobs:${deviceId}`) ?? [];
      setJobs(cachedJobs);
      if (cachedJobs.length > 0) setSelectedJobId((prev) => prev || cachedJobs[0].id);
      setActiveSession(getCached<WorkSession | null>(`active:${deviceId}`) ?? null);
      setSessions(getCached<WorkSession[]>(`recent:${deviceId}`) ?? []);
      setLoading(false);
    }
    Promise.all([
      fetchJobs(deviceId),
      fetchActiveSession(deviceId),
      fetchRecentSessions(deviceId),
    ]).finally(() => setLoading(false));
  }, [deviceId, loaded, fetchJobs, fetchActiveSession, fetchRecentSessions]);

  useEffect(() => {
    if (!activeSession) return;
    const update = () => setElapsed(Date.now() - new Date(activeSession.clockIn).getTime());
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? null;
  const isFixedSchedule =
    selectedJob?.scheduleType === "fixed" && !!selectedJob.fixedClockIn && !!selectedJob.fixedClockOut;

  useEffect(() => {
    if (selectedJob?.scheduleType === "fixed") {
      setFixedTimeIn(selectedJob.fixedClockIn ?? "");
      setFixedTimeOut(selectedJob.fixedClockOut ?? "");
    }
  }, [selectedJob?.id]);

  const todayDone = useMemo(() => {
    const today = localDateStr(new Date());
    return sessions.filter((s) => s.clockOut !== null && localDateStr(new Date(s.clockIn)) === today);
  }, [sessions]);

  const recent = useMemo(
    () => sessions.filter((s) => s.id !== activeSession?.id).slice(0, 2),
    [sessions, activeSession]
  );

  const periodIncome = useMemo(() => {
    const weekStart = startOfWeek().getTime();
    const monthStart = startOfMonth().getTime();
    let week = 0;
    let month = 0;
    for (const s of sessions) {
      if (s.clockOut === null) continue;
      const time = new Date(s.clockIn).getTime();
      const amount = calcSessionIncome(s, taxRate) ?? 0;
      if (time >= weekStart) week += amount;
      if (time >= monthStart) month += amount;
    }
    return { week, month };
  }, [sessions, taxRate]);

  // 上班中的即時工時／收入：每秒隨 elapsed 重算
  const live = useMemo(() => {
    if (!activeSession) return null;
    const revenue = dailyRevenue === "" ? activeSession.dailyRevenue : parseFloat(dailyRevenue);
    const base: SessionBase = { ...activeSession, isPublicHoliday, dailyRevenue: isNaN(revenue as number) ? null : revenue };
    const now: SessionBase = { ...base, clockOut: new Date().toISOString() };

    const end = activeSession.job.fixedClockOut;
    let shiftEnd: Date | null = null;
    if (end) {
      const start = new Date(activeSession.clockIn);
      const candidate = dateWithTime(start, end);
      if (candidate <= start) candidate.setDate(candidate.getDate() + 1);
      shiftEnd = candidate;
    }

    return {
      workMs: totalWorkMs(now) ?? 0,
      income: calcSessionIncome(now, taxRate),
      remainingMs: shiftEnd ? shiftEnd.getTime() - Date.now() : null,
      endIncome: shiftEnd ? calcSessionIncome({ ...base, clockOut: shiftEnd.toISOString() }, taxRate) : null,
    };
    // elapsed 讓計時中的數字每秒更新
  }, [activeSession, elapsed, dailyRevenue, isPublicHoliday, taxRate]);

  const status: TodayStatus = activeSession ? "working" : todayDone.length > 0 ? "done" : "idle";

  const todayWorkedMs = todayDone.reduce((sum, s) => sum + (totalWorkMs(s) ?? 0), 0) + (live?.workMs ?? 0);
  const todayIncome =
    todayDone.reduce((sum, s) => sum + (calcSessionIncome(s, taxRate) ?? 0), 0) + (live?.income ?? 0);
  const hasIncome = todayDone.length > 0 || live?.income != null;

  function invalidateShared() {
    if (!deviceId) return;
    invalidateCache(`sessions:${deviceId}`);
    invalidateCache(`jobsMonth:${deviceId}`);
  }

  const handleClockIn = async () => {
    if (!selectedJobId || !deviceId || submitting) return;
    setClockError("");
    setSubmitting(true);
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-device-id": deviceId },
      body: JSON.stringify({ jobId: selectedJobId }),
    });
    if (res.ok) {
      const data: WorkSession = await res.json();
      setActiveSession(data);
      setCached(`active:${deviceId}`, data);
      setElapsed(0);
      setClockAgain(false);
      invalidateShared();
      toast(t("toast.clockedIn"));
    } else {
      const data = await res.json().catch(() => ({}));
      setClockError(data.error ?? t("home.clockFailed"));
      toast(t("toast.failed"), "error");
    }
    setSubmitting(false);
  };

  const handleClockOut = async () => {
    if (!activeSession || !deviceId || submitting) return;
    setClockError("");
    setSubmitting(true);
    const body: Record<string, unknown> = { clockOut: "now" };
    if (isPublicHoliday) body.isPublicHoliday = true;
    if (dailyRevenue) body.dailyRevenue = parseFloat(dailyRevenue);
    if (notes.trim()) body.notes = notes.trim();

    const res = await fetch(`/api/sessions/${activeSession.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-device-id": deviceId },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setActiveSession(null);
      setCached(`active:${deviceId}`, null);
      setElapsed(0);
      setDailyRevenue("");
      setNotes("");
      setIsPublicHoliday(false);
      setClockAgain(false);
      invalidateShared();
      fetchRecentSessions(deviceId).catch(() => {});
      toast(t("toast.clockedOut"));
    } else {
      const data = await res.json().catch(() => ({}));
      setClockError(data.error ?? t("home.clockFailed"));
      toast(t("toast.failed"), "error");
    }
    setSubmitting(false);
  };

  const handleFixedClockIn = async () => {
    if (!selectedJob || !deviceId || !fixedTimeIn || !fixedTimeOut) return;
    setSubmittingFixed(true);
    setFixedFeedback("");
    const today = new Date();
    const clockIn = dateWithTime(today, fixedTimeIn);
    const clockOut = dateWithTime(today, fixedTimeOut);
    // 下班時間早於上班視為跨夜班，落在隔天
    if (clockOut <= clockIn) clockOut.setDate(clockOut.getDate() + 1);
    const body: Record<string, unknown> = {
      jobId: selectedJob.id,
      clockIn: clockIn.toISOString(),
      clockOut: clockOut.toISOString(),
    };
    if (isPublicHoliday) body.isPublicHoliday = true;
    if (selectedJob.commissionPercentage != null && dailyRevenue)
      body.dailyRevenue = parseFloat(dailyRevenue);
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-device-id": deviceId },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setFixedFeedback(
        t("home.fixedAdded", { name: selectedJob.name, start: fixedTimeIn, end: fixedTimeOut })
      );
      setDailyRevenue("");
      setIsPublicHoliday(false);
      setClockAgain(false);
      invalidateShared();
      await fetchRecentSessions(deviceId);
      toast(t("toast.recordAdded"));
    } else {
      setFixedFeedback(t("home.addFailed"));
      toast(t("toast.failed"), "error");
    }
    setSubmittingFixed(false);
  };

  function applyPresetTimes() {
    if (!selectedJob) return;
    setFixedTimeIn(selectedJob.fixedClockIn ?? "");
    setFixedTimeOut(selectedJob.fixedClockOut ?? "");
  }

  if (!loaded) return null;
  if (loading) return <PageSkeleton cards={2} lines={4} />;

  const isCommissionJob = activeSession?.job.commissionPercentage != null;
  const fixedIsCommission = selectedJob?.commissionPercentage != null;
  const revenueRequired = activeSession
    ? isCommissionJob && (activeSession.job.commissionRequired ?? false)
    : isFixedSchedule && fixedIsCommission && (selectedJob?.commissionRequired ?? false);
  const revenueMissing = revenueRequired && !dailyRevenue;
  const showRevenue = (activeSession && isCommissionJob) || (!activeSession && isFixedSchedule && fixedIsCommission);
  const showHoliday =
    (activeSession && activeSession.job.penaltyRatesEnabled) ||
    (!activeSession && isFixedSchedule && selectedJob?.penaltyRatesEnabled);
  const doneForToday = status === "done" && !clockAgain;
  const nextPayday = (activeSession?.job ?? selectedJob) ? getNextPayday((activeSession?.job ?? selectedJob)!) : null;

  const summaryStats: { label: string; value: string; tone?: string }[] = [
    {
      label: t("home.todayWorked"),
      value: todayWorkedMs > 0 ? formatHoursMinutes(todayWorkedMs) : "—",
    },
    {
      label: activeSession ? t("home.estIncome") : t("home.todayIncome"),
      value: hasIncome ? money(todayIncome) : "—",
      tone: "text-emerald-400",
    },
  ];
  if (live && live.remainingMs !== null) {
    summaryStats.push({
      label: t("home.untilOff"),
      value: live.remainingMs > 0 ? formatHoursMinutes(live.remainingMs) : t("home.overtime"),
    });
    summaryStats.push({
      label: t("home.estAtEnd"),
      value: live.endIncome !== null ? money(live.endIncome) : "—",
      tone: "text-emerald-400",
    });
  }

  return (
    <main className="bg-gray-950 text-white">
      <div className={`max-w-md mx-auto ${SPACE.page}`}>

        {/* Header */}
        <PageHeader
          title="Work Tracker"
          subtitle={formatTodayLabel()}
          action={
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className={`-mr-2 ${HIT} ${RADIUS.cell} ${SURFACE.navBtn} text-gray-400 hover:text-white transition-all duration-150`}
            aria-label={t("settings.title")}
          >
            <svg className={ICON.md} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          }
        />
        {showSettings && deviceId && (
          <SettingsModal deviceId={deviceId} onClose={() => setShowSettings(false)} />
        )}

        {/* 今日摘要 */}
        <div
          className={`${SURFACE.card} ${RADIUS.card} ${SPACE.card} ${SPACE.afterCard} ${
            activeSession ? "ring-1 ring-emerald-500/25" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <span className={TYPE.cardLabel}>{t("home.summaryTitle")}</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 border ${RADIUS.pill} ${TYPE.badgeLabel} ${STATUS_STYLE[status]}`}
            >
              {status === "working" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              {t(`home.status.${status}`)}
            </span>
          </div>

          {activeSession && (
            <div className="mt-4 text-center">
              <p className="font-mono font-bold text-[40px] leading-none tabular-nums">{formatDuration(elapsed)}</p>
              <p className={`mt-2 ${TYPE.rowMeta}`}>
                {activeSession.job.name} · {t("home.since", { time: fmtTime(activeSession.clockIn) })}
              </p>
            </div>
          )}

          <div className={`mt-4 pt-4 grid grid-cols-2 gap-4 ${SURFACE.divider}`}>
            {summaryStats.map((s) => (
              <StatField key={s.label} size="md" label={s.label} value={s.value} tone={s.tone} />
            ))}
          </div>

          <div className={`mt-4 pt-4 grid grid-cols-3 gap-3 ${SURFACE.divider}`}>
            <StatField
              label={t("home.weekIncome")}
              value={periodIncome.week > 0 ? money(periodIncome.week) : "—"}
              tone={COLOR.success}
            />
            <StatField
              label={t("home.monthIncome")}
              value={periodIncome.month > 0 ? money(periodIncome.month) : "—"}
              tone={COLOR.success}
            />
            <StatField
              label={t("jobs.stat.nextPay")}
              value={nextPayday ? fmtMonthDay(nextPayday) : "—"}
              icon={
                <svg className={ICON.xs} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path strokeLinecap="round" d="M3 9h18M8 3v4M16 3v4" />
                </svg>
              }
            />
          </div>
        </div>

        {/* 打卡 */}
        {jobs.length === 0 && !activeSession ? (
          <EmptyState
            icon={
              <svg className={ICON.lg} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path strokeLinecap="round" d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              </svg>
            }
            title={t("home.noJobs")}
            description={t("jobs.empty.desc")}
            action={
              <Link
                href="/jobs"
                className={`inline-block ${COLOR.primary} active:scale-[0.98] ${TYPE.control} px-4 py-2 ${RADIUS.chip} transition-all duration-150`}
              >
                {t("home.goToJobs")}
              </Link>
            }
          />
        ) : (
          <>
            <div className={`${FORM.card} ${FORM.fieldGap} ${SPACE.afterCard}`}>
              {activeSession ? (
                <div>
                  <p className={FORM.label}>{t("records.work")}</p>
                  <p className="mt-1.5 text-[15px] font-semibold leading-5">{activeSession.job.name}</p>
                </div>
              ) : (
                <SelectField
                  label={t("home.selectJob")}
                  value={selectedJobId}
                  onChange={(e) => { setSelectedJobId(e.target.value); setFixedFeedback(""); }}
                  options={jobs.map((j) => ({ value: j.id, label: j.name }))}
                />
              )}

              {/* 工作資訊：固定班 badge + 時薪 */}
              {(activeSession?.job ?? selectedJob) && (
                <div className="flex items-center gap-2 -mt-2">
                  {(activeSession?.job ?? selectedJob)!.scheduleType === "fixed" && (
                    <span className={`px-1.5 border ${RADIUS.pill} ${TYPE.badgeLabel} bg-gray-700/60 text-gray-300 border-gray-600`}>
                      {t("home.fixedTag")}
                    </span>
                  )}
                  <span className={`${TYPE.rowValue} text-gray-300`}>
                    {(activeSession?.job ?? selectedJob)!.hourlyRate != null
                      ? `$${(activeSession?.job ?? selectedJob)!.hourlyRate}/hr`
                      : (activeSession?.job ?? selectedJob)!.commissionPercentage != null
                      ? t("jobs.commission", { pct: (((activeSession?.job ?? selectedJob)!.commissionPercentage ?? 0) * 100).toFixed(0) })
                      : t("jobs.notSet")}
                  </span>
                </div>
              )}

              {/* 固定班：預設班表 */}
              {!activeSession && isFixedSchedule && (
                <div className="pt-4 border-t border-gray-700">
                  <div className="flex items-center justify-between gap-3">
                    <p className={FORM.sectionTitle}>{t("home.defaultShift")}</p>
                    <button
                      type="button"
                      onClick={applyPresetTimes}
                      className={`px-2.5 py-1 rounded-lg bg-gray-700 text-gray-300 ${TYPE.rowMeta} hover:bg-gray-600 active:scale-[0.98] transition-all duration-150`}
                    >
                      {t("records.usePreset")}
                    </button>
                  </div>
                  <p className={`mt-1 ${FORM.helper}`}>{t("home.defaultShiftHint")}</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <TimeField
                      label={t("common.clockIn")}
                      value={fixedTimeIn}
                      placeholder="--:--"
                      onChange={(e) => setFixedTimeIn(e.target.value)}
                    />
                    <TimeField
                      label={t("common.clockOut")}
                      value={fixedTimeOut}
                      placeholder="--:--"
                      onChange={(e) => setFixedTimeOut(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {showRevenue && (
                <TextField
                  type="number"
                  label={t("home.todayRevenue")}
                  required={revenueRequired}
                  prefix="$"
                  value={dailyRevenue}
                  onChange={(e) => setDailyRevenue(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              )}

              {showHoliday && (
                <ToggleRow
                  label={t("home.publicHoliday")}
                  checked={isPublicHoliday}
                  onChange={() => setIsPublicHoliday((v) => !v)}
                />
              )}

              {activeSession && (
                <TextAreaField
                  label={t("common.notes")}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("common.notesPlaceholder")}
                  rows={2}
                />
              )}
            </div>

            {/* Primary action */}
            {activeSession ? (
              <button
                onClick={handleClockOut}
                disabled={submitting || revenueMissing}
                className={`w-full ${FORM.btnStop} inline-flex items-center justify-center gap-2`}
              >
                {submitting && <Spinner />}
                {t("home.clockOut")}
              </button>
            ) : doneForToday ? (
              <>
                <button disabled className={`w-full ${FORM.btnPrimary}`}>
                  {t("home.doneToday")}
                </button>
                <button
                  onClick={() => setClockAgain(true)}
                  className={`mt-2 w-full py-2 ${TYPE.control} text-gray-400 hover:text-white transition-colors`}
                >
                  {t("home.clockAgain")}
                </button>
              </>
            ) : isFixedSchedule ? (
              <button
                onClick={handleFixedClockIn}
                disabled={submittingFixed || !fixedTimeIn || !fixedTimeOut || revenueMissing}
                className={`w-full ${FORM.btnPrimary} inline-flex items-center justify-center gap-2`}
              >
                {submittingFixed && <Spinner />}
                {t("home.fixedAddBtn")}
              </button>
            ) : (
              <button
                onClick={handleClockIn}
                disabled={submitting || !selectedJobId}
                className={`w-full ${FORM.btnPrimary} inline-flex items-center justify-center gap-2`}
              >
                {submitting && <Spinner />}
                {t("home.clockIn")}
              </button>
            )}

            {clockError && <p className={`mt-2 text-center ${FORM.error}`}>{clockError}</p>}
            {fixedFeedback && <p className="mt-2 text-center text-[11px] leading-4 text-emerald-400">{fixedFeedback}</p>}
            {!clockError && revenueMissing && (
              <p className={`mt-2 text-center ${FORM.helper}`}>{t("home.revenueRequiredHint")}</p>
            )}
          </>
        )}

        {/* 最近紀錄 */}
        <div className="mt-8">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className={TYPE.sectionLabel}>{t("home.recent")}</h2>
            {recent.length > 0 && (
              <Link href="/records" className={`${TYPE.control} text-blue-400 hover:text-blue-300 transition-colors`}>
                {t("home.viewMore")} →
              </Link>
            )}
          </div>

          {recent.length === 0 ? (
            <EmptyState
              compact
              icon={
                <svg className={ICON.lg} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                  <path strokeLinecap="round" d="M9.5 9h5M9.5 13h5M9.5 17h3" />
                </svg>
              }
              title={t("home.empty.title")}
              description={t("home.empty.desc")}
            />
          ) : (
            <div className="space-y-2">
              {recent.map((session) => {
                const done = session.clockOut !== null;
                const duration = totalWorkMs(session) ?? 0;
                const net = calcSessionIncome(session, taxRate);
                return (
                  <Link
                    key={session.id}
                    href="/records"
                    className={`block ${SURFACE.card} ${RADIUS.cell} px-3.5 py-3 ${SURFACE.hover} active:scale-[0.98] transition-all duration-150`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[15px] font-semibold leading-5 truncate">{session.job.name}</p>
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 px-1.5 border ${RADIUS.pill} ${TYPE.badgeLabel} ${
                          done
                            ? "bg-blue-500/10 text-blue-300 border-blue-500/25"
                            : "bg-amber-500/10 text-amber-300 border-amber-500/25"
                        }`}
                      >
                        {done ? "✓" : "⚠"} {t(done ? "home.badge.done" : "home.badge.unfinished")}
                      </span>
                    </div>
                    <p className={`mt-0.5 ${TYPE.rowMeta}`}>
                      {fmtDateWeekday(session.clockIn)} · {fmtTime(session.clockIn)}
                      {session.clockOut ? ` – ${fmtTime(session.clockOut)}` : ""}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1 ${TYPE.rowValue} text-gray-300`}>
                        <ClockIcon />
                        {done ? formatHoursMinutes(duration) : "—"}
                      </span>
                      <span className={`inline-flex items-center gap-1 ${TYPE.rowValue} text-emerald-400`}>
                        <MoneyIcon />
                        {net !== null ? money(net) : "—"}
                      </span>
                    </div>
                    {session.notes && (
                      <p className="mt-2 text-[12px] leading-4 text-gray-400 truncate">{session.notes}</p>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
