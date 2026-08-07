"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/hooks/useLocale";
import { saveDeviceSession } from "@/hooks/useDevice";
import { TextField, Spinner } from "@/components/FormControls";
import { FORM, RADIUS, SURFACE, TYPE } from "@/lib/theme";

type Tab = "new" | "restore";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [tab, setTab] = useState<Tab>("new");

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [restoreDeviceId, setRestoreDeviceId] = useState("");
  const [restoreName, setRestoreName] = useState("");
  const [restoreError, setRestoreError] = useState("");
  const [restoring, setRestoring] = useState(false);

  const handleNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    setCreateError("");
    const deviceId = crypto.randomUUID();
    try {
      const res = await fetch("/api/device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      });
      if (!res.ok) {
        setCreateError(t("login.networkError"));
        return;
      }
      saveDeviceSession(deviceId, trimmed);
      router.replace("/");
    } catch {
      setCreateError(t("login.networkError"));
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = restoreDeviceId.trim();
    const nm = restoreName.trim();
    if (!id || !nm || restoring) return;
    setRestoring(true);
    setRestoreError("");
    try {
      const res = await fetch(`/api/device?deviceId=${encodeURIComponent(id)}`);
      if (!res.ok) {
        setRestoreError(t("login.restoreError"));
        return;
      }
      saveDeviceSession(id, nm);
      router.replace("/");
    } catch {
      setRestoreError(t("login.networkError"));
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="h-full bg-gray-950 text-white flex flex-col items-center justify-center px-6">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Work Tracker</h1>
      <p className={`${TYPE.body} text-gray-400 mb-8`}>{t("onboarding.subtitle")}</p>

      <div className={`w-full max-w-sm flex gap-0.5 p-0.5 mb-6 ${RADIUS.cell} ${SURFACE.segment}`}>
        {(["new", "restore"] as Tab[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 h-9 ${RADIUS.chip} ${TYPE.control} transition-colors ${
              tab === key ? SURFACE.segmentOn : SURFACE.segmentOff
            }`}
          >
            {t(key === "new" ? "login.tabNew" : "login.tabRestore")}
          </button>
        ))}
      </div>

      {tab === "new" ? (
        <form onSubmit={handleNewUser} className={`w-full max-w-sm ${FORM.fieldGap}`}>
          <TextField
            label={t("onboarding.askName")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("onboarding.namePlaceholder")}
            error={createError || undefined}
            autoFocus
          />
          <button
            type="submit"
            disabled={!name.trim() || creating}
            className={`w-full inline-flex items-center justify-center gap-2 ${FORM.btnPrimary}`}
          >
            {creating && <Spinner />}
            {t("onboarding.start")}
          </button>
        </form>
      ) : (
        <form onSubmit={handleRestore} className={`w-full max-w-sm ${FORM.fieldGap}`}>
          <TextField
            label={t("login.deviceIdLabel")}
            value={restoreDeviceId}
            onChange={(e) => { setRestoreDeviceId(e.target.value); setRestoreError(""); }}
            placeholder={t("login.deviceIdPlaceholder")}
            className="font-mono text-[13px]"
          />
          <TextField
            label={t("onboarding.askName")}
            value={restoreName}
            onChange={(e) => setRestoreName(e.target.value)}
            placeholder={t("onboarding.namePlaceholder")}
            error={restoreError || undefined}
          />
          <button
            type="submit"
            disabled={!restoreDeviceId.trim() || !restoreName.trim() || restoring}
            className={`w-full inline-flex items-center justify-center gap-2 ${FORM.btnPrimary}`}
          >
            {restoring && <Spinner />}
            {restoring ? t("login.restoring") : t("login.restoreBtn")}
          </button>
        </form>
      )}
    </div>
  );
}
