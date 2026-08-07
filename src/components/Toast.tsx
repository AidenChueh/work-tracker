"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { RADIUS, TYPE } from "@/lib/theme";

type ToastKind = "success" | "error";
type ToastItem = { id: number; message: string; kind: ToastKind };
type ShowToast = (message: string, kind?: ToastKind) => void;

// 預設 no-op：沒有 Provider（例如單元測試單獨 render 頁面）也不會壞
const ToastContext = createContext<ShowToast>(() => {});

export function useToast(): ShowToast {
  return useContext(ToastContext);
}

function ToastIcon({ kind }: { kind: ToastKind }) {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      {kind === "success" ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      ) : (
        <>
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M12 8v5M12 16.5v.01" />
        </>
      )}
    </svg>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback<ShowToast>((message, kind = "success") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, kind }].slice(-3));
    if (typeof navigator !== "undefined") navigator.vibrate?.(kind === "success" ? 10 : [10, 60, 10]);
    setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 2600);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+76px)] z-[80] flex flex-col items-center gap-2 px-4 pointer-events-none"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={`animate-sheet-up w-full max-w-md flex items-center gap-2 px-3.5 py-2.5 border ${RADIUS.cell} shadow-lg shadow-black/40 backdrop-blur ${
              item.kind === "success"
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-200"
                : "bg-red-500/15 border-red-500/30 text-red-200"
            }`}
          >
            <ToastIcon kind={item.kind} />
            <span className={TYPE.control}>{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
