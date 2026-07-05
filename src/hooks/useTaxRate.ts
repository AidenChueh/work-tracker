"use client";
import { useState, useEffect } from "react";

export function useTaxRate(): number {
  const [taxRate, setTaxRate] = useState(0);

  useEffect(() => {
    const stored = parseFloat(localStorage.getItem("taxRate") ?? "0");
    setTaxRate(isNaN(stored) ? 0 : stored);
  }, []);

  return taxRate;
}
