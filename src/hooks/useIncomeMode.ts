"use client";
import { useState, useEffect, useCallback } from "react";

export type IncomeMode = "net" | "gross";

export function useIncomeMode(): [IncomeMode, (mode: IncomeMode) => void] {
  const [mode, setMode] = useState<IncomeMode>("net");

  useEffect(() => {
    if (localStorage.getItem("incomeMode") === "gross") setMode("gross");
  }, []);

  const update = useCallback((next: IncomeMode) => {
    setMode(next);
    localStorage.setItem("incomeMode", next);
  }, []);

  return [mode, update];
}
