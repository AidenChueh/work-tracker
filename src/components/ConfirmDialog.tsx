"use client";

import { useLocale } from "@/hooks/useLocale";
import { FORM, RADIUS } from "@/lib/theme";
import { Spinner } from "./FormControls";

export function ConfirmDialog({ title, description, confirmLabel, danger = true, busy = false, onConfirm, onCancel }: {
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onCancel} />
      <div className={`relative w-full max-w-xs bg-gray-800 border border-gray-700 ${RADIUS.card} p-5 shadow-xl shadow-black/40 animate-sheet-up`}>
        <p className={FORM.title}>{title}</p>
        {description && <p className={`mt-2 text-[13px] leading-5 text-gray-400 whitespace-pre-line`}>{description}</p>}
        <div className={`mt-5 ${FORM.btnRow}`}>
          <button type="button" onClick={onCancel} disabled={busy} className={`flex-1 ${FORM.btnSecondary}`}>
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`flex-1 inline-flex items-center justify-center gap-2 ${danger ? FORM.btnStop : FORM.btnPrimary}`}
          >
            {busy && <Spinner />}
            {confirmLabel ?? t("common.delete")}
          </button>
        </div>
      </div>
    </div>
  );
}
