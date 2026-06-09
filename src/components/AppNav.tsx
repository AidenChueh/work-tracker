"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useLocale } from "@/hooks/useLocale";
import { useDevice } from "@/hooks/useDevice";
import { SettingsModal } from "@/components/SettingsModal";

const NAV_ITEMS = [
  {
    href: "/",
    labelKey: "nav.clockIn",
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? "text-blue-400" : "text-gray-500"}`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M12 7v5l3 3" />
      </svg>
    ),
  },
  {
    href: "/records",
    labelKey: "nav.records",
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? "text-blue-400" : "text-gray-500"}`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path strokeLinecap="round" d="M9 12h6M9 16h4" />
      </svg>
    ),
  },
  {
    href: "/calendar",
    labelKey: "nav.calendar",
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? "text-blue-400" : "text-gray-500"}`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path strokeLinecap="round" d="M3 9h18M8 2v4M16 2v4" />
      </svg>
    ),
  },
  {
    href: "/jobs",
    labelKey: "nav.jobs",
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? "text-blue-400" : "text-gray-500"}`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path strokeLinecap="round" d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    ),
  },
];

export function AppNav() {
  const pathname = usePathname();
  const { t } = useLocale();
  const { deviceId } = useDevice();
  const [showSettings, setShowSettings] = useState(false);

  if (pathname === "/login") return null;

  return (
    <>
      <nav className="shrink-0 bg-gray-900 border-t border-gray-800 z-50">
        <div className="max-w-md mx-auto flex">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 flex flex-col items-center justify-center py-3 gap-1"
              >
                {item.icon(active)}
                <span className={`text-xs ${active ? "text-blue-400" : "text-gray-500"}`}>
                  {t(item.labelKey)}
                </span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-1"
          >
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs text-gray-500">{t("nav.settings")}</span>
          </button>
        </div>
      </nav>
      {showSettings && deviceId && (
        <SettingsModal deviceId={deviceId} onClose={() => setShowSettings(false)} />
      )}
    </>
  );
}
