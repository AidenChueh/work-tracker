import type { Locale } from "./i18n";

let current: Locale = "zh";
let initialized = false;
const listeners = new Set<() => void>();

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  const stored = window.localStorage.getItem("locale");
  if (stored === "en" || stored === "zh") current = stored;
  initialized = true;
}

export function getLocale(): Locale {
  ensureInit();
  return current;
}

export function setLocale(l: Locale): void {
  if (typeof window !== "undefined") window.localStorage.setItem("locale", l);
  current = l;
  initialized = true;
  listeners.forEach((fn) => fn());
}

export function subscribeLocale(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
