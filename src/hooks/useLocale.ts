"use client";
import { useSyncExternalStore, useCallback } from "react";
import { getLocale, setLocale, subscribeLocale } from "@/lib/locale-store";
import { translate, type Locale } from "@/lib/i18n";

export function useLocale() {
  const locale = useSyncExternalStore(
    subscribeLocale,
    getLocale,
    () => "zh" as Locale
  );
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale]
  );
  return { locale, setLocale, t };
}
