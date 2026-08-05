"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/hooks/useLocale";

const iconCls = (active: boolean) =>
  `w-6 h-6 transition-all duration-200 ${active ? "text-blue-400 scale-105" : "text-gray-500"}`;
const fillCls = (active: boolean) => (active ? "fill-blue-400/25" : "fill-none");

const NAV_ITEMS = [
  {
    href: "/",
    labelKey: "nav.clockIn",
    icon: (active: boolean) => (
      <svg className={iconCls(active)} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" className={fillCls(active)} />
        <path strokeLinecap="round" d="M12 7v5l3 3" />
      </svg>
    ),
  },
  {
    href: "/records",
    labelKey: "nav.records",
    icon: (active: boolean) => (
      <svg className={iconCls(active)} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" className={fillCls(active)} d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" className={fillCls(active)} />
        <path strokeLinecap="round" d="M9 12h6M9 16h4" />
      </svg>
    ),
  },
  {
    href: "/calendar",
    labelKey: "nav.calendar",
    icon: (active: boolean) => (
      <svg className={iconCls(active)} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2" className={fillCls(active)} />
        <path strokeLinecap="round" d="M3 9h18M8 2v4M16 2v4" />
      </svg>
    ),
  },
  {
    href: "/jobs",
    labelKey: "nav.jobs",
    icon: (active: boolean) => (
      <svg className={iconCls(active)} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <rect x="2" y="7" width="20" height="14" rx="2" className={fillCls(active)} />
        <path strokeLinecap="round" d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    ),
  },
];

export function AppNav() {
  const pathname = usePathname();
  const { t } = useLocale();

  if (pathname === "/login") return null;

  return (
    <nav className="shrink-0 bg-gray-900 border-t border-gray-800 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto flex">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center py-3 gap-1 active:opacity-70 transition-opacity"
            >
              {item.icon(active)}
              <span className={`text-xs transition-colors duration-200 ${active ? "text-blue-400 font-semibold" : "text-gray-500 font-medium"}`}>
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
