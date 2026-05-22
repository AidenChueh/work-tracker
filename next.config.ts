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

// 版本號 = 1.0.<更新次數>，更新次數 = git commit 數扣掉初始建立 commit。
// 與 package.json version 取較大值，避免 Vercel 淺層 clone 時 commit 數異常偏低。
const pkgPatch = parseInt(pkg.version.split(".")[2] ?? "0", 10) || 0;
const commitCount = parseInt(gitOut("git rev-list --count HEAD") ?? "0", 10);
const patch = Math.max(commitCount > 1 ? commitCount - 1 : 0, pkgPatch);
const appVersion = `v1.0.${patch}`;

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
