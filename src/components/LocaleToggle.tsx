"use client";
import { useLocale } from "@/hooks/useLocale";

type Props = { className?: string };

export function LocaleToggle({ className = "" }: Props) {
  const { locale, setLocale } = useLocale();
  return (
    <div className={`inline-flex bg-gray-800 border border-gray-700 rounded-full p-0.5 text-xs ${className}`}>
      {(["zh", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          className={`px-2.5 py-1 rounded-full transition-colors ${
            locale === l ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          {l === "zh" ? "中" : "EN"}
        </button>
      ))}
    </div>
  );
}
