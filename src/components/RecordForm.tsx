"use client";

import { useState, useEffect, useRef } from "react";
import { useLocale } from "@/hooks/useLocale";
import { TextField, TextAreaField, SelectField, Spinner } from "./FormControls";
import { payRules } from "@/lib/income";
import { FORM } from "@/lib/theme";
import type { Job, WorkSession } from "@/types/api";

export type RecordDraft = {
  jobId: string;
  date: string;
  start: string;
  end: string;
  dailyRevenue: string;
  breakMinutes: string;
  notes: string;
};

const pad = (n: number) => String(n).padStart(2, "0");
const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function emptyDraft(jobs: Job[]): RecordDraft {
  return {
    jobId: jobs.length === 1 ? jobs[0].id : "",
    date: dateStr(new Date()),
    start: "",
    end: "",
    dailyRevenue: "",
    breakMinutes: "",
    notes: "",
  };
}

export function draftFromSession(s: WorkSession): RecordDraft {
  const clockIn = new Date(s.clockIn);
  return {
    jobId: s.jobId,
    date: dateStr(clockIn),
    start: timeStr(clockIn),
    end: s.clockOut ? timeStr(new Date(s.clockOut)) : "",
    dailyRevenue: s.dailyRevenue != null ? String(s.dailyRevenue) : "",
    breakMinutes: s.breakMinutes != null ? String(s.breakMinutes) : "",
    notes: s.notes ?? "",
  };
}

export function RecordForm({ mode, jobs, session, initial, deviceId, onSaved, onCancel }: {
  mode: "add" | "edit";
  jobs: Job[];
  session?: WorkSession;
  initial: RecordDraft;
  deviceId: string;
  onSaved: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useLocale();
  const [draft, setDraft] = useState<RecordDraft>(initial);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const lastJobId = useRef(initial.jobId);

  const job = jobs.find((j) => j.id === draft.jobId);
  const isCommission = job?.commissionPercentage != null;
  const breakDefault = (session ? payRules(session).breakDuration : job?.breakDuration) ?? 0;

  const set = (patch: Partial<RecordDraft>) => setDraft((d) => ({ ...d, ...patch }));

  useEffect(() => {
    if (mode !== "add" || !job) return;
    const changed = lastJobId.current !== job.id;
    lastJobId.current = job.id;
    if (job.scheduleType !== "fixed" || !job.fixedClockIn || !job.fixedClockOut) return;
    setDraft((d) =>
      !changed && d.start ? d : { ...d, start: job.fixedClockIn!, end: job.fixedClockOut! }
    );
  }, [mode, job]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.jobId || !draft.date || !draft.start || !draft.end) return;

    const clockIn = new Date(`${draft.date}T${draft.start}`);
    const clockOut = new Date(`${draft.date}T${draft.end}`);
    // 下班早於上班視為跨夜班，落在隔天
    if (clockOut < clockIn) clockOut.setDate(clockOut.getDate() + 1);
    if (clockOut <= clockIn) {
      setError(t("records.timeError"));
      return;
    }

    setError("");
    setSubmitting(true);

    const body: Record<string, unknown> = {
      clockIn: clockIn.toISOString(),
      clockOut: clockOut.toISOString(),
      notes: draft.notes.trim() === "" ? null : draft.notes.trim(),
    };
    if (isCommission) {
      body.dailyRevenue = draft.dailyRevenue === "" ? null : parseFloat(draft.dailyRevenue);
    } else {
      const bm = parseInt(draft.breakMinutes);
      body.breakMinutes = draft.breakMinutes.trim() === "" || isNaN(bm) ? null : Math.max(0, bm);
    }

    const headers = { "Content-Type": "application/json", "x-device-id": deviceId };
    const res = mode === "add"
      ? await fetch("/api/sessions", {
          method: "POST",
          headers,
          body: JSON.stringify({ jobId: draft.jobId, ...body }),
        })
      : await fetch(`/api/sessions/${session!.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify(body),
        });

    if (res.ok) await onSaved();
    else setError(t("records.saveFailed"));
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className={`${FORM.card} ${FORM.fieldGap}`}>
      <p className={FORM.title}>{mode === "add" ? t("records.formTitle") : t("records.editTitle")}</p>

      <SelectField
        label={t("records.work")}
        value={draft.jobId}
        onChange={(e) => set({ jobId: e.target.value })}
        required
        disabled={mode === "edit"}
        className="disabled:opacity-60"
        options={
          mode === "edit"
            ? [{ value: draft.jobId, label: job?.name ?? session?.job.name ?? "" }]
            : [{ value: "", label: t("records.selectWork") }, ...jobs.map((j) => ({ value: j.id, label: j.name }))]
        }
      />

      <TextField
        type="date"
        label={t("records.date")}
        value={draft.date}
        onChange={(e) => set({ date: e.target.value })}
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <TextField
          type="time"
          label={t("records.startTime")}
          value={draft.start}
          onChange={(e) => set({ start: e.target.value })}
          required
        />
        <TextField
          type="time"
          label={t("records.endTime")}
          value={draft.end}
          onChange={(e) => set({ end: e.target.value })}
          required
        />
      </div>

      {isCommission ? (
        <TextField
          type="number"
          label={t("records.todayRevenue")}
          required={job?.commissionRequired}
          prefix="$"
          value={draft.dailyRevenue}
          onChange={(e) => set({ dailyRevenue: e.target.value })}
          onFocus={(e) => e.target.select()}
          placeholder="0.00"
          min="0"
          step="0.01"
        />
      ) : (
        <TextField
          type="number"
          label={t("records.breakMinutes")}
          hint={t("records.breakHint", { min: breakDefault })}
          value={draft.breakMinutes}
          onChange={(e) => set({ breakMinutes: e.target.value })}
          onFocus={(e) => e.target.select()}
          placeholder={String(breakDefault)}
          min="0"
          step="1"
        />
      )}

      <TextAreaField
        label={t("common.notes")}
        value={draft.notes}
        onChange={(e) => set({ notes: e.target.value })}
        placeholder={t("common.notesPlaceholder")}
        rows={2}
      />

      {error && <p className={FORM.error}>{error}</p>}

      <div className={FORM.btnRow}>
        <button type="button" onClick={onCancel} className={`flex-1 ${FORM.btnSecondary}`}>
          {t("common.cancel")}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className={`flex-1 ${FORM.btnPrimary} inline-flex items-center justify-center gap-2`}
        >
          {submitting && <Spinner />}
          {mode === "add"
            ? (submitting ? t("common.adding") : t("common.add"))
            : (submitting ? t("common.saving") : t("common.save"))}
        </button>
      </div>
    </form>
  );
}
