"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/hooks/useLocale";
import { clearDeviceSession } from "@/hooks/useDevice";
import { clearCache } from "@/lib/api-cache";
import { LocaleToggle } from "@/components/LocaleToggle";
import { FORM, RADIUS, TYPE } from "@/lib/theme";

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
      className="fixed inset-0 bg-black/60 z-[60] flex items-end justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border-t border-gray-800 rounded-t-2xl w-full max-w-md p-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] animate-sheet-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className={`${TYPE.pageTitle} mb-5`}>{t("settings.title")}</h2>

        <div className="mb-6">
          <p className={`${FORM.label} mb-2`}>{t("settings.deviceIdLabel")}</p>
          <div className={`bg-gray-800 ${RADIUS.cell} px-3.5 py-3 flex items-center gap-3`}>
            <p className="font-mono text-[11px] leading-4 text-gray-300 flex-1 break-all select-all">{deviceId}</p>
            <button
              type="button"
              onClick={handleCopy}
              className={`shrink-0 h-9 px-3 ${RADIUS.chip} bg-gray-700 text-gray-300 ${TYPE.control} hover:bg-gray-600 active:scale-[0.98] transition-all duration-150`}
            >
              {copyState === "copied" ? t("settings.copied") : copyState === "failed" ? t("settings.copyFailed") : t("settings.copy")}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <p className={FORM.label}>{t("settings.language")}</p>
          <LocaleToggle />
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className={`w-full ${FORM.btnDanger}`}
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
