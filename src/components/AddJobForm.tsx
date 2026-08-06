"use client";

import { useState } from "react";
import { useLocale } from "@/hooks/useLocale";
import { FORM } from "@/lib/theme";
import { Spinner } from "./FormControls";
import { JobFormFields, useJobForm } from "./JobFormFields";
import type { Job } from "@/types/api";

type Props = {
  deviceId: string;
  onJobAdded: (job: Job) => void;
  onCancel?: () => void;
};

export function AddJobForm({ deviceId, onJobAdded, onCancel }: Props) {
  const { t } = useLocale();
  const form = useJobForm();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.state.name.trim() || !form.validate()) return;

    setSubmitting(true);
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-device-id": deviceId },
      body: JSON.stringify(form.buildBody()),
    });
    if (res.ok) onJobAdded(await res.json());
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className={`${FORM.card} mb-4 animate-fade-in`}>
      <h3 className={`${FORM.title} pb-2`}>{t("form.addTitle")}</h3>

      <JobFormFields form={form} />

      <div className={`${FORM.btnRow} pt-4 border-t border-gray-700`}>
        {onCancel && (
          <button type="button" onClick={onCancel} className={`flex-1 ${FORM.btnSecondary}`}>
            {t("common.cancel")}
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || !form.state.name.trim()}
          className={`flex-1 inline-flex items-center justify-center gap-2 ${FORM.btnPrimary}`}
        >
          {submitting && <Spinner />}
          {submitting ? t("common.adding") : t("common.add")}
        </button>
      </div>
    </form>
  );
}
