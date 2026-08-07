"use client";

import { useState } from "react";
import { useLocale } from "@/hooks/useLocale";
import { FORM } from "@/lib/theme";
import { Spinner } from "./FormControls";
import { ConfirmDialog } from "./ConfirmDialog";
import { useToast } from "./Toast";
import { JobFormFields, useJobForm } from "./JobFormFields";
import type { Job } from "@/types/api";

type Props = {
  job: Job;
  deviceId: string;
  onSaved: (job: Job) => void;
  onCancel: () => void;
  onDeleted: (jobId: string) => void;
};

export function EditJobForm({ job, deviceId, onSaved, onCancel, onDeleted }: Props) {
  const { t } = useLocale();
  const toast = useToast();
  const form = useJobForm(job);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showScope, setShowScope] = useState(false);
  const [pendingBody, setPendingBody] = useState<Record<string, unknown> | null>(null);

  const payRulesChanged = (body: ReturnType<typeof form.buildBody>): boolean => {
    const eq = (a: number | boolean | null, b: number | boolean | null) => (a ?? null) === (b ?? null);
    if (
      !eq(body.hourlyRate, job.hourlyRate) ||
      !eq(body.commissionPercentage, job.commissionPercentage) ||
      !eq(body.taxEnabled, job.taxEnabled) ||
      !eq(body.breakDuration, job.breakDuration) ||
      !eq(body.breakRate, job.breakRate) ||
      !eq(body.penaltyRatesEnabled, job.penaltyRatesEnabled) ||
      !eq(body.publicHolidayRate, job.publicHolidayRate) ||
      !eq(body.saturdayRate, job.saturdayRate) ||
      !eq(body.sundayRate, job.sundayRate) ||
      !eq(body.saturdayHourlyRate, job.saturdayHourlyRate) ||
      !eq(body.sundayHourlyRate, job.sundayHourlyRate) ||
      !eq(body.publicHolidayHourlyRate, job.publicHolidayHourlyRate)
    ) return true;
    const norm = (ts: { afterHours: number; rate: number }[]) =>
      JSON.stringify(
        ts.map((tier) => ({ afterHours: tier.afterHours, rate: tier.rate }))
          .sort((a, b) => a.afterHours - b.afterHours || a.rate - b.rate)
      );
    return norm(body.overtimeTiers) !== norm(job.overtimeTiers);
  };

  const doSave = async (body: Record<string, unknown>, applyToPast?: boolean) => {
    setSubmitting(true);
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-device-id": deviceId },
      body: JSON.stringify(applyToPast === undefined ? body : { ...body, applyToPast }),
    });
    if (res.ok) onSaved(await res.json());
    else toast(t("toast.failed"), "error");
    setSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.state.name.trim() || !form.validate()) return;

    const body = form.buildBody();
    // 薪資規則有變動且該工作已有紀錄時，先問要套用到哪些紀錄
    if (payRulesChanged(body)) {
      setSubmitting(true);
      const res = await fetch(`/api/sessions?jobId=${job.id}&limit=1`, {
        headers: { "x-device-id": deviceId },
      });
      const list = res.ok ? await res.json() : [];
      setSubmitting(false);
      if (Array.isArray(list) && list.length > 0) {
        setPendingBody(body);
        setShowScope(true);
        return;
      }
    }
    await doSave(body);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: "DELETE",
      headers: { "x-device-id": deviceId },
    });
    if (res.ok) onDeleted(job.id);
    else toast(t("toast.failed"), "error");
    setDeleting(false);
    setConfirmDelete(false);
  };

  return (
    <form onSubmit={handleSubmit} className={`${FORM.card} mt-2 animate-fade-in`}>
      <h3 className={`${FORM.title} pb-2`}>{t("form.editTitle")}</h3>

      <JobFormFields form={form} />

      {showScope ? (
        <div className="pt-4 border-t border-gray-700 space-y-2">
          <p className="text-[13px] font-semibold text-gray-200">{t("form.scopeTitle")}</p>
          <p className={FORM.helper}>{t("form.scopeDesc")}</p>
          <button
            type="button"
            onClick={() => pendingBody && doSave(pendingBody, true)}
            disabled={submitting}
            className="w-full text-left px-3 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 active:scale-[0.98] disabled:opacity-50 transition-all duration-150"
          >
            <span className="block text-[13px] font-medium text-white">{t("form.scopeAll")}</span>
            <span className={`block ${FORM.helper}`}>{t("form.scopeAllDesc")}</span>
          </button>
          <button
            type="button"
            onClick={() => pendingBody && doSave(pendingBody, false)}
            disabled={submitting}
            className="w-full text-left px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 transition-all duration-150"
          >
            <span className="block text-[13px] font-medium text-white">{t("form.scopeFuture")}</span>
            <span className="block text-[11px] leading-4 text-blue-200">{t("form.scopeFutureDesc")}</span>
          </button>
          <button
            type="button"
            onClick={() => { setShowScope(false); setPendingBody(null); }}
            disabled={submitting}
            className="w-full py-2 text-[13px] text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            {t("common.cancel")}
          </button>
        </div>
      ) : (
        <>
          <div className={`${FORM.btnRow} pt-4 border-t border-gray-700`}>
            <button type="button" onClick={onCancel} className={`flex-1 ${FORM.btnSecondary}`}>
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting || !form.state.name.trim()}
              className={`flex-1 inline-flex items-center justify-center gap-2 ${FORM.btnPrimary}`}
            >
              {submitting && <Spinner />}
              {submitting ? t("common.saving") : t("common.save")}
            </button>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-700">
            <p className={FORM.dangerLabel}>{t("form.dangerZone")}</p>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={deleting}
              className={`mt-2 w-full inline-flex items-center justify-center gap-2 ${FORM.btnDanger}`}
            >
              {deleting && <Spinner />}
              {deleting ? t("common.deleting") : t("form.deleteThis")}
            </button>
          </div>
        </>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={t("dialog.deleteJob", { name: job.name })}
          description={t("dialog.deleteJobDesc")}
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </form>
  );
}
