# Work Tracker 專案完整導覽：給初學者的全貌解說

> 這份文件用 Work Tracker 這個你親手做的專案，帶你看懂一個現代網站從「點子」到「能在手機上用」之間，每一塊拼圖在做什麼、為什麼這樣設計。讀完後你不只懂 Work Tracker，還會懂世界上 90% 網頁專案的長相。

---

## 1. 這個專案在解決什麼問題？整體流程

想像你是個打工族，手上同時做兩三份工作（按摩、早班...），每份的時薪、發薪日、扣稅規則都不一樣。月底要算「這週賺多少？這個月薪水多少？」就得抓計算機按半天。**Work Tracker 把這件事自動化了** — 點一下打卡上班，下班再點一下，系統就幫你算好錢、按發薪日分群、月底自動加總。

### 從點子到上線的開發流程

1. **想清楚要解決什麼問題**（你已經做了：記錄打工時間和收入）
2. **設計畫面與資料結構**（哪些欄位？要存什麼？）
3. **寫程式**（前端畫面 + 後端邏輯 + 資料庫）
4. **本機測試**（在自己電腦上 `npm run dev` 跑起來）
5. **部署到網路**（推上 GitHub，Vercel 自動接手）
6. **持續迭代**（依使用者回饋繼續改善 — 你正在做的「補充一、二、三、四」就是迭代）

### 前端 vs 後端：餐廳比喻

把網站想成一家餐廳：

- **前端 (Frontend)** = 餐廳的「外場」：菜單、桌子、服務生、裝潢。使用者看到、點擊、互動的東西。
- **後端 (Backend)** = 餐廳的「內場」：廚房、食材庫存、出餐流程。看不到，但所有真正的「處理」在這裡發生。
- **資料庫 (Database)** = 餐廳的「冰箱與倉庫」：所有食材、訂單記錄都存在這裡。

當你按「打卡上班」：

1. **前端**收到你的點擊（外場服務生記下訂單）
2. **前端**把資料用 API 送去後端（服務生把訂單貼到廚房窗口）
3. **後端**處理邏輯：建立一筆 WorkSession（廚師備餐）
4. **後端**把資料存進**資料庫**（食材入庫）
5. **後端**回傳結果給前端（廚師通知服務生：好了）
6. **前端**更新畫面（你看到計時器開始跳）

---

## 2. 核心技術一覽

### 前端技術

#### HTML、CSS、JavaScript：網頁三劍客

- **HTML** = 「結構」：定義有哪些元素（按鈕、文字、輸入框）。比喻：房子的鋼筋骨架。
- **CSS** = 「樣式」：定義長什麼樣（顏色、字型、間距）。比喻：油漆、家具、裝潢。
- **JavaScript** = 「行為」：定義會做什麼（點按鈕後發生什麼事）。比喻：家裡的電器和開關。

這三樣是所有網頁的底層，一個都不能少。

#### React (Next.js)

你的專案用的是 **Next.js**，它是建立在 **React** 之上的框架。

- **React** = 把畫面切成「元件 (Component)」，每個元件管自己的事。例：`AddJobForm` 管「新增工作的表單」，`EditJobForm` 管「編輯」。為什麼這樣？因為可以**重複使用**、**獨立修改**。
- **Next.js** = React 的「升級版套餐」，多了路由（網址對應哪個畫面）和伺服器端能力。例：`src/app/jobs/page.tsx` 自動對應到 `/jobs` 這個網址。

其他常見：Vue（簡單上手）、Angular（大企業愛用、但較重）。

#### Tailwind CSS

`<div className="bg-gray-800 rounded-2xl p-4">` 這種就是 Tailwind。

- 不用另外寫 CSS 檔案，直接用 class 名描述樣式。
- 比喻：原本要去油漆店調色，現在直接在牆上貼便利貼「我要灰色背景、圓角、內距 16px」，工人照貼紙做。
- 為什麼用？**寫得快**，樣式直接寫在元件旁一目了然。

---

### 後端技術

#### Node.js + Next.js API Routes

- **Node.js** = 讓 JavaScript 能在「伺服器」上跑的執行環境（原本 JS 只能在瀏覽器跑）。
- **Next.js API Routes** = Next.js 內建的後端功能。`src/app/api/jobs/route.ts` 自動變成 `/api/jobs` 這個 API 端點。

你的專案前端後端都是 Next.js，這叫「**Full-Stack Framework**」。優點：一個專案搞定全部，不用維護兩個系統。

其他常見：Python + Django/Flask（AI/資料分析常用）、Ruby on Rails（號稱最快開發速度）、Java + Spring（大企業常用）。

---

### 資料庫技術

#### PostgreSQL（你用的）

- **資料庫** = 把資料有組織地存起來，方便查詢、修改、刪除。
- 比喻：圖書館的書架系統。每本書有編號、作者、書名，要找的時候很快。

#### 關聯型 vs 非關聯型（簡單版）

| 種類 | 比喻 | 例子 | 你用 |
|---|---|---|---|
| **關聯型 (SQL)** | Excel 表格，欄位固定 | PostgreSQL、MySQL | ✓ PostgreSQL |
| **非關聯型 (NoSQL)** | 收納箱，每箱裡可以塞不一樣東西 | MongoDB、Firebase | ✗ |

你的 `Job` 表格固定有 `name`、`hourlyRate`、`payDay` 等欄位，每筆都長一樣 → 適合 SQL。

#### Prisma (ORM)

直接用 SQL 寫 `INSERT INTO Job VALUES (...)` 容易出錯。Prisma 讓你用 JavaScript 物件操作資料庫：

```js
await prisma.job.create({ data: { name: "按摩", hourlyRate: 35 } })
```

- **ORM** = Object-Relational Mapping，把資料庫的「表格」對應成程式裡的「物件」。
- 比喻：你不用學「圖書館分類編號」，只要說「我要那本《哈利波特》」，Prisma 幫你去書架找。

#### Neon（你的 DB 供應商）

PostgreSQL 是「軟體」，要跑在某台「機器」上。Neon 租給你一台雲端機器，幫你裝好 PostgreSQL，你只要連上去用就好。

---

### API 是什麼？

**API (Application Programming Interface)** = 兩個程式之間講話的「規矩」。

比喻：去麥當勞點餐，菜單是 API。

- 你（前端）：「我要 1 號餐、可樂、無冰」
- 櫃台（API 規矩）：規定怎麼講才聽得懂
- 廚房（後端）：照規矩做出餐

你的專案 API 例子：

| 前端動作 | 送什麼到 API | API 端點 | 後端做什麼 |
|---|---|---|---|
| 新增工作 | `POST /api/jobs` + 工作資料 | `src/app/api/jobs/route.ts` | 寫進 DB |
| 看所有工作 | `GET /api/jobs` | 同上 | 從 DB 撈出來回傳 |
| 刪除工作 | `DELETE /api/jobs/abc123` | `[id]/route.ts` | 從 DB 刪掉（連同打卡紀錄級聯刪） |

---

## 3. 部署：從你的電腦到全世界都能用

### 寫完程式後發生什麼事？

你的程式現在只在你的筆電裡跑。要讓你媽媽用手機也能打開，需要：

1. **把程式放到一台 24 小時開機的電腦上**（叫「**伺服器 (Server)**」）
2. **這台電腦要有對外的網址**（叫「**網域 (Domain)**」）
3. **資料庫也要在雲端**（你已經做了：Neon）

### 概念元件解析

| 名詞 | 是什麼 | 你的專案用什麼 |
|---|---|---|
| **伺服器 (Server)** | 24 小時開機、執行你程式的電腦 | Vercel 提供 |
| **託管平台 (Hosting)** | 賣你伺服器空間的服務 | Vercel |
| **網域 (Domain)** | 網址，讓人記得住 | `work-tracker-eosin-sigma.vercel.app` |
| **CDN** | 全球分散的快取節點，讓世界各地的人都載得快 | Vercel 自帶 |

### 從你電腦到網路的簡化流程

```
[你的電腦] 寫好 code
     ↓ (git push)
[GitHub] 程式碼版本管理（雲端的 USB 隨身碟 + 完整歷史紀錄）
     ↓ (Vercel 自動偵測到更新)
[Vercel] 自動：1. 下載 code  2. 跑 next build  3. 部署到伺服器
     ↓
[全世界使用者] 打開 work-tracker-eosin-sigma.vercel.app
     ↓
[使用者] 操作 → 前端送 API → 後端 → Neon DB
```

**關鍵概念**：你不需要手動把檔案上傳到伺服器。

- 你只要 `git push` 到 GitHub
- Vercel 訂閱了你的 GitHub repo，看到更新就自動部署
- 這叫「**CI/CD（持續整合/持續部署）**」，是現代工程的標配

其他常見部署平台：

- **Vercel** / **Netlify** — 適合前端 + Serverless。最容易上手。
- **Heroku** — 老牌，適合後端應用。
- **AWS / GCP / Azure** — 大型雲端，功能最多但複雜，給有專業 DevOps 的團隊。

---

## 4. 專案資料夾結構導覽

打開 `C:\Users\aiden\Desktop\work-tracker\` 你會看到：

### `src/` — 你寫的所有原始碼

所有「你親手寫的」程式都在這裡。Next.js 規定的入口。

#### `src/app/` — 頁面與 API 路由

Next.js 13+ 的 App Router 規範。**每個資料夾名稱對應一個網址**。

- `src/app/page.tsx` → `/` 首頁（打卡頁面）
- `src/app/jobs/page.tsx` → `/jobs`（工作管理）
- `src/app/calendar/page.tsx` → `/calendar`（行事曆）
- `src/app/records/page.tsx` → `/records`（打卡紀錄）
- `src/app/api/jobs/route.ts` → `POST/GET /api/jobs`（API 端點）
- `src/app/globals.css` → 全站共用 CSS

#### `src/components/` — 可重複使用的 UI 積木

獨立的小元件，可以在多個頁面重複使用。

- `AddJobForm.tsx` / `EditJobForm.tsx` / `OnboardingForm.tsx`

> 為什麼分開？「表單邏輯」和「頁面佈局」是兩件事，分開比較好維護。

#### `src/lib/` — 共用的工具函式

不屬於 UI、可以在任何地方呼叫的純邏輯。

- `income.ts` — 計算薪資（時薪 × 時數、Penalty Rates...）
- `payday.ts` — 計算下一個發薪日
- `prisma.ts` — 跟資料庫對話的客戶端

#### `src/hooks/` — React 自訂 hooks

React 特有的「可重複使用的狀態邏輯」。

- `useDevice.ts` — 取得當前裝置 ID 和使用者名字

---

### `prisma/` — 資料庫的設計圖

- `schema.prisma` — 定義資料庫長什麼樣（有哪些表、欄位、關聯）

> 改這個檔案然後跑 `prisma db push` 就會去 Neon 同步。這就像建築圖：改了藍圖，工人才知道要拆哪面牆。

---

### `public/` — 靜態檔案

直接對外公開的檔案（圖片、icon、字體）。Next.js 會原封不動丟出去。

---

### `node_modules/` — 第三方套件的家

你裝過的所有第三方程式碼（React、Next.js、Tailwind、Prisma...）都在這裡。

> ⚠️ **不要 commit 到 Git**（已加在 `.gitignore`）。檔案巨大、可隨時用 `npm install` 重建。
> 比喻：食譜寫「需要醬油、米、肉」，每個廚房自己去超市買，不用把雜貨店搬家。

---

### 重要單檔

| 檔名 | 是什麼 |
|---|---|
| `package.json` | 專案的身分證：列出所有用到的套件 + 可跑的指令（如 `npm run dev`） |
| `package-lock.json` | 鎖定每個套件的精確版本，確保你電腦跟 Vercel 跑出來一樣 |
| `.env` | **機密設定**（不進 Git）。放敏感資訊：`DATABASE_URL=...` 連 Neon 的密碼 |
| `.gitignore` | 告訴 Git 哪些檔案要忽略（`node_modules/`、`.env`...） |
| `next.config.ts` | Next.js 的設定。你的專案有 `serverExternalPackages` 處理 Prisma 在 Vercel 上的特殊狀況 |
| `tsconfig.json` | TypeScript 的設定（你用的是 TypeScript，JavaScript 的進階版多了型別檢查） |
| `tailwind.config.ts` / `postcss.config.mjs` | Tailwind 的設定 |

---

## 一張圖總結整個流程

```
你寫程式
  ↓
src/app/jobs/page.tsx  ←→  src/components/AddJobForm.tsx  (前端)
  ↓ (使用者按按鈕，fetch API)
src/app/api/jobs/route.ts  (後端 API)
  ↓ (用 Prisma 操作)
prisma/schema.prisma  (資料庫設計圖)
  ↓
Neon PostgreSQL  (雲端資料庫)
  ↓ (撈回資料)
回到前端，更新畫面

部署：
git push → GitHub → Vercel 自動部署 → 全世界都能用
```

---

## 給你的下一步建議

1. **挑一個你不熟的元件，從頭讀一次**（例如 `src/app/page.tsx`），對照這份文件。
2. **故意改壞一個地方看會發生什麼事**（例如把 `bg-gray-800` 改成 `bg-red-500`），這是學最快的方式。
3. **遇到不懂的單字或概念，記下來**問我或 Google，不要怕問笨問題。

你已經做完一個能上線、有真實價值的全端專案 — 這比 90% 的「教學文章看完就忘」厲害太多。繼續加油。
