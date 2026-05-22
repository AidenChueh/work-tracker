// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { EditJobForm } from "@/components/EditJobForm";
import type { Job } from "@/types/api";

afterEach(cleanup);

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "j1",
    name: "My Job",
    hourlyRate: 20,
    commissionPercentage: null,
    commissionRequired: false,
    payFrequency: "weekly",
    payDay: 1,
    payWeekStart: null,
    taxEnabled: false,
    breakDuration: null,
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

type FetchResult = { ok: boolean; json: () => Promise<unknown> };

function setFetch(handler: (url: string) => FetchResult) {
  global.fetch = vi.fn((input: RequestInfo | URL) =>
    Promise.resolve(handler(String(input)) as Response)
  ) as unknown as typeof fetch;
}

function renderForm(job: Job, onSaved: () => void = () => {}) {
  render(
    <EditJobForm
      job={job}
      deviceId="d1"
      onSaved={onSaved}
      onCancel={() => {}}
      onDeleted={() => {}}
    />
  );
}

describe("EditJobForm", () => {
  it("顯示工作名稱", () => {
    renderForm(makeJob({ name: "Cashier" }));
    expect(screen.getByDisplayValue("Cashier")).toBeInTheDocument();
  });

  it("只改名稱（薪資未變）直接儲存，不跳出套用範圍面板", async () => {
    setFetch(() => ({ ok: true, json: async () => makeJob() }));
    const onSaved = vi.fn();
    renderForm(makeJob(), onSaved);
    fireEvent.change(screen.getByDisplayValue("My Job"), { target: { value: "Renamed" } });
    fireEvent.click(screen.getByRole("button", { name: "儲存" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(screen.queryByText("薪資設定已變動")).not.toBeInTheDocument();
  });

  it("改時薪且該工作已有紀錄時，跳出套用範圍面板", async () => {
    setFetch((url) =>
      url.includes("/api/sessions")
        ? { ok: true, json: async () => [{ id: "s1" }] }
        : { ok: true, json: async () => makeJob() }
    );
    renderForm(makeJob());
    fireEvent.change(screen.getByDisplayValue("20"), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "儲存" }));
    expect(await screen.findByText("薪資設定已變動")).toBeInTheDocument();
    const hitJobsApi = vi
      .mocked(global.fetch)
      .mock.calls.some((c) => String(c[0]).includes("/api/jobs/"));
    expect(hitJobsApi).toBe(false);
  });

  it("套用範圍面板選「套用至所有紀錄」→ PATCH 帶 applyToPast:true", async () => {
    setFetch((url) =>
      url.includes("/api/sessions")
        ? { ok: true, json: async () => [{ id: "s1" }] }
        : { ok: true, json: async () => makeJob() }
    );
    const onSaved = vi.fn();
    renderForm(makeJob(), onSaved);
    fireEvent.change(screen.getByDisplayValue("20"), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "儲存" }));
    fireEvent.click(await screen.findByRole("button", { name: /套用至所有紀錄/ }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const patchCall = vi
      .mocked(global.fetch)
      .mock.calls.find((c) => String(c[0]).includes("/api/jobs/"));
    expect(patchCall).toBeDefined();
    const body = JSON.parse(String(patchCall![1]!.body));
    expect(body.applyToPast).toBe(true);
    expect(body.hourlyRate).toBe(25);
  });

  it("套用範圍面板選「僅之後的紀錄」→ PATCH 帶 applyToPast:false", async () => {
    setFetch((url) =>
      url.includes("/api/sessions")
        ? { ok: true, json: async () => [{ id: "s1" }] }
        : { ok: true, json: async () => makeJob() }
    );
    const onSaved = vi.fn();
    renderForm(makeJob(), onSaved);
    fireEvent.change(screen.getByDisplayValue("20"), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "儲存" }));
    fireEvent.click(await screen.findByRole("button", { name: /僅之後的紀錄/ }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const patchCall = vi
      .mocked(global.fetch)
      .mock.calls.find((c) => String(c[0]).includes("/api/jobs/"));
    const body = JSON.parse(String(patchCall![1]!.body));
    expect(body.applyToPast).toBe(false);
  });

  it("改時薪但該工作沒有紀錄時，直接儲存不跳面板", async () => {
    setFetch((url) =>
      url.includes("/api/sessions")
        ? { ok: true, json: async () => [] }
        : { ok: true, json: async () => makeJob() }
    );
    const onSaved = vi.fn();
    renderForm(makeJob(), onSaved);
    fireEvent.change(screen.getByDisplayValue("20"), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "儲存" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(screen.queryByText("薪資設定已變動")).not.toBeInTheDocument();
  });
});
