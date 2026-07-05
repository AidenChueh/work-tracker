"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/hooks/useLocale";
import { saveDeviceSession } from "@/hooks/useDevice";

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
      <h1 className="text-3xl font-bold mb-2">Work Tracker</h1>
      <p className="text-gray-400 mb-8">{t("onboarding.subtitle")}</p>

      <div className="flex bg-gray-800 rounded-xl p-1 mb-6 w-full max-w-sm">
        <button
          type="button"
          onClick={() => setTab("new")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "new" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200"
          }`}
        >
          {t("login.tabNew")}
        </button>
        <button
          type="button"
          onClick={() => setTab("restore")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "restore" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200"
          }`}
        >
          {t("login.tabRestore")}
        </button>
      </div>

      {tab === "new" ? (
        <form onSubmit={handleNewUser} className="w-full max-w-sm space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">{t("onboarding.askName")}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("onboarding.namePlaceholder")}
              autoFocus
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-4 text-white text-lg placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          {createError && (
            <p className="text-red-400 text-sm">{createError}</p>
          )}
          <button
            type="submit"
            disabled={!name.trim() || creating}
            className="w-full py-4 rounded-xl bg-blue-600 text-white text-lg font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {creating ? t("common.loading") : t("onboarding.start")}
          </button>
        </form>
      ) : (
        <form onSubmit={handleRestore} className="w-full max-w-sm space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">{t("login.deviceIdLabel")}</label>
            <input
              type="text"
              value={restoreDeviceId}
              onChange={(e) => { setRestoreDeviceId(e.target.value); setRestoreError(""); }}
              placeholder={t("login.deviceIdPlaceholder")}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">{t("onboarding.askName")}</label>
            <input
              type="text"
              value={restoreName}
              onChange={(e) => setRestoreName(e.target.value)}
              placeholder={t("onboarding.namePlaceholder")}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-4 text-white text-lg placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          {restoreError && (
            <p className="text-red-400 text-sm">{restoreError}</p>
          )}
          <button
            type="submit"
            disabled={!restoreDeviceId.trim() || !restoreName.trim() || restoring}
            className="w-full py-4 rounded-xl bg-blue-600 text-white text-lg font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {restoring ? t("login.restoring") : t("login.restoreBtn")}
          </button>
        </form>
      )}
    </div>
  );
}
