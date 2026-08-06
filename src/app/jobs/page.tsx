"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { AddJobForm } from "@/components/AddJobForm";
import { EditJobForm } from "@/components/EditJobForm";
import { StatField } from "@/components/StatField";
import { useDevice } from "@/hooks/useDevice";
import { useLocale } from "@/hooks/useLocale";
import { useTaxRate } from "@/hooks/useTaxRate";
import { useIncomeMode } from "@/hooks/useIncomeMode";
import { calcSessionIncome, calcSessionGross, totalWorkMs } from "@/lib/income";
import { formatHoursMinutes, fmtMonthDay } from "@/lib/format";
import { getNextPayday } from "@/lib/payday";
import { getCached, setCached } from "@/lib/api-cache";
import { RADIUS, SPACE, SURFACE, TYPE, money } from "@/lib/theme";
import type { Job, WorkSession } from "@/types/api";

export default function JobsPage() {
  const { deviceId, loaded } = useDevice();
  const { t } = useLocale();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddJob, setShowAddJob] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [taxRateInput, setTaxRateInput] = useState("0");
  const taxRate = useTaxRate();
  const [incomeMode] = useIncomeMode();

  useEffect(() => {
    const stored = localStorage.getItem("taxRate") ?? "0";
    setTaxRateInput(stored);
  }, []);

  const fetchJobs = useCallback(async (id: string) => {
    const res = await fetch("/api/jobs", { headers: { "x-device-id": id } });
    if (res.ok) {
      const data: Job[] = await res.json();
      setJobs(data);
      setCached(`jobs:${id}`, data);
    }
  }, []);

  const fetchMonthSessions = useCallback(async (id: string) => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const res = await fetch(
      `/api/sessions?since=${from.toISOString()}&to=${to.toISOString()}&limit=500`,
      { headers: { "x-device-id": id } }
    );
    if (res.ok) {
      const data: WorkSession[] = await res.json();
      const completed = data.filter((s) => s.clockOut !== null);
      setSessions(completed);
      setCached(`jobsMonth:${id}`, completed);
    }
  }, []);

  useEffect(() => {
    if (!deviceId || !loaded) return;
    const cached = getCached<Job[]>(`jobs:${deviceId}`);
    if (cached) {
      setJobs(cached);
      setLoading(false);
    }
    setSessions(getCached<WorkSession[]>(`jobsMonth:${deviceId}`) ?? []);
    fetchJobs(deviceId).finally(() => setLoading(false));
    fetchMonthSessions(deviceId);
  }, [deviceId, loaded, fetchJobs, fetchMonthSessions]);

  const monthStatsByJob = useMemo(() => {
    const map = new Map<string, { income: number; workMs: number }>();
    for (const s of sessions) {
      const cur = map.get(s.jobId) ?? { income: 0, workMs: 0 };
      cur.income += (incomeMode === "net" ? calcSessionIncome(s, taxRate) : calcSessionGross(s)) ?? 0;
      cur.workMs += totalWorkMs(s) ?? 0;
      map.set(s.jobId, cur);
    }
    return map;
  }, [sessions, incomeMode, taxRate]);

  const handleTaxRateSave = () => {
    const val = parseFloat(taxRateInput);
    const clamped = isNaN(val) ? 0 : Math.min(Math.max(val, 0), 100);
    localStorage.setItem("taxRate", clamped.toString());
    setTaxRateInput(clamped.toString());
  };

  if (!loaded || loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-950">
        <div className="text-white">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <main className="bg-gray-950 text-white">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">{t("jobs.title")}</h1>
          <div className="flex items-center gap-1.5">
            <span className={TYPE.statLabel}>{t("jobs.taxRate")}</span>
            <div className="relative">
              <input
                type="number"
                value={taxRateInput}
                onChange={(e) => setTaxRateInput(e.target.value)}
                onBlur={handleTaxRateSave}
                onFocus={(e) => e.target.select()}
                min="0"
                max="100"
                step="0.1"
                placeholder="0"
                className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-white text-sm pr-5 focus:outline-none focus:border-blue-500 text-right"
              />
              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%</span>
            </div>
          </div>
        </div>

        {/* Add job button */}
        <div className="flex items-center justify-between mb-3">
          <h2 className={`${TYPE.statLabel} uppercase`}>{t("jobs.list")}</h2>
          <button
            onClick={() => { setShowAddJob((v) => !v); setEditingJobId(null); }}
            className={`bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-[13px] font-medium px-3.5 py-1.5 ${RADIUS.chip} transition-all duration-150`}
          >
            {t("jobs.addBtn")}
          </button>
        </div>

        {showAddJob && (
          <AddJobForm
            deviceId={deviceId!}
            onJobAdded={(job) => {
              setJobs((prev) => [...prev, job]);
              setShowAddJob(false);
            }}
            onCancel={() => setShowAddJob(false)}
          />
        )}

        {jobs.length === 0 && !showAddJob && (
          <div className={`${SURFACE.card} ${RADIUS.card} px-6 py-10 text-center`}>
            <svg className="w-10 h-10 mx-auto text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path strokeLinecap="round" d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            </svg>
            <p className="mt-3 text-[15px] font-semibold">{t("jobs.empty.title")}</p>
            <p className="mt-1 text-[13px] text-gray-500">{t("jobs.empty.desc")}</p>
            <button
              onClick={() => setShowAddJob(true)}
              className={`mt-5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-[13px] font-medium px-4 py-2 ${RADIUS.chip} transition-all duration-150`}
            >
              {t("jobs.empty.cta")}
            </button>
          </div>
        )}

        <div className="space-y-3">
          {jobs.map((job) => {
            const isEditing = editingJobId === job.id;
            const payInfo = job.hourlyRate != null
              ? `$${job.hourlyRate}/hr`
              : job.commissionPercentage != null
              ? t("jobs.commission", { pct: (job.commissionPercentage * 100).toFixed(0) })
              : t("jobs.notSet");
            const payDayLabel = job.payFrequency === "weekly" && job.payDay != null
              ? t("jobs.weeklyOn", { day: t(`wd.${job.payDay}`) })
              : job.payFrequency === "monthly" && job.payDay != null
              ? t("jobs.monthlyOn", { day: job.payDay })
              : "";
            const stats = monthStatsByJob.get(job.id);
            const nextPayday = getNextPayday(job);

            return (
              <div key={job.id}>
                <button
                  onClick={() => {
                    setEditingJobId(isEditing ? null : job.id);
                    setShowAddJob(false);
                  }}
                  className={`w-full text-left ${SURFACE.card} ${RADIUS.card} ${SPACE.card} hover:bg-gray-800/60 hover:shadow-xl hover:shadow-black/30 active:scale-[0.98] transition-all duration-150`}
                >
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{job.name}</p>
                    {job.taxEnabled && (
                      <span className="shrink-0 text-[10px] leading-4 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 rounded-md">
                        {t("jobs.taxBadge")}
                      </span>
                    )}
                    <svg
                      className={`ml-auto shrink-0 w-4 h-4 text-gray-500 transition-transform duration-200 ${isEditing ? "rotate-90" : ""}`}
                      fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>

                  <p className="mt-0.5 text-[15px] font-semibold leading-5 text-gray-100 tabular-nums truncate">
                    {payInfo}
                  </p>

                  <div className={`mt-3 pt-3 grid grid-cols-3 gap-3 ${SURFACE.divider}`}>
                    <StatField
                      label={t("jobs.stat.income")}
                      value={stats ? money(stats.income) : "—"}
                      tone="text-emerald-400"
                    />
                    <StatField
                      label={t("jobs.stat.hours")}
                      value={stats && stats.workMs > 0 ? formatHoursMinutes(stats.workMs) : "—"}
                    />
                    <StatField
                      label={t("jobs.stat.nextPay")}
                      value={nextPayday ? fmtMonthDay(nextPayday) : "—"}
                      icon={
                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                          <rect x="3" y="5" width="18" height="16" rx="2" />
                          <path strokeLinecap="round" d="M3 9h18M8 3v4M16 3v4" />
                        </svg>
                      }
                    />
                  </div>

                  <p className={`mt-3 ${TYPE.statLabel} truncate`}>
                    {t(`jobs.freq.${job.payFrequency}`)}
                    {payDayLabel && ` · ${payDayLabel}`}
                  </p>
                </button>

                {isEditing && (
                  <EditJobForm
                    job={job}
                    deviceId={deviceId!}
                    onSaved={(updated) => {
                      setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
                      setEditingJobId(null);
                    }}
                    onCancel={() => setEditingJobId(null)}
                    onDeleted={(jobId) => {
                      setJobs((prev) => prev.filter((j) => j.id !== jobId));
                      setEditingJobId(null);
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
