"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useDevice } from "@/hooks/useDevice";
import { calcSessionIncome, calcSessionGross } from "@/lib/income";

type OvertimeTier = { afterHours: number; rate: number };

type Job = {
  id: string;
  name: string;
  hourlyRate: number | null;
  commissionPercentage: number | null;
  commissionRequired: boolean;
  payFrequency: string;
  payDay: number | null;
  payWeekStart: number | null;
  taxEnabled: boolean;
  breakDuration: number | null;
  breakRate: number | null;
  penaltyRatesEnabled: boolean;
  penaltyBaseRate: number | null;
  publicHolidayRate: number;
  saturdayRate: number;
  sundayRate: number;
  saturdayHourlyRate: number | null;
  sundayHourlyRate: number | null;
  publicHolidayHourlyRate: number | null;
  overtimeTiers: OvertimeTier[];
};

type Break = { id: string; startTime: string; endTime: string | null; isPaid: boolean };

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

function localDateStr(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function toDatetimeLocal(isoString: string): string {
  const d = new Date(isoString);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function periodKeyForSession(session: WorkSession): string {
  const d = new Date(session.clockIn);
  const job = session.job;
  if (job.payFrequency === "weekly" && job.payDay != null) {
    if (job.payWeekStart != null) {
      const dow = d.getDay();
      const daysFromStart = (dow - job.payWeekStart + 7) % 7;
      const periodStart = new Date(d);
      periodStart.setDate(d.getDate() - daysFromStart);
      periodStart.setHours(0, 0, 0, 0);
      const periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + 6);
      const periodEndDow = periodEnd.getDay();
      let daysUntilPayday = (job.payDay - periodEndDow + 7) % 7 || 7;
      const payday = new Date(periodEnd);
      payday.setDate(periodEnd.getDate() + daysUntilPayday);
      payday.setHours(0, 0, 0, 0);
      return localDateStr(payday);
    }
    const dow = d.getDay();
    const diff = job.payDay <= dow ? 7 - (dow - job.payDay) : job.payDay - dow;
    const payday = new Date(d);
    payday.setDate(d.getDate() + diff);
    payday.setHours(0, 0, 0, 0);
    return localDateStr(payday);
  }
  return `${d.getFullYear()}-${d.getMonth() + 1}`;
}

function periodLabel(key: string, job: Job): string {
  if (job.payFrequency === "weekly" && job.payDay != null) {
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
  return `${y}年${m}月`;
}

function periodSubLabel(key: string, job: Job): string | null {
  if (job.payFrequency === "weekly" && job.payDay != null) {
    const payday = new Date(key);
    return `發薪日 ${payday.getMonth() + 1}/${payday.getDate()}`;
  }
  return null;
}

type FilterPeriod = "all" | "week" | "month";

export default function RecordsPage() {
  const { deviceId, loaded } = useDevice();
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [taxRate, setTaxRate] = useState(0);

  const [filterJobId, setFilterJobId] = useState<string>("");
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("all");

  const [showAddForm, setShowAddForm] = useState(false);
  const [addJobId, setAddJobId] = useState("");
  const [addDate, setAddDate] = useState("");
  const [addStart, setAddStart] = useState("");
  const [addEnd, setAddEnd] = useState("");
  const [addDailyRevenue, setAddDailyRevenue] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editClockIn, setEditClockIn] = useState("");
  const [editClockOut, setEditClockOut] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    const stored = parseFloat(localStorage.getItem("taxRate") ?? "0");
    setTaxRate(isNaN(stored) ? 0 : stored);
  }, []);

  const fetchAll = useCallback(async (id: string) => {
    const [sessRes, jobRes] = await Promise.all([
      fetch("/api/sessions?limit=500", { headers: { "x-device-id": id } }),
      fetch("/api/jobs", { headers: { "x-device-id": id } }),
    ]);
    if (sessRes.ok) setSessions(await sessRes.json());
    if (jobRes.ok) {
      const jobData: Job[] = await jobRes.json();
      setJobs(jobData);
      if (jobData.length === 1) setAddJobId(jobData[0].id);
    }
  }, []);

  useEffect(() => {
    if (!deviceId || !loaded) return;
    setLoading(true);
    fetchAll(deviceId).finally(() => setLoading(false));
  }, [deviceId, loaded, fetchAll]);

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
        const t = new Date(s.clockIn).getTime();
        return t >= start.getTime() && t <= end.getTime();
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

  function fmtTime(iso: string): string {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }

  function fmtDate(iso: string): string {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  const selectedAddJob = jobs.find((j) => j.id === addJobId);
  const isAddCommission = selectedAddJob?.commissionPercentage != null;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!deviceId || !addJobId || !addDate || !addStart || !addEnd) return;
    setAddSubmitting(true);
    const clockIn = new Date(`${addDate}T${addStart}`).toISOString();
    const clockOut = new Date(`${addDate}T${addEnd}`).toISOString();
    const body: Record<string, unknown> = { jobId: addJobId, clockIn, clockOut };
    if (isAddCommission && addDailyRevenue) body.dailyRevenue = parseFloat(addDailyRevenue);
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-device-id": deviceId },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      await fetchAll(deviceId);
      setShowAddForm(false);
      setAddDate("");
      setAddStart("");
      setAddEnd("");
      setAddDailyRevenue("");
    }
    setAddSubmitting(false);
  }

  function startEdit(s: WorkSession) {
    setEditingId(s.id);
    setEditClockIn(toDatetimeLocal(s.clockIn));
    setEditClockOut(s.clockOut ? toDatetimeLocal(s.clockOut) : "");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!deviceId || !editingId) return;
    setEditSubmitting(true);
    const body: Record<string, string> = {};
    if (editClockIn) body.clockIn = new Date(editClockIn).toISOString();
    if (editClockOut) body.clockOut = new Date(editClockOut).toISOString();
    const res = await fetch(`/api/sessions/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-device-id": deviceId },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      await fetchAll(deviceId);
      setEditingId(null);
    }
    setEditSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!deviceId) return;
    if (!window.confirm("確定要刪除這筆紀錄嗎？")) return;
    setSessions((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/sessions/${id}`, {
      method: "DELETE",
      headers: { "x-device-id": deviceId },
    });
  }

  if (!loaded || loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-950">
        <div className="text-white">載入中...</div>
      </div>
    );
  }

  const jobsWithSessions = jobs.filter((j) => grouped.has(j.id));

  return (
    <main className="bg-gray-950 text-white">
      <div className="max-w-md mx-auto px-4 py-6">

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold">打卡紀錄</h1>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="text-sm px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            {showAddForm ? "取消" : "+ 新增"}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleAdd} className="bg-gray-800 rounded-2xl p-4 mb-4 space-y-3 overflow-hidden">
            <p className="text-sm font-medium text-gray-300">新增打卡紀錄</p>
            <div>
              <label className="text-xs text-gray-400 block mb-1">工作</label>
              <select
                value={addJobId}
                onChange={(e) => setAddJobId(e.target.value)}
                required
                className="block w-full max-w-full min-w-0 bg-gray-700 rounded-xl px-3 py-2 text-sm text-white"
              >
                <option value="">選擇工作...</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>{j.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">日期</label>
              <input
                type="date"
                value={addDate}
                onChange={(e) => setAddDate(e.target.value)}
                required
                className="block w-full max-w-full min-w-0 bg-gray-700 rounded-xl px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="min-w-0 overflow-hidden">
                <label className="text-xs text-gray-400 block mb-1">上班時間</label>
                <input
                  type="time"
                  value={addStart}
                  onChange={(e) => setAddStart(e.target.value)}
                  required
                  className="block w-full max-w-full min-w-0 bg-gray-700 rounded-xl px-2 py-2 text-sm text-white"
                />
              </div>
              <div className="min-w-0 overflow-hidden">
                <label className="text-xs text-gray-400 block mb-1">下班時間</label>
                <input
                  type="time"
                  value={addEnd}
                  onChange={(e) => setAddEnd(e.target.value)}
                  required
                  className="block w-full max-w-full min-w-0 bg-gray-700 rounded-xl px-2 py-2 text-sm text-white"
                />
              </div>
            </div>
            {isAddCommission && (
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  今日業績
                  {selectedAddJob?.commissionRequired
                    ? <span className="text-red-400 ml-1">（必填）</span>
                    : <span className="text-gray-500 ml-1">（選填）</span>
                  }
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    value={addDailyRevenue}
                    onChange={(e) => setAddDailyRevenue(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required={selectedAddJob?.commissionRequired}
                    className="block w-full max-w-full min-w-0 bg-gray-700 rounded-xl pl-7 pr-3 py-2 text-sm text-white placeholder-gray-500"
                  />
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm font-medium transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={addSubmitting}
                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {addSubmitting ? "儲存中..." : "儲存"}
              </button>
            </div>
          </form>
        )}

        {!showAddForm && (
          <>
            {/* Filters */}
            <div className="mb-4 space-y-2">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  onClick={() => setFilterJobId("")}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-sm transition-colors ${
                    filterJobId === "" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  全部
                </button>
                {jobs.map((j) => (
                  <button
                    key={j.id}
                    onClick={() => setFilterJobId(j.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-xl text-sm transition-colors ${
                      filterJobId === j.id ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
                    }`}
                  >
                    {j.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {(["all", "week", "month"] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setFilterPeriod(period)}
                    className={`flex-1 py-1.5 rounded-xl text-sm transition-colors ${
                      filterPeriod === period ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
                    }`}
                  >
                    {period === "all" ? "全部" : period === "week" ? "本週" : "本月"}
                  </button>
                ))}
              </div>
            </div>

            {jobsWithSessions.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-gray-500 text-sm">沒有符合的打卡紀錄</p>
              </div>
            ) : (
              jobsWithSessions.map((job) => {
                const periodMap = grouped.get(job.id)!;
                const sortedPeriodKeys = Array.from(periodMap.keys()).sort((a, b) => {
                  const dateA = new Date(a.includes("-") && a.split("-").length === 3 ? a : `${a}-01`);
                  const dateB = new Date(b.includes("-") && b.split("-").length === 3 ? b : `${b}-01`);
                  return dateB.getTime() - dateA.getTime();
                });

                return (
                  <div key={job.id} className="bg-gray-800 rounded-2xl p-4 mb-4">
                    <h2 className="text-base font-semibold mb-3">{job.name}</h2>

                    {sortedPeriodKeys.map((periodKey) => {
                      const periodSessions = periodMap.get(periodKey)!.sort(
                        (a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime()
                      );
                      const label = periodLabel(periodKey, job);
                      const subLabel = periodSubLabel(periodKey, job);
                      const periodGross = periodSessions.reduce((sum, s) => sum + (calcSessionGross(s) ?? 0), 0);
                      const periodNet = periodSessions.reduce((sum, s) => sum + (calcSessionIncome(s, taxRate) ?? 0), 0);
                      const hasTax = taxRate > 0 && periodSessions.some((s) => s.job.taxEnabled);
                      const hasIncome = periodSessions.some((s) => calcSessionGross(s) !== null);

                      return (
                        <div key={periodKey} className="mb-4 last:mb-0">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className="text-sm text-gray-300 font-medium">{label}</span>
                              {subLabel && (
                                <span className="text-xs text-gray-500 ml-2">{subLabel}</span>
                              )}
                            </div>
                            {hasIncome && (
                              <div className="text-right">
                                {hasTax ? (
                                  <>
                                    <div className="text-xs text-gray-500">稅前 ${periodGross.toFixed(2)}</div>
                                    <div className="text-sm font-semibold text-green-400">${periodNet.toFixed(2)}</div>
                                  </>
                                ) : (
                                  <span className="text-sm font-semibold text-green-400">${periodGross.toFixed(2)}</span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            {periodSessions.map((s) => {
                              const gross = calcSessionGross(s);

                              if (editingId === s.id) {
                                return (
                                  <form
                                    key={s.id}
                                    onSubmit={handleEdit}
                                    className="bg-gray-700 rounded-xl p-3 space-y-2 overflow-hidden"
                                  >
                                    <div>
                                      <label className="text-xs text-gray-400 block mb-1">上班時間</label>
                                      <input
                                        type="datetime-local"
                                        value={editClockIn}
                                        onChange={(e) => setEditClockIn(e.target.value)}
                                        required
                                        className="block w-full max-w-full min-w-0 bg-gray-600 rounded-lg px-3 py-1.5 text-sm text-white"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-gray-400 block mb-1">下班時間</label>
                                      <input
                                        type="datetime-local"
                                        value={editClockOut}
                                        onChange={(e) => setEditClockOut(e.target.value)}
                                        required
                                        className="block w-full max-w-full min-w-0 bg-gray-600 rounded-lg px-3 py-1.5 text-sm text-white"
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setEditingId(null)}
                                        className="flex-1 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 text-xs font-medium transition-colors"
                                      >
                                        取消
                                      </button>
                                      <button
                                        type="submit"
                                        disabled={editSubmitting}
                                        className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium transition-colors disabled:opacity-50"
                                      >
                                        {editSubmitting ? "儲存中..." : "儲存"}
                                      </button>
                                    </div>
                                  </form>
                                );
                              }

                              return (
                                <div key={s.id} className="bg-gray-900 rounded-xl px-3 py-2.5">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-white">
                                      {fmtDate(s.clockIn)} {fmtTime(s.clockIn)} – {s.clockOut ? fmtTime(s.clockOut) : "進行中"}
                                    </span>
                                    <div className="text-right">
                                      {gross !== null ? (
                                        <span className="text-sm font-semibold text-green-400">${gross.toFixed(2)}</span>
                                      ) : (
                                        <span className="text-xs text-gray-500">抽成制</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <button
                                      onClick={() => startEdit(s)}
                                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors px-3 py-1.5 -ml-2 rounded-lg hover:bg-blue-400/10"
                                    >
                                      編輯
                                    </button>
                                    <button
                                      onClick={() => handleDelete(s.id)}
                                      className="text-sm text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 -mr-2 rounded-lg hover:bg-red-400/10"
                                    >
                                      刪除
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </main>
  );
}
