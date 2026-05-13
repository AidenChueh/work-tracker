work-tracker 中文變更紀錄（2026-05-07 起）

## 2026-05-13 09:50
- 範圍：src/app/api/sessions/[id]/route.ts、src/app/api/jobs/[id]/route.ts
- 做了什麼：PATCH endpoint 改為明確 whitelist 可更新欄位，防止 mass assignment（攻擊者無法透過傳入 deviceId 改變資料所有權）
- 為什麼：安全性 code review 發現

## 2026-05-13 09:50
- 範圍：src/app/api/sessions/route.ts、src/app/api/sessions/[id]/route.ts
- 做了什麼：POST 和 PATCH 加入 clockOut > clockIn 的時間驗證，回傳 400
- 為什麼：前端可傳入 clockOut < clockIn 造成負工時計算

## 2026-05-13 09:50
- 範圍：src/app/records/page.tsx
- 做了什麼：刪除改為等 DELETE 成功後才更新 UI state（移除樂觀更新）；新增/編輯表單加入 clockOut > clockIn 前端驗證並顯示錯誤訊息
- 為什麼：原本刪除失敗仍從畫面消失；時間驗證需前後端雙重

## 2026-05-13 09:50
- 範圍：src/app/page.tsx
- 做了什麼：打卡/下班失敗時顯示 API 回傳錯誤；移除 onboarding 完成後的 window.location.reload()，改用 setUserName
- 為什麼：打卡失敗靜默、reload 在 PWA 環境有問題

## 2026-05-13 09:50
- 範圍：src/app/calendar/page.tsx
- 做了什麼：日格收入改用稅後金額（calcSessionIncome）；雙週薪期間淡底色修正為 cyan（原本 hardcoded amber）；拆 payPeriodDaySet 為 weeklyPeriodDaySet + biweeklyPeriodDaySet；三個 IIFE badge 提取為 BadgeCell component
- 為什麼：日格顯示稅前、badge 顯示稅後不一致；biweekly 顏色錯誤；IIFE 可讀性差

## 2026-05-13 09:50
- 範圍：src/types/api.ts（新增）、src/lib/payday.ts、src/lib/i18n.ts
- 做了什麼：建立共用型別檔，三個頁面改 import；payday.ts monthly case 內 now 改名 current 避免遮蔽；i18n 新增 home.clockFailed、records.timeError
- 為什麼：三個頁面各自定義相同型別，維護風險高

## 2026-05-07 20:29
- 範圍：src/app/records/page.tsx
- 做了什麼：
  - 編輯打卡紀錄時，若工作為抽成制，新增可編輯的業績欄位；送出時將 dailyRevenue 一併更新，薪資計算自動套用新值
  - 編輯時改變上班日期會同步下班日期，反向亦然，避免非跨夜班日期不一致
  - 新增打卡紀錄時，若選到「固定班表」工作，會自動帶入該工作的固定上下班時間（仍可手動修改）
- 為什麼：補充五需求 1、4、5

## 2026-05-07 20:29
- 範圍：src/app/calendar/page.tsx、src/lib/i18n.ts
- 做了什麼：
  - 行事曆中發薪日的合計 badge 改為顯示稅後金額（沿用工作的 taxEnabled 與 taxRate）
  - 點開週薪／雙週薪／月薪明細頁時，footer 在金額上方新增「工時：N hrs」並只顯示稅後金額（不再同時顯示稅前）
  - i18n 新增 cal.hoursTotal key
- 為什麼：補充五需求 2、3
