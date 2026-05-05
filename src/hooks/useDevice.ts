"use client";
import { useState, useEffect, useCallback } from "react";

export function useDevice() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [userName, setUserNameState] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let id = localStorage.getItem("deviceId");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("deviceId", id); }
    setDeviceId(id);
    setUserNameState(localStorage.getItem("userName"));
    setLoaded(true);
  }, []);

  const setUserName = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem("userName", trimmed);
    setUserNameState(trimmed);
  }, []);

  return { deviceId, userName, loaded, setUserName };
}
