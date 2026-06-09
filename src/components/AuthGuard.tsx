"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/login") return;
    if (!localStorage.getItem("deviceId")) {
      router.replace("/login");
    }
  }, [pathname, router]);

  return <>{children}</>;
}
