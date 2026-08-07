"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useDevice } from "@/hooks/useDevice";
import { useTaxRate } from "@/hooks/useTaxRate";
import { useLocale } from "@/hooks/useLocale";
import { useIncomeMode, type IncomeMode } from "@/hooks/useIncomeMode";
import { RecordForm, draftFromSession, emptyDraft, type RecordDraft } from "@/components/RecordForm";
import { calcSessionIncome, calcSessionGross, totalWorkMs } from "@/lib/income";
import { formatHoursMinutes, fmtTime, fmtDateWeekday } from "@/lib/format";
import { getCached, hasCached, setCached } from "@/lib/api-cache";
import { INCOME, PERIOD, RADIUS, SPACE, SURFACE, TYPE, type PeriodKind } from "@/lib/theme";
import type { Job, WorkSession } from "@/types/api";

function localDateStr(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function isWeeklyPeriod(job: Job): boolean {
  return job.payFrequency === "weekly" && job.payDay != null;
}

function periodKeyForSession(session: WorkSession): string {
  const d = new Date(session.clockIn);
  const job = session.job;
  if (isWeeklyPeriod(job)) {
    if (job.payWeekStart != null) {
      const dow = d.getDay();
      const daysFromStart = (dow - job.payWeekStart + 7) % 7;
      const periodStart = new Date(d);
      periodStart.setDate(d.getDate() - daysFromStart);
      periodStart.setHours(0, 0, 0, 0);
      const periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + 6);
      const periodEndDow = periodEnd.getDay();
      const daysUntilPayday = (job.payDay! - periodEndDow + 7) % 7 || 7;
      const payday = new Date(periodEnd);
      payday.setDate(periodEnd.getDate() + daysUntilPayday);
      payday.setHours(0, 0, 0, 0);
      return localDateStr(payday);
    }
    const dow = d.getDay();
    const diff = job.payDay! <= dow ? 7 - (dow - job.payDay!) : job.payDay! - dow;
    const payday = new Date(d);
    payday.setDate(d.getDate() + diff);
    payday.setHours(0, 0, 0, 0);
    return localDateStr(payday);
  }
  return `${d.getFullYear()}-${d.getMonth() + 1}`;
}

function periodLabel(key: string, job: Job, locale: "zh" | "en"): string {
  if (isWeeklyPeriod(job)) {
    const payday = new Date(key);
    const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
    if (job.payWeekStart != null) {
      const periodEndDow = (job.payWeekStart - 1 + 7) % 7;
      const payDayDow = payday.getDay();
      const daysFromPeriodEndToPayday = (payDayDow - periodEndDow + 7) % 7 || 7;
      const periodEnd = new Date(payday);
      periodEnd.setDate(payday.getDate() - daysFromPeriodEndToPayday);
      const periodStart = new Date(periodEnd);
      periodStart.setDate(periodEnd.getDate() - 6);
      return `${fmt(periodStart)} – ${fmt(periodEnd)}`;
    }
    const periodEnd = new Date(payday);
    periodEnd.setDate(payday.getDate() - 1);
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodEnd.getDate() - 6);
    return `${fmt(periodStart)} – ${fmt(periodEnd)}`;
  }
  const [y, m] = key.split("-");
  const monthsEn = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return locale === "en" ? `${monthsEn[parseInt(m) - 1]} ${y}` : `${y}年${m}月`;
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

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 shrink-0 text-gray-500 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
      fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

type FilterPeriod = "all" | "week" | "month";
type Editor =
  | { mode: "add"; draft: RecordDraft }
  | { mode: "edit"; session: WorkSession; draft: RecordDraft };

export default function RecordsPage() {
  const { deviceId, loaded } = useDevice();
  const { t, locale } = useLocale();
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const taxRate = useTaxRate();
  const [incomeMode, setIncomeMode] = useIncomeMode();

  const [filterJobId, setFilterJobId] = useState<string>("");
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("week");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [collapseOverrides, setCollapseOverrides] = useState<Set<string>>(new Set());

  const fetchJobs = useCallback(async (id: string) => {
    const res = await fetch("/api/jobs", { headers: { "x-device-id": id } });
    if (res.ok) {
      const jobData: Job[] = await res.json();
      setJobs(jobData);
      setCached(`jobs:${id}`, jobData);
    }
  }, []);

  const fetchSessions = useCallback(async (id: string, period: FilterPeriod) => {
    let qs = "limit=500";
    const now = new Date();
    if (period === "week") {
      const dow = now.getDay();
      const start = new Date(now);
      start.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
      start.setHours(0, 0, 0, 0);
      qs += `&since=${start.toISOString()}`;
    } else if (period === "month") {
      qs += `&since=${new Date(now.getFullYear(), now.getMonth(), 1).toISOString()}`;
    }
    const res = await fetch(`/api/sessions?${qs}`, { headers: { "x-device-id": id } });
    if (res.ok) {
      const data: WorkSession[] = await res.json();
      setSessions(data);
      setCached(`sessions:${id}:${period}`, data);
    }
  }, []);

  useEffect(() => {
    if (!deviceId || !loaded) return;
    const cachedJobs = getCached<Job[]>(`jobs:${deviceId}`);
    if (cachedJobs) setJobs(cachedJobs);
    fetchJobs(deviceId);
  }, [deviceId, loaded, fetchJobs]);

  useEffect(() => {
    if (!deviceId || !loaded) return;
    const key = `sessions:${deviceId}:${filterPeriod}`;
    if (hasCached(key)) {
      setSessions(getCached<WorkSession[]>(key) ?? []);
      setLoading(false);
    }
    fetchSessions(deviceId, filterPeriod).finally(() => setLoading(false));
  }, [deviceId, loaded, filterPeriod, fetchSessions]);

  const completedSessions = useMemo(
    () => sessions.filter((s) => s.clockOut !== null),
    [sessions]
  );

  const filteredSessions = useMemo(() => {
    let result = completedSessions;
    if (filterJobId) {
      result = result.filter((s) => s.jobId === filterJobId);
    }
    if (filterPeriod !== "all") {
      const now = new Date();
      let start: Date, end: Date;
      if (filterPeriod === "week") {
        const dow = now.getDay();
        start = new Date(now);
        start.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 7);
      } else {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      }
      result = result.filter((s) => {
        const time = new Date(s.clockIn).getTime();
        return time >= start.getTime() && time <= end.getTime();
      });
    }
    return result;
  }, [completedSessions, filterJobId, filterPeriod]);

  const grouped = useMemo(() => {
    const byJob = new Map<string, Map<string, WorkSession[]>>();
    for (const s of filteredSessions) {
      if (!byJob.has(s.jobId)) byJob.set(s.jobId, new Map());
      const key = periodKeyForSession(s);
      const periodMap = byJob.get(s.jobId)!;
      if (!periodMap.has(key)) periodMap.set(key, []);
      periodMap.get(key)!.push(s);
    }
    return byJob;
  }, [filteredSessions]);

  const amountOf = useCallback(
    (s: WorkSession) => (incomeMode === "net" ? calcSessionIncome(s, taxRate) : calcSessionGross(s)),
    [incomeMode, taxRate]
  );

  async function refresh() {
    if (deviceId) await fetchSessions(deviceId, filterPeriod);
  }

  function openAdd() {
    setMenuId(null);
    setEditor({ mode: "add", draft: emptyDraft(jobs) });
  }

  function openEdit(s: WorkSession) {
    setMenuId(null);
    setEditor({ mode: "edit", session: s, draft: draftFromSession(s) });
  }

  function openDuplicate(s: WorkSession) {
    setMenuId(null);
    setEditor({ mode: "add", draft: draftFromSession(s) });
  }

  async function handleDelete(id: string) {
    setMenuId(null);
    if (!deviceId) return;
    if (!window.confirm(t("records.deleteConfirm"))) return;
    const res = await fetch(`/api/sessions/${id}`, {
      method: "DELETE",
      headers: { "x-device-id": deviceId },
    });
    if (res.ok) {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        setCached(`sessions:${deviceId}:${filterPeriod}`, next);
        return next;
      });
    }
  }

  if (!loaded || loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-950">
        <div className="text-white">{t("common.loading")}</div>
      </div>
    );
  }

  const jobsWithSessions = jobs.filter((j) => grouped.has(j.id));
  const showAddForm = editor?.mode === "add";

  return (
    <main className="bg-gray-950 text-white">
      <div className={`max-w-md mx-auto ${SPACE.page}`}>

        <div className={`flex items-center justify-between gap-3 ${SPACE.afterHeader}`}>
          <h1 className={TYPE.pageTitle}>{t("records.title")}</h1>
          <button
            onClick={() => (showAddForm ? setEditor(null) : openAdd())}
            className={`shrink-0 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white ${TYPE.control} px-3.5 py-1.5 ${RADIUS.chip} transition-all duration-150`}
          >
            {showAddForm ? t("common.cancel") : t("records.addBtn")}
          </button>
        </div>

        {showAddForm && (
          <RecordForm
            mode="add"
            jobs={jobs}
            initial={editor.draft}
            deviceId={deviceId!}
            onSaved={async () => {
              await refresh();
              setEditor(null);
            }}
            onCancel={() => setEditor(null)}
          />
        )}

        {!showAddForm && (
          <>
            {/* Filters */}
            <div className="mb-5 space-y-3">
              <div>
                <p className={TYPE.sectionLabel}>{t("records.filterJob")}</p>
                <div className={`mt-1.5 flex gap-0.5 p-0.5 overflow-x-auto scrollbar-hide ${RADIUS.cell} ${SURFACE.segment}`}>
                  {[{ id: "", name: t("records.filterAll") }, ...jobs].map((j) => (
                    <button
                      key={j.id}
                      onClick={() => setFilterJobId(j.id)}
                      className={`shrink-0 h-8 px-3 ${RADIUS.chip} ${TYPE.control} transition-colors ${
                        filterJobId === j.id ? SURFACE.segmentOn : SURFACE.segmentOff
                      }`}
                    >
                      {j.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className={TYPE.sectionLabel}>{t("records.filterPeriod")}</p>
                  <div className={`flex items-center gap-0.5 p-0.5 ${RADIUS.chip} ${SURFACE.segment}`}>
                    {(["net", "gross"] as IncomeMode[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => setIncomeMode(m)}
                        className={`px-2 py-1 ${RADIUS.pill} ${TYPE.segment} transition-colors ${
                          incomeMode === m ? SURFACE.segmentOn : SURFACE.segmentOff
                        }`}
                      >
                        {t(`cal.mode.${m}`)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={`mt-1.5 flex gap-0.5 p-0.5 ${RADIUS.cell} ${SURFACE.segment}`}>
                  {(["all", "week", "month"] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setFilterPeriod(period)}
                      className={`flex-1 h-8 ${RADIUS.chip} ${TYPE.control} transition-colors ${
                        filterPeriod === period ? SURFACE.segmentOn : SURFACE.segmentOff
                      }`}
                    >
                      {period === "all" ? t("records.filterAll") : period === "week" ? t("records.filterWeek") : t("records.filterMonth")}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {jobsWithSessions.length === 0 ? (
              completedSessions.length === 0 && filterPeriod === "all" && !filterJobId ? (
                <div className={`${SURFACE.card} ${RADIUS.card} px-6 py-10 text-center`}>
                  <svg className="w-10 h-10 mx-auto text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                    <path strokeLinecap="round" d="M9.5 9h5M9.5 13h5M9.5 17h3" />
                  </svg>
                  <p className="mt-3 text-[15px] font-semibold">{t("records.empty.title")}</p>
                  <p className="mt-1 text-[13px] text-gray-500">{t("records.empty.desc")}</p>
                  <button
                    onClick={openAdd}
                    className={`mt-5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white ${TYPE.control} px-4 py-2 ${RADIUS.chip} transition-all duration-150`}
                  >
                    {t("records.empty.cta")}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 py-20">
                  <p className="text-gray-500 text-sm">{t("records.empty")}</p>
                  <button
                    onClick={() => { setFilterPeriod("all"); setFilterJobId(""); }}
                    className={`px-3.5 py-2 bg-gray-800 hover:bg-gray-700 active:scale-[0.98] text-gray-300 ${TYPE.control} ${RADIUS.chip} transition-all duration-150`}
                  >
                    {t("records.showAll")}
                  </button>
                </div>
              )
            ) : (
              <div className="space-y-4">
                {jobsWithSessions.map((job) => {
                  const periodMap = grouped.get(job.id)!;
                  const sortedPeriodKeys = Array.from(periodMap.keys()).sort((a, b) => {
                    const dateA = new Date(a.split("-").length === 3 ? a : `${a}-01`);
                    const dateB = new Date(b.split("-").length === 3 ? b : `${b}-01`);
                    return dateB.getTime() - dateA.getTime();
                  });
                  const kind: PeriodKind = isWeeklyPeriod(job) ? "weekly" : "monthly";
                  const periodStyle = PERIOD[kind];

                  return (
                    <div key={job.id} className={`${SURFACE.card} ${RADIUS.card} ${SPACE.card}`}>
                      <h2 className={`${TYPE.rowTitle} mb-4`}>{job.name}</h2>

                      <div className={SPACE.group}>
                        {sortedPeriodKeys.map((periodKey, index) => {
                          const periodSessions = periodMap.get(periodKey)!.sort(
                            (a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime()
                          );
                          const openKey = `${job.id}:${periodKey}`;
                          const isOpen = collapseOverrides.has(openKey) ? index !== 0 : index === 0;
                          const label = periodLabel(periodKey, job, locale);
                          const payday = new Date(periodKey);
                          const subLabel = isWeeklyPeriod(job)
                            ? t("records.payDayLabel", { date: `${payday.getMonth() + 1}/${payday.getDate()}` })
                            : null;
                          const total = periodSessions.reduce((sum, s) => sum + (amountOf(s) ?? 0), 0);
                          const workMs = periodSessions.reduce((sum, s) => sum + (totalWorkMs(s) ?? 0), 0);
                          const days = new Set(periodSessions.map((s) => localDateStr(new Date(s.clockIn)))).size;
                          const hasIncome = periodSessions.some((s) => calcSessionGross(s) !== null);

                          return (
                            <div key={periodKey}>
                              <button
                                onClick={() =>
                                  setCollapseOverrides((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(openKey)) next.delete(openKey);
                                    else next.add(openKey);
                                    return next;
                                  })
                                }
                                aria-expanded={isOpen}
                                className="w-full text-left active:opacity-70 transition-opacity"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`shrink-0 px-1.5 border ${RADIUS.pill} ${TYPE.badgeLabel} ${periodStyle.badge}`}>
                                        {t(`cal.period.${kind}`)}
                                      </span>
                                      <span className={`${TYPE.rowTitle} truncate`}>{label}</span>
                                    </div>
                                    {subLabel && <p className={`mt-1 ${TYPE.rowMeta}`}>{subLabel}</p>}
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {hasIncome && (
                                      <div className="text-right">
                                        <p className={TYPE.statLabel}>{t(`cal.mode.${incomeMode}`)}</p>
                                        <p className={`${TYPE.cardSubValue} ${INCOME.text}`}>${total.toFixed(2)}</p>
                                      </div>
                                    )}
                                    <ChevronIcon open={isOpen} />
                                  </div>
                                </div>
                                <p className={`mt-2 flex items-center gap-2 ${TYPE.rowMeta} tabular-nums`}>
                                  <span>{t("records.summaryDays", { days })}</span>
                                  <span className="text-gray-700">·</span>
                                  <span className="inline-flex items-center gap-1">
                                    <ClockIcon />
                                    {formatHoursMinutes(workMs)}
                                  </span>
                                </p>
                              </button>

                              <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                                <div className="overflow-hidden">
                                  <div className="pt-3 space-y-2">
                                    {periodSessions.map((s) => {
                                      if (editor?.mode === "edit" && editor.session.id === s.id) {
                                        return (
                                          <RecordForm
                                            key={s.id}
                                            mode="edit"
                                            jobs={jobs}
                                            session={s}
                                            initial={editor.draft}
                                            deviceId={deviceId!}
                                            onSaved={async () => {
                                              await refresh();
                                              setEditor(null);
                                            }}
                                            onCancel={() => setEditor(null)}
                                          />
                                        );
                                      }

                                      const amount = amountOf(s);
                                      const duration = totalWorkMs(s) ?? 0;
                                      return (
                                        <div
                                          key={s.id}
                                          className={`relative bg-gray-800/60 ${RADIUS.cell} transition-transform duration-150 active:scale-[0.98]`}
                                        >
                                          <button
                                            onClick={() => openEdit(s)}
                                            className={`w-full text-left px-3.5 py-3 pr-12 ${RADIUS.cell} ${SURFACE.hover} transition-colors`}
                                          >
                                            <p className={TYPE.cardSubValue}>
                                              {fmtTime(s.clockIn)} – {s.clockOut ? fmtTime(s.clockOut) : t("records.inProgress")}
                                            </p>
                                            <p className={`mt-0.5 ${TYPE.rowMeta}`}>{fmtDateWeekday(s.clockIn)}</p>
                                            <div className="mt-2 flex items-center gap-3">
                                              <span className={`inline-flex items-center gap-1 ${TYPE.rowValue} text-gray-300`}>
                                                <ClockIcon />
                                                {formatHoursMinutes(duration)}
                                              </span>
                                              <span className={`inline-flex items-center gap-1 ${TYPE.rowValue} ${INCOME.text}`}>
                                                <MoneyIcon />
                                                {amount !== null ? `$${amount.toFixed(2)}` : t("records.commissionLabel")}
                                              </span>
                                            </div>
                                            {s.notes && (
                                              <p className="mt-2 text-[12px] leading-4 text-gray-400 whitespace-pre-wrap break-words">{s.notes}</p>
                                            )}
                                          </button>

                                          <button
                                            aria-label={t("records.more")}
                                            onClick={() => setMenuId((prev) => (prev === s.id ? null : s.id))}
                                            className={`absolute top-1.5 right-1.5 w-9 h-9 flex items-center justify-center ${RADIUS.chip} text-gray-500 hover:text-white hover:bg-gray-700 active:bg-gray-600 transition-colors`}
                                          >
                                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                              <circle cx="5" cy="12" r="1.6" />
                                              <circle cx="12" cy="12" r="1.6" />
                                              <circle cx="19" cy="12" r="1.6" />
                                            </svg>
                                          </button>

                                          {menuId === s.id && (
                                            <>
                                              <div className="fixed inset-0 z-10" onClick={() => setMenuId(null)} />
                                              <div className={`absolute top-11 right-1.5 z-20 w-32 overflow-hidden bg-gray-800 border border-gray-700 ${RADIUS.cell} shadow-xl shadow-black/40`}>
                                                {[
                                                  { label: t("common.edit"), onClick: () => openEdit(s), tone: "text-gray-200" },
                                                  { label: t("records.duplicate"), onClick: () => openDuplicate(s), tone: "text-gray-200" },
                                                  { label: t("common.delete"), onClick: () => handleDelete(s.id), tone: "text-red-400" },
                                                ].map((item) => (
                                                  <button
                                                    key={item.label}
                                                    onClick={item.onClick}
                                                    className={`w-full text-left px-3.5 py-2.5 ${TYPE.control} ${item.tone} hover:bg-gray-700 active:bg-gray-600 transition-colors`}
                                                  >
                                                    {item.label}
                                                  </button>
                                                ))}
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
