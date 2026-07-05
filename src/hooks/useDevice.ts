"use client";
import { useState, useEffect, useCallback } from "react";

export function getStoredDeviceId(): string | null {
  return localStorage.getItem("deviceId");
}

export function saveDeviceSession(deviceId: string, userName: string) {
  localStorage.setItem("deviceId", deviceId);
  localStorage.setItem("userName", userName);
}

export function clearDeviceSession() {
  localStorage.removeItem("deviceId");
  localStorage.removeItem("userName");
}

export function useDevice() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [userName, setUserNameState] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setDeviceId(localStorage.getItem("deviceId"));
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
