"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useDevice } from "@/hooks/useDevice";
import { useLocale } from "@/hooks/useLocale";
import { calcSessionGross } from "@/lib/income";
import { SettingsModal } from "@/components/SettingsModal";
import type { Job, WorkSession } from "@/types/api";

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

function formatTodayLabel(): string {
  const d = new Date();
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const month = d.toLocaleDateString("en-US", { month: "short" });
  return `${weekday}, ${month} ${d.getDate()}`;
}

function todayWithTime(time: string): Date {
  const [h, m] = time.split(":").map((s) => parseInt(s, 10));
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

export default function Home() {
  const { deviceId, userName, loaded, setUserName } = useDevice();
  const { t } = useLocale();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [elapsed, setElapsed] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [recentSessions, setRecentSessions] = useState<WorkSession[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState("");
  const [notes, setNotes] = useState("");
  const [isPublicHoliday, setIsPublicHoliday] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittingFixed, setSubmittingFixed] = useState(false);
  const [fixedFeedback, setFixedFeedback] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [clockError, setClockError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [fixedTimeIn, setFixedTimeIn] = useState("");
  const [fixedTimeOut, setFixedTimeOut] = useState("");

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

  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? null;
  const isFixedSchedule =
    selectedJob?.scheduleType === "fixed" && !!selectedJob.fixedClockIn && !!selectedJob.fixedClockOut;

  useEffect(() => {
    if (selectedJob?.scheduleType === "fixed") {
      setFixedTimeIn(selectedJob.fixedClockIn ?? "");
      setFixedTimeOut(selectedJob.fixedClockOut ?? "");
    }
  }, [selectedJob?.id]);

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
      setActiveSession(await res.json());
      setElapsed(0);
    } else {
      const data = await res.json().catch(() => ({}));
      setClockError(data.error ?? t("home.clockFailed"));
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
      setElapsed(0);
      setDailyRevenue("");
      setNotes("");
      setIsPublicHoliday(false);
      fetchRecentSessions(deviceId).catch(() => {});
    } else {
      const data = await res.json().catch(() => ({}));
      setClockError(data.error ?? t("home.clockFailed"));
    }
    setSubmitting(false);
  };

  const handleFixedClockIn = async () => {
    if (!selectedJob || !deviceId || !fixedTimeIn || !fixedTimeOut) return;
    setSubmittingFixed(true);
    setFixedFeedback("");
    const clockIn = todayWithTime(fixedTimeIn);
    const clockOut = todayWithTime(fixedTimeOut);
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
        t("home.fixedAdded", {
          name: selectedJob.name,
          start: fixedTimeIn,
          end: fixedTimeOut,
        })
      );
      setDailyRevenue("");
      setIsPublicHoliday(false);
      await fetchRecentSessions(deviceId);
    } else {
      setFixedFeedback(t("home.addFailed"));
    }
    setSubmittingFixed(false);
  };

  const startEditName = () => {
    setNameDraft(userName ?? "");
    setEditingName(true);
  };
  const saveName = () => {
    const v = nameDraft.trim();
    if (!v) return;
    setUserName(v);
    setEditingName(false);
  };

  if (!loaded) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-950">
        <div className="text-white">{t("common.loading")}</div>
      </div>
    );
  }

  const isCommissionJob = activeSession?.job.commissionPercentage != null;
  const fixedIsCommission = selectedJob?.commissionPercentage != null;
  const clockOutDisabled = isCommissionJob && (activeSession?.job.commissionRequired ?? false) && !dailyRevenue;
  const fixedDisabled = submittingFixed || !fixedTimeIn || !fixedTimeOut || (fixedIsCommission && (selectedJob?.commissionRequired ?? false) && !dailyRevenue);

  return (
    <main className="bg-gray-950 text-white">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-2 mb-6">
          {editingName ? (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <input
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                autoFocus
                className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={saveName}
                disabled={!nameDraft.trim()}
                className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-40"
              >
                {t("common.save")}
              </button>
              <button
                type="button"
                onClick={() => setEditingName(false)}
                className="px-2.5 py-1.5 rounded-lg bg-gray-700 text-gray-300 text-xs hover:bg-gray-600"
              >
                {t("common.cancel")}
              </button>
            </div>
          ) : (
            <>
              <div>
                <h1 className="text-xl font-semibold flex items-center gap-1.5 min-w-0">
                  <span className="truncate">{t("home.welcome", { name: userName ?? "" })}</span>
                  <button
                    type="button"
                    onClick={startEditName}
                    aria-label={t("home.editName")}
                    title={t("home.editName")}
                    className="shrink-0 p-1 text-gray-500 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.687a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897l11.932-11.932z" />
                    </svg>
                  </button>
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">{formatTodayLabel()}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="shrink-0 p-1.5 text-gray-500 hover:text-white transition-colors"
                aria-label="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </>
          )}
        </div>
        {showSettings && deviceId && (
          <SettingsModal deviceId={deviceId} onClose={() => setShowSettings(false)} />
        )}

        {/* Active session timer */}
        {activeSession && (
          <div className="bg-green-900/40 border border-green-700 rounded-2xl p-6 mb-4 text-center">
            <p className="text-green-400 text-sm uppercase tracking-wide mb-1">
              {t("home.activeWith", { name: activeSession.job.name })}
            </p>
            <p className="text-5xl font-mono font-bold">{formatDuration(elapsed)}</p>
            <p className="text-gray-400 text-sm mt-2">
              {t("home.since", { time: fmtTime(activeSession.clockIn) })}
            </p>
          </div>
        )}

        {/* Job selector */}
        {!activeSession && (
          <div className="mb-4">
            {jobs.length > 0 ? (
              <>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">{t("home.selectJob")}</label>
                <select
                  value={selectedJobId}
                  onChange={(e) => { setSelectedJobId(e.target.value); setFixedFeedback(""); }}
                  className="block w-full max-w-full min-w-0 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-blue-500"
                >
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.name}{job.hourlyRate != null ? ` · $${job.hourlyRate}/hr` : ""}
                      {job.scheduleType === "fixed" ? ` · ${t("home.fixedTag")}` : ""}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-400 mb-3">{t("home.noJobs")}</p>
                <Link
                  href="/jobs"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2.5 rounded-xl transition-colors"
                >
                  {t("home.goToJobs")}
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Commission revenue input */}
        {((activeSession && isCommissionJob) || (!activeSession && isFixedSchedule && fixedIsCommission)) && (
          <div className="bg-gray-800 rounded-2xl p-4 mb-4">
            <label className="block text-sm text-gray-400 mb-1.5">
              {t("home.todayRevenue")}
              {(activeSession?.job.commissionRequired ?? selectedJob?.commissionRequired)
                ? <span className="text-red-400 ml-1">{t("common.required")}</span>
                : <span className="text-gray-500 ml-1">{t("common.optional")}</span>
              }
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                value={dailyRevenue}
                onChange={(e) => setDailyRevenue(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="block w-full max-w-full min-w-0 bg-gray-700 rounded-xl pl-7 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Public holiday toggle */}
        {((activeSession && activeSession.job.penaltyRatesEnabled) ||
          (!activeSession && isFixedSchedule && selectedJob?.penaltyRatesEnabled)) && (
          <div className="flex items-center justify-between bg-gray-800 rounded-2xl px-4 py-3 mb-4">
            <span className="text-sm text-gray-300">{t("home.publicHoliday")}</span>
            <button
              type="button"
              onClick={() => setIsPublicHoliday((v) => !v)}
              className={`relative inline-flex w-10 h-5 rounded-full transition-colors flex-shrink-0 ${isPublicHoliday ? "bg-amber-500" : "bg-gray-600"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isPublicHoliday ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
        )}

        {/* Notes (shown while clocked in, saved on clock-out) */}
        {activeSession && (
          <div className="bg-gray-800 rounded-2xl p-4 mb-4">
            <label className="block text-sm text-gray-400 mb-1.5">{t("common.notes")}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("common.notesPlaceholder")}
              rows={2}
              className="block w-full max-w-full min-w-0 box-border bg-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        )}

        {/* Fixed schedule time inputs + button */}
        {!activeSession && isFixedSchedule && (
          <>
            <div className="bg-gray-800 rounded-2xl p-4 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">{t("common.clockIn")}</label>
                  <input
                    type="time"
                    value={fixedTimeIn}
                    onChange={(e) => setFixedTimeIn(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">{t("common.clockOut")}</label>
                  <input
                    type="time"
                    value={fixedTimeOut}
                    onChange={(e) => setFixedTimeOut(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={handleFixedClockIn}
              disabled={fixedDisabled}
              className="w-full py-3.5 rounded-xl text-base font-semibold tracking-wide transition-all mt-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submittingFixed ? t("common.adding") : t("home.fixedAddBtn")}
            </button>
            {fixedFeedback && (
              <p className="text-xs text-center text-green-400 mt-2">{fixedFeedback}</p>
            )}
          </>
        )}

        {/* Flexible: clock in/out */}
        {!isFixedSchedule && (jobs.length > 0 || activeSession) && (
          <button
            onClick={activeSession ? handleClockOut : handleClockIn}
            disabled={submitting || (!activeSession && !selectedJobId) || (activeSession ? clockOutDisabled : false)}
            className={`w-full py-3.5 rounded-xl text-base font-semibold tracking-wide transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              activeSession
                ? "bg-red-600 hover:bg-red-700 active:bg-red-800"
                : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
            }`}
          >
            {submitting ? t("common.loading") : activeSession ? t("home.clockOut") : t("home.clockIn")}
          </button>
        )}

        {clockError && (
          <p className="text-xs text-center text-red-400 mt-2">{clockError}</p>
        )}

        {/* Recent sessions */}
        {recentSessions.length > 0 && !activeSession && (
          <div className="mt-8">
            <h2 className="text-gray-400 text-xs uppercase tracking-wide mb-3">{t("home.recent")}</h2>
            <div className="space-y-1">
              {recentSessions.map((session) => {
                const duration = session.clockOut
                  ? new Date(session.clockOut).getTime() - new Date(session.clockIn).getTime()
                  : 0;
                const gross = calcSessionGross(session);
                return (
                  <div key={session.id} className="bg-gray-800 rounded-xl p-4 flex justify-between items-center gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{session.job.name}</p>
                      <p className="text-gray-400 text-sm">
                        {fmtDate(session.clockIn)} {fmtTime(session.clockIn)}
                        {session.clockOut && <> — {fmtTime(session.clockOut)}</>}
                      </p>
                      {gross !== null && (
                        <p className="text-green-400 text-sm mt-0.5">${gross.toFixed(2)}</p>
                      )}
                      {session.notes && (
                        <p className="text-gray-500 text-xs mt-0.5 truncate">{session.notes}</p>
                      )}
                    </div>
                    <p className="font-mono text-gray-300 text-sm shrink-0">{formatDuration(duration)}</p>
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
