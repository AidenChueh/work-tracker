"use client";
import { useState, useEffect } from "react";

export function useDevice() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let id = localStorage.getItem("deviceId");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("deviceId", id); }
    setDeviceId(id);
    setUserName(localStorage.getItem("userName"));
    setLoaded(true);
  }, []);

  return { deviceId, userName, loaded };
}
