"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { OnboardingForm } from "@/components/OnboardingForm";
import { useDevice } from "@/hooks/useDevice";
import { calcSessionGross } from "@/lib/income";
import type { OvertimeTier } from "@/lib/income";

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
  createdAt: string;
};

type WorkSession = {
  id: string;
  jobId: string;
  job: Job;
  clockIn: string;
  clockOut: string | null;
  isPublicHoliday: boolean;
  dailyRevenue: number | null;
  breaks: { id: string; startTime: string; endTime: string | null; isPaid: boolean }[];
};

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function Home() {
  const { deviceId, userName, loaded } = useDevice();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [elapsed, setElapsed] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [recentSessions, setRecentSessions] = useState<WorkSession[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState("");
  const [isPublicHoliday, setIsPublicHoliday] = useState(false);

  const fetchJobs = useCallback(async (id: string) => {
    const res = await fetch("/api/jobs", { headers: { "x-device-id": id } });
    if (res.ok) {
      const data: Job[] = await res.json();
      setJobs(data);
      if (data.length > 0) setSelectedJobId((prev) => prev || data[0].id);
    }
  }, []);

  const fetchActiveSession = useCallback(async (id: string) => {
    const res = await fetch("/api/sessions/active", { headers: { "x-device-id": id } });
    if (res.ok) setActiveSession(await res.json());
  }, []);

  const fetchRecentSessions = useCallback(async (id: string) => {
    const res = await fetch("/api/sessions", { headers: { "x-device-id": id } });
    if (res.ok) {
      const data: WorkSession[] = await res.json();
      setRecentSessions(data.filter((s) => s.clockOut !== null).slice(0, 3));
    }
  }, []);

  useEffect(() => {
    if (!deviceId || !loaded || userName === null) return;
    Promise.all([
      fetchJobs(deviceId),
      fetchActiveSession(deviceId),
      fetchRecentSessions(deviceId),
    ]).finally(() => setLoading(false));
  }, [deviceId, loaded, userName, fetchJobs, fetchActiveSession, fetchRecentSessions]);

  useEffect(() => {
    if (!activeSession) return;
    const update = () => setElapsed(Date.now() - new Date(activeSession.clockIn).getTime());
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const handleClockIn = async () => {
    if (!selectedJobId || !deviceId) return;
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-device-id": deviceId },
      body: JSON.stringify({ jobId: selectedJobId }),
    });
    if (res.ok) { setActiveSession(await res.json()); setElapsed(0); }
  };

  const handleClockOut = async () => {
    if (!activeSession || !deviceId) return;
    const body: Record<string, unknown> = { clockOut: "now" };
    if (isPublicHoliday) body.isPublicHoliday = true;
    if (dailyRevenue) body.dailyRevenue = parseFloat(dailyRevenue);

    const res = await fetch(`/api/sessions/${activeSession.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-device-id": deviceId },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setActiveSession(null);
      setElapsed(0);
      setDailyRevenue("");
      setIsPublicHoliday(false);
      fetchRecentSessions(deviceId);
    }
  };

  if (!loaded) return null;

  if (userName === null) {
    return (
      <OnboardingForm
        onComplete={(name) => {
          localStorage.setItem("userName", name);
          window.location.reload();
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-950">
        <div className="text-white">載入中...</div>
      </div>
    );
  }

  const isCommissionJob = activeSession?.job.commissionPercentage != null;
  const clockOutDisabled = isCommissionJob && (activeSession?.job.commissionRequired ?? false) && !dailyRevenue;

  return (
    <main className="bg-gray-950 text-white">
      <div className="max-w-md mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold text-center mb-6">歡迎，{userName}</h1>

        {/* Active session timer */}
        {activeSession && (
          <div className="bg-green-900/40 border border-green-700 rounded-2xl p-6 mb-4 text-center">
            <p className="text-green-400 text-sm uppercase tracking-wide mb-1">
              打卡中 — {activeSession.job.name}
            </p>
            <p className="text-5xl font-mono font-bold">{formatDuration(elapsed)}</p>
            <p className="text-gray-400 text-sm mt-2">
              自 {fmtTime(activeSession.clockIn)}
            </p>
          </div>
        )}

        {/* Commission revenue input (before clock out) */}
        {activeSession && isCommissionJob && (
          <div className="bg-gray-800 rounded-2xl p-4 mb-4">
            <label className="block text-sm text-gray-400 mb-1.5">
              今日業績
              {activeSession.job.commissionRequired
                ? <span className="text-red-400 ml-1">（必填）</span>
                : <span className="text-gray-500 ml-1">（選填）</span>
              }
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                value={dailyRevenue}
                onChange={(e) => setDailyRevenue(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full bg-gray-700 rounded-xl pl-7 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Public holiday toggle (penalty rates enabled) */}
        {activeSession && activeSession.job.penaltyRatesEnabled && (
          <div className="flex items-center justify-between bg-gray-800 rounded-2xl px-4 py-3 mb-4">
            <span className="text-sm text-gray-300">國定假日</span>
            <button
              type="button"
              onClick={() => setIsPublicHoliday((v) => !v)}
              className={`relative inline-flex w-10 h-5 rounded-full transition-colors flex-shrink-0 ${isPublicHoliday ? "bg-amber-500" : "bg-gray-600"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isPublicHoliday ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
        )}

        {/* Job selector */}
        {!activeSession && (
          <div className="mb-4">
            {jobs.length > 0 ? (
              <>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">選擇工作</label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-blue-500"
                >
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.name}{job.hourlyRate != null ? ` · $${job.hourlyRate}/hr` : ""}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-400 mb-3">還沒有工作</p>
                <Link
                  href="/jobs"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2.5 rounded-xl transition-colors"
                >
                  前往工作管理新增
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Clock in/out button */}
        {(jobs.length > 0 || activeSession) && (
          <button
            onClick={activeSession ? handleClockOut : handleClockIn}
            disabled={(!activeSession && !selectedJobId) || (activeSession ? clockOutDisabled : false)}
            className={`w-full py-5 rounded-2xl text-xl font-bold transition-all mt-2 ${
              activeSession
                ? "bg-red-600 hover:bg-red-700 active:bg-red-800"
                : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
            }`}
          >
            {activeSession ? "打卡下班" : "打卡上班"}
          </button>
        )}

        {/* Recent sessions */}
        {recentSessions.length > 0 && !activeSession && (
          <div className="mt-8">
            <h2 className="text-gray-400 text-xs uppercase tracking-wide mb-3">最近紀錄</h2>
            <div className="space-y-1">
              {recentSessions.map((session) => {
                const duration = session.clockOut
                  ? new Date(session.clockOut).getTime() - new Date(session.clockIn).getTime()
                  : 0;
                const gross = calcSessionGross(session);
                return (
                  <div key={session.id} className="bg-gray-800 rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{session.job.name}</p>
                      <p className="text-gray-400 text-sm">
                        {fmtDate(session.clockIn)} {fmtTime(session.clockIn)}
                        {session.clockOut && <> — {fmtTime(session.clockOut)}</>}
                      </p>
                      {gross !== null && (
                        <p className="text-green-400 text-sm mt-0.5">${gross.toFixed(2)}</p>
                      )}
                    </div>
                    <p className="font-mono text-gray-300 text-sm">{formatDuration(duration)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
