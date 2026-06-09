"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/hooks/useLocale";

type Props = {
  deviceId: string;
  onClose: () => void;
};

export function SettingsModal({ deviceId, onClose }: Props) {
  const { t } = useLocale();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(deviceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = () => {
    localStorage.removeItem("deviceId");
    localStorage.removeItem("userName");
    router.replace("/login");
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border-t border-gray-800 rounded-t-2xl w-full max-w-md p-6 pb-10"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-5">{t("settings.title")}</h2>

        <div className="mb-6">
          <p className="text-sm text-gray-400 mb-2">{t("settings.deviceIdLabel")}</p>
          <div className="bg-gray-800 rounded-xl px-4 py-3 flex items-center gap-3">
            <p className="font-mono text-xs text-gray-300 flex-1 break-all select-all">{deviceId}</p>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
            >
              {copied ? t("settings.copied") : t("settings.copy")}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full py-3 rounded-xl bg-red-900/40 text-red-400 font-medium hover:bg-red-900/60 transition-colors"
        >
          {t("settings.logout")}
        </button>
      </div>
    </div>
  );
}
