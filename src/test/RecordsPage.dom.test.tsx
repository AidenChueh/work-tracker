// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

vi.mock("@/hooks/useDevice", () => ({
  useDevice: () => ({ deviceId: "d1", userName: "U", loaded: true, setUserName: () => {} }),
}));

import RecordsPage from "@/app/records/page";
import type { Job, WorkSession } from "@/types/api";

afterEach(cleanup);

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "j1",
    name: "Test Job",
    hourlyRate: 20,
    commissionPercentage: null,
    commissionRequired: false,
    payFrequency: "monthly",
    payDay: 15,
    payWeekStart: null,
    taxEnabled: false,
    breakDuration: 30,
    breakRate: null,
    penaltyRatesEnabled: false,
    publicHolidayRate: 2.5,
    saturdayRate: 1.5,
    sundayRate: 2.0,
    saturdayHourlyRate: null,
    sundayHourlyRate: null,
    publicHolidayHourlyRate: null,
    scheduleType: "flexible",
    fixedClockIn: null,
    fixedClockOut: null,
    overtimeTiers: [],
    createdAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeSession(job: Job, overrides: Partial<WorkSession> = {}): WorkSession {
  const clockIn = new Date();
  clockIn.setHours(9, 0, 0, 0);
  const clockOut = new Date(clockIn);
  clockOut.setHours(17, 0, 0, 0);
  return {
    id: "s1",
    jobId: job.id,
    job,
    clockIn: clockIn.toISOString(),
    clockOut: clockOut.toISOString(),
    notes: null,
    isPublicHoliday: false,
    dailyRevenue: null,
    breakMinutes: null,
    payRulesSnapshot: null,
    breaks: [],
    ...overrides,
  };
}

function setFetch(jobs: Job[], sessions: WorkSession[]) {
  global.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    const data = url.includes("/api/jobs") ? jobs : sessions;
    return Promise.resolve({ ok: true, json: async () => data } as Response);
  }) as unknown as typeof fetch;
}

async function openEditForm() {
  fireEvent.click(await screen.findByLabelText("更多操作"));
  fireEvent.click(screen.getByText("編輯"));
}

describe("RecordsPage — 刪除紀錄", () => {
  it("⋯ → 刪除 → 確認後送出 DELETE", async () => {
    const job = makeJob();
    const session = makeSession(job);
    setFetch([job], [session]);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<RecordsPage />);
    fireEvent.click(await screen.findByLabelText("更多操作"));
    fireEvent.click(screen.getByText("刪除"));

    expect(confirmSpy).toHaveBeenCalled();
    const calls = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
    const del = calls.find((c) => (c[1] as RequestInit | undefined)?.method === "DELETE");
    expect(del?.[0]).toBe(`/api/sessions/${session.id}`);
    confirmSpy.mockRestore();
  });
});

describe("RecordsPage — 編輯紀錄休息欄位", () => {
  it("時薪制工作的紀錄，編輯時顯示休息時間欄位", async () => {
    const job = makeJob();
    setFetch([job], [makeSession(job)]);
    render(<RecordsPage />);
    await openEditForm();
    expect(screen.getByText("休息時間")).toBeInTheDocument();
  });

  it("抽成制工作的紀錄，編輯時不顯示休息欄位、改顯示業績欄位", async () => {
    const job = makeJob({ hourlyRate: null, commissionPercentage: 0.1 });
    setFetch([job], [makeSession(job, { dailyRevenue: 500 })]);
    render(<RecordsPage />);
    await openEditForm();
    expect(screen.queryByText("休息時間")).not.toBeInTheDocument();
    expect(screen.getByText(/今日業績/)).toBeInTheDocument();
  });
});

describe("RecordsPage — 薪資週收合", () => {
  it("點擊薪資週 header 可收合，最新一週預設展開", async () => {
    const job = makeJob();
    setFetch([job], [makeSession(job)]);
    render(<RecordsPage />);
    const header = await screen.findByText(/工作 1 天/);
    const button = header.closest("button")!;
    expect(button).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
  });
});

describe("RecordsPage — 備註欄位", () => {
  it("新增表單顯示備註欄位", async () => {
    const job = makeJob();
    setFetch([job], []);
    render(<RecordsPage />);
    fireEvent.click(await screen.findByText("+ 新增打卡"));
    expect(screen.getByPlaceholderText("選填，記點什麼…")).toBeInTheDocument();
  });

  it("新增表單日期預設為今天", async () => {
    const job = makeJob();
    setFetch([job], []);
    render(<RecordsPage />);
    fireEvent.click(await screen.findByText("+ 新增打卡"));
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput.value).toBe(today);
  });

  it("編輯表單顯示備註欄位", async () => {
    const job = makeJob();
    setFetch([job], [makeSession(job)]);
    render(<RecordsPage />);
    await openEditForm();
    expect(screen.getByPlaceholderText("選填，記點什麼…")).toBeInTheDocument();
  });

  it("有備註的紀錄會在列表顯示備註內容", async () => {
    const job = makeJob();
    setFetch([job], [makeSession(job, { notes: "今天很忙" })]);
    render(<RecordsPage />);
    expect(await screen.findByText("今天很忙")).toBeInTheDocument();
  });
});
