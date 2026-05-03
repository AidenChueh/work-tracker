# Work Tracker

輕鬆記錄工作時間與收入的 Web App，支援手機瀏覽器使用。

## 功能

- **打卡上下班** — 一鍵記錄工作開始與結束時間
- **多工作管理** — 支援不同時薪、佣金、加班費率
- **收入計算** — 自動依時薪與加班規則計算薪資
- **打卡紀錄** — 查看歷史工作紀錄
- **行事曆檢視** — 月曆方式瀏覽工作分布

## 技術棧

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL (via Prisma)
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## 本地開發

```bash
# 安裝套件
npm install

# 設定環境變數（複製 .env.local.example 並填入資料庫連線字串）
cp .env.local.example .env.local

# 同步資料庫 schema
npx prisma db push

# 啟動開發伺服器
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)

## 環境變數

| 變數 | 說明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 連線字串 |

## 部署

部署於 [Vercel](https://vercel.com)，資料庫使用 [Neon](https://neon.tech) PostgreSQL。
