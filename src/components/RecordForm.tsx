"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useLocale } from "@/hooks/useLocale";
import { useTaxRate } from "@/hooks/useTaxRate";
import { useIncomeMode } from "@/hooks/useIncomeMode";
import { TextField, TextAreaField, SelectField, DateField, TimeField, Spinner } from "./FormControls";
import { payRules, calcSessionGross, calcSessionIncome, totalWorkMs, type SessionBase } from "@/lib/income";
import { formatHoursMinutes } from "@/lib/format";
import { FORM, TYPE } from "@/lib/theme";
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

// 下班早於上班視為跨夜班，落在隔天
function resolveRange(draft: RecordDraft): { clockIn: Date; clockOut: Date } | null {
  if (!draft.date || !draft.start || !draft.end) return null;
  const clockIn = new Date(`${draft.date}T${draft.start}`);
  const clockOut = new Date(`${draft.date}T${draft.end}`);
  if (isNaN(clockIn.getTime()) || isNaN(clockOut.getTime())) return null;
  if (clockOut < clockIn) clockOut.setDate(clockOut.getDate() + 1);
  if (clockOut <= clockIn) return null;
  return { clockIn, clockOut };
}

function parseBreakMinutes(value: string): number | null {
  const n = parseInt(value);
  return value.trim() === "" || isNaN(n) ? null : Math.max(0, n);
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
  const taxRate = useTaxRate();
  const [incomeMode] = useIncomeMode();
  const [draft, setDraft] = useState<RecordDraft>(initial);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notesOpen, setNotesOpen] = useState(initial.notes !== "");
  const lastJobId = useRef(initial.jobId);

  const job = jobs.find((j) => j.id === draft.jobId);
  const isCommission = job?.commissionPercentage != null;
  const breakDefault = (session ? payRules(session).breakDuration : job?.breakDuration) ?? 0;
  const hasPreset = !!(job?.fixedClockIn && job?.fixedClockOut);

  const set = (patch: Partial<RecordDraft>) => setDraft((d) => ({ ...d, ...patch }));

  function applyPreset() {
    if (!job?.fixedClockIn || !job.fixedClockOut) return;
    set({
      start: job.fixedClockIn,
      end: job.fixedClockOut,
      breakMinutes: job.breakDuration != null ? String(job.breakDuration) : draft.breakMinutes,
    });
  }

  useEffect(() => {
    if (mode !== "add" || !job) return;
    const changed = lastJobId.current !== job.id;
    lastJobId.current = job.id;
    if (job.scheduleType !== "fixed" || !job.fixedClockIn || !job.fixedClockOut) return;
    setDraft((d) =>
      !changed && d.start ? d : { ...d, start: job.fixedClockIn!, end: job.fixedClockOut! }
    );
  }, [mode, job]);

  const preview = useMemo(() => {
    const range = resolveRange(draft);
    if (!range || !job) return null;
    const pseudo: SessionBase = {
      clockIn: range.clockIn.toISOString(),
      clockOut: range.clockOut.toISOString(),
      job,
      payRulesSnapshot: session?.payRulesSnapshot ?? null,
      breakMinutes: parseBreakMinutes(draft.breakMinutes),
      breaks: [],
      isPublicHoliday: session?.isPublicHoliday ?? false,
      dailyRevenue: draft.dailyRevenue === "" ? null : parseFloat(draft.dailyRevenue),
    };
    const amount = incomeMode === "net" ? calcSessionIncome(pseudo, taxRate) : calcSessionGross(pseudo);
    return { workMs: totalWorkMs(pseudo) ?? 0, amount };
  }, [draft, job, session, incomeMode, taxRate]);

  const canSubmit =
    !!draft.jobId &&
    !!draft.date &&
    !!draft.start &&
    !!draft.end &&
    (!isCommission || !job?.commissionRequired || draft.dailyRevenue !== "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const range = resolveRange(draft);
    if (!range) {
      setError(t("records.timeError"));
      return;
    }

    setError("");
    setSubmitting(true);

    const body: Record<string, unknown> = {
      clockIn: range.clockIn.toISOString(),
      clockOut: range.clockOut.toISOString(),
      notes: draft.notes.trim() === "" ? null : draft.notes.trim(),
    };
    if (isCommission) {
      body.dailyRevenue = draft.dailyRevenue === "" ? null : parseFloat(draft.dailyRevenue);
    } else {
      body.breakMinutes = parseBreakMinutes(draft.breakMinutes);
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

      <DateField
        label={t("records.date")}
        value={draft.date}
        placeholder={t("records.datePlaceholder")}
        onChange={(e) => set({ date: e.target.value })}
        required
      />

      <div>
        <div className="grid grid-cols-2 gap-3">
          <TimeField
            label={t("records.startTime")}
            value={draft.start}
            placeholder="--:--"
            onChange={(e) => set({ start: e.target.value })}
            required
          />
          <TimeField
            label={t("records.endTime")}
            value={draft.end}
            placeholder="--:--"
            onChange={(e) => set({ end: e.target.value })}
            required
          />
        </div>
        {hasPreset && (
          <button
            type="button"
            onClick={applyPreset}
            className={`mt-2 px-2.5 py-1 rounded-lg bg-gray-700 text-gray-300 ${TYPE.rowMeta} hover:bg-gray-600 active:scale-[0.98] transition-all duration-150`}
          >
            {t("records.usePreset")}
          </button>
        )}
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
          suffix={t("common.minutes")}
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
        onFocus={() => setNotesOpen(true)}
        onBlur={() => setNotesOpen(draft.notes !== "")}
        placeholder={t("common.notesPlaceholder")}
        rows={notesOpen ? 3 : 1}
      />

      {preview && (
        <div className={FORM.panel}>
          <div className="flex items-center justify-between gap-3">
            <span className={FORM.label}>{t("records.estHours")}</span>
            <span className={`${TYPE.cardSubValue} text-gray-100`}>{formatHoursMinutes(preview.workMs)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className={FORM.label}>
              {t("records.estIncome")}
              <span className="ml-1 text-gray-500">{t(`cal.mode.${incomeMode}`)}</span>
            </span>
            <span className={`${TYPE.cardSubValue} text-emerald-400`}>
              {preview.amount !== null ? `$${preview.amount.toFixed(2)}` : "—"}
            </span>
          </div>
        </div>
      )}

      {error && <p className={FORM.error}>{error}</p>}

      <div className={FORM.btnRow}>
        <button type="button" onClick={onCancel} className={`flex-1 ${FORM.btnSecondary}`}>
          {t("common.cancel")}
        </button>
        <button
          type="submit"
          disabled={submitting || !canSubmit}
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
