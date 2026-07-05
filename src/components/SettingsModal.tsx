"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/hooks/useLocale";
import { clearDeviceSession } from "@/hooks/useDevice";
import { clearCache } from "@/lib/api-cache";
import { LocaleToggle } from "@/components/LocaleToggle";

type Props = {
  deviceId: string;
  onClose: () => void;
};

type CopyState = "idle" | "copied" | "failed";

export function SettingsModal({ deviceId, onClose }: Props) {
  const { t } = useLocale();
  const router = useRouter();
  const [copyState, setCopyState] = useState<CopyState>("idle");

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(deviceId);
      } else {
        const ta = document.createElement("textarea");
        ta.value = deviceId;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    setTimeout(() => setCopyState("idle"), 2000);
  };

  const handleLogout = () => {
    clearDeviceSession();
    clearCache();
    router.replace("/login");
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[60] flex items-end justify-center"
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
              {copyState === "copied" ? t("settings.copied") : copyState === "failed" ? t("settings.copyFailed") : t("settings.copy")}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-400">{t("settings.language")}</p>
          <LocaleToggle />
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full py-3 rounded-xl bg-red-900/40 text-red-400 font-medium hover:bg-red-900/60 transition-colors"
        >
          {t("settings.logout")}
        </button>

        <p className="text-center text-[10px] text-gray-600 mt-5">
          {process.env.NEXT_PUBLIC_APP_VERSION} · {process.env.NEXT_PUBLIC_BUILD_COMMIT} · {process.env.NEXT_PUBLIC_BUILD_DATE}
        </p>
      </div>
    </div>
  );
}
