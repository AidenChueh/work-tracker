# work-tracker — Claude 專案說明

## 技術棧
- **框架**：Next.js 15（App Router）、React 19、TypeScript
- **樣式**：Tailwind CSS v3
- **ORM**：Prisma v5，資料庫為 PostgreSQL（本地開發用 `prisma/dev.db`）
- **套件管理**：npm

## 專案結構
```
src/
  app/
    page.tsx          # 首頁（打卡主頁面）
    jobs/             # 工作管理（新增/編輯工作）
    records/          # 打卡紀錄列表
    calendar/         # 行事曆視圖
    api/              # API routes (Next.js Route Handlers)
  components/         # 共用元件
  hooks/              # Custom hooks
  lib/                # 工具函式、Prisma client
```

## 資料庫模型
```
Device          裝置識別（無帳號系統，以 deviceId 區分使用者）
Job             工作設定，包含薪資規則
WorkSession     打卡紀錄（clockIn / clockOut）
Break           休息紀錄（可設定是否帶薪）
OvertimeTier    加班費分級
```

### Job 薪資欄位說明
| 欄位 | 說明 |
|------|------|
| `hourlyRate` | 時薪 |
| `commissionPercentage` | 抽成比例 |
| `commissionRequired` | 是否必填業績 |
| `payFrequency` | 發薪頻率（預設 weekly） |
| `payDay` | 發薪日 |
| `taxEnabled` | 是否扣稅 |
| `breakDuration` | 固定休息時長（分鐘） |
| `breakRate` | 休息時薪倍率 |
| `penaltyRatesEnabled` | 是否啟用假日加成 |
| `saturdayRate` | 週六倍率（預設 1.5） |
| `sundayRate` | 週日倍率（預設 2.0） |
| `publicHolidayRate` | 國定假日倍率（預設 2.5） |
| `scheduleType` | `flexible`（彈性）或 `fixed`（固定班表） |
| `fixedClockIn/Out` | 固定班表的上下班時間 |
| `payWeekStart` | 薪資週起算日（0=週日） |
| `overtimeTiers` | 加班費分級（達到 N 小時後套用倍率） |

### WorkSession 欄位說明
| 欄位 | 說明 |
|------|------|
| `clockIn` | 上班時間 |
| `clockOut` | 下班時間（null = 仍在班） |
| `isPublicHoliday` | 是否為國定假日 |
| `dailyRevenue` | 當日業績（用於抽成計算） |
| `breaks` | 關聯的休息紀錄 |

## 薪資計算邏輯
1. 有效工時 = 總時數 - 不帶薪休息時數
2. 基本薪資 = 有效工時 × 時薪
3. 假日加成 = 依當日類型（週六/週日/國定假日）套用對應倍率
4. 加班費 = 超過 OvertimeTier 門檻的時數 × (倍率 × 時薪)
5. 抽成 = dailyRevenue × commissionPercentage（若啟用）
6. 稅 = 總薪資 × 稅率（若啟用 taxEnabled）

## 開發指令
```bash
npm run dev          # 啟動開發伺服器
npm run build        # 建置（含 prisma generate）
npm run db:push      # 同步 schema 至資料庫
npm run db:studio    # 開啟 Prisma Studio
```

## 注意事項
- 無使用者帳號系統，以 `deviceId`（localStorage）區分裝置
- API 路由位於 `src/app/api/`，使用 Next.js Route Handlers
- 所有時間以 ISO 8601 儲存，前端顯示時轉換為當地時區
- 修改 Prisma schema 後需執行 `npm run db:push`

## Change Log
- 2026-05-07 20:29 | records | 編輯打卡：抽成工作可改業績、上下班日期同步
- 2026-05-07 20:29 | records | 新增打卡：選固定班表工作時自動帶入預設時間
- 2026-05-07 20:29 | calendar | 發薪日 badge 改顯示稅後金額；週/雙週/月薪明細頁加上工時合計，金額只顯示稅後
- 2026-05-13 09:50 | security | 修 PATCH mass assignment（sessions/jobs）
- 2026-05-13 09:50 | api | sessions POST/PATCH 加 clockOut > clockIn 驗證
- 2026-05-13 09:50 | records | 刪除改為確認後才更新 state；新增/編輯加時間驗證
- 2026-05-13 09:50 | home | 打卡失敗顯示錯誤訊息；onboarding 移除 window.location.reload()
- 2026-05-13 09:50 | calendar | 日格改顯示稅後金額；雙週淡底色修正為 cyan；badge 提取為 BadgeCell component；payPeriodDaySet 拆成 weekly/biweekly 兩個
- 2026-05-13 09:50 | types | 建立 src/types/api.ts 共用型別；payday.ts 修 now 變數遮蔽
