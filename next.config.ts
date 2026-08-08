import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const pkg = JSON.parse(readFileSync("./package.json", "utf8")) as { version: string };

function gitOut(cmd: string): string | null {
  try {
    return execSync(cmd).toString().trim();
  } catch {
    return null;
  }
}

// 版本號直接讀 package.json，每次 commit 手動 +0.01。
// 不再用 git commit 數推算：Vercel 淺層 clone 會少算，導致線上版本號卡住。
const appVersion = `v${pkg.version}`;

// 部署時的 commit 短碼：Vercel 有提供環境變數，本地則用 git 取得
const commit =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? gitOut("git rev-parse --short HEAD") ?? "local";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
    NEXT_PUBLIC_BUILD_COMMIT: commit,
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString().slice(0, 10),
  },
};

export default nextConfig;
