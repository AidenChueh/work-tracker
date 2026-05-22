import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppNav } from "@/components/AppNav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Work Tracker",
  description: "Track your work hours and earnings",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full overflow-hidden flex flex-col bg-gray-950 text-white`}>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {children}
          <p className="text-center text-[10px] text-gray-600 py-2">
            {process.env.NEXT_PUBLIC_APP_VERSION} · {process.env.NEXT_PUBLIC_BUILD_COMMIT} · {process.env.NEXT_PUBLIC_BUILD_DATE}
          </p>
        </div>
        <AppNav />
      </body>
    </html>
  );
}
