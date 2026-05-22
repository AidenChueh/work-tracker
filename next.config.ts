import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const pkg = JSON.parse(readFileSync("./package.json", "utf8")) as { version: string };

// 部署時的 commit 短碼：Vercel 有提供環境變數，本地則用 git 取得
let commit = "local";
try {
  commit =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
    execSync("git rev-parse --short HEAD").toString().trim();
} catch {
  // git 不可用時保留 "local"
}

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
  env: {
    NEXT_PUBLIC_APP_VERSION: `v${pkg.version}`,
    NEXT_PUBLIC_BUILD_COMMIT: commit,
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString().slice(0, 10),
  },
};

export default nextConfig;
