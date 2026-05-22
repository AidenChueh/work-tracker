import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockReset, type DeepMockProxy } from "vitest-mock-extended";
import { Prisma, type PrismaClient, type Job, type OvertimeTier } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { PATCH } from "@/app/api/jobs/[id]/route";

vi.mock("@/lib/prisma", async () => {
  const { mockDeep } = await import("vitest-mock-extended");
  return { prisma: mockDeep<PrismaClient>() };
});

const db = prisma as unknown as DeepMockProxy<PrismaClient>;
// vitest-mock-extended 與 Prisma 重載型別繁雜，mock 回傳值統一用此 helper 轉型
const r = <T>(v: T): never => v as never;

beforeEach(() => mockReset(db));

function fakeJob(
  overrides: Partial<Job & { overtimeTiers: OvertimeTier[] }> = {}
): Job & { overtimeTiers: OvertimeTier[] } {
  return {
    id: "j1",
    deviceId: "d1",
    name: "Job",
    hourlyRate: 20,
    commissionPercentage: null,
    commissionRequired: false,
    payFrequency: "weekly",
    payDay: 1,
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
    payWeekStart: null,
    scheduleType: "flexible",
    fixedClockIn: null,
    fixedClockOut: null,
    isActive: true,
    createdAt: new Date(),
    overtimeTiers: [],
    ...overrides,
  };
}

function makeReq(deviceId: string | null, body: unknown): NextRequest {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (deviceId) headers["x-device-id"] = deviceId;
  return new NextRequest("http://test/api/jobs/j1", {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe("PATCH /api/jobs/[id] — 基本驗證", () => {
  it("缺 x-device-id 回傳 400", async () => {
    const res = await PATCH(makeReq(null, { name: "X" }), ctx("j1"));
    expect(res.status).toBe(400);
  });

  it("找不到工作回傳 404", async () => {
    db.job.findFirst.mockResolvedValue(r(null));
    const res = await PATCH(makeReq("d1", { name: "X" }), ctx("j1"));
    expect(res.status).toBe(404);
  });

  it("白名單擋下 mass assignment：deviceId / id / applyToPast 不寫入 job", async () => {
    db.job.findFirst.mockResolvedValue(r(fakeJob()));
    db.job.update.mockResolvedValue(r(fakeJob()));
    db.workSession.updateMany.mockResolvedValue(r({ count: 0 }));
    await PATCH(
      makeReq("d1", { name: "New", hourlyRate: 25, deviceId: "evil", id: "evil", applyToPast: true }),
      ctx("j1")
    );
    const data = db.job.update.mock.calls[0][0].data as Record<string, unknown>;
    expect(data).not.toHaveProperty("deviceId");
    expect(data).not.toHaveProperty("id");
    expect(data).not.toHaveProperty("applyToPast");
    expect(data.name).toBe("New");
    expect(data.hourlyRate).toBe(25);
  });
});

describe("PATCH /api/jobs/[id] — applyToPast 套用範圍", () => {
  it("applyToPast=true：清除該工作所有紀錄的快照", async () => {
    db.job.findFirst.mockResolvedValue(r(fakeJob()));
    db.job.update.mockResolvedValue(r(fakeJob({ hourlyRate: 30 })));
    db.workSession.updateMany.mockResolvedValue(r({ count: 3 }));
    const res = await PATCH(makeReq("d1", { hourlyRate: 30, applyToPast: true }), ctx("j1"));
    expect(res.status).toBe(200);
    expect(db.workSession.updateMany).toHaveBeenCalledWith({
      where: { jobId: "j1" },
      data: { payRulesSnapshot: Prisma.DbNull },
    });
    expect(db.workSession.findMany).not.toHaveBeenCalled();
  });

  it("applyToPast=false：只把舊規則凍結到尚未凍結的紀錄", async () => {
    db.job.findFirst.mockResolvedValue(r(fakeJob({ hourlyRate: 20 })));
    db.job.update.mockResolvedValue(r(fakeJob({ hourlyRate: 30 })));
    db.workSession.findMany.mockResolvedValue(
      r([
        { id: "s1", payRulesSnapshot: null },
        { id: "s2", payRulesSnapshot: { hourlyRate: 99 } },
        { id: "s3", payRulesSnapshot: null },
      ])
    );
    db.workSession.updateMany.mockResolvedValue(r({ count: 2 }));
    const res = await PATCH(makeReq("d1", { hourlyRate: 30, applyToPast: false }), ctx("j1"));
    expect(res.status).toBe(200);
    expect(db.workSession.updateMany).toHaveBeenCalledTimes(1);
    const call = db.workSession.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({ id: { in: ["s1", "s3"] } });
    expect(call.data as Record<string, unknown>).toMatchObject({
      payRulesSnapshot: { hourlyRate: 20 },
    });
  });

  it("applyToPast=false 但所有紀錄都已凍結：不呼叫 updateMany", async () => {
    db.job.findFirst.mockResolvedValue(r(fakeJob()));
    db.job.update.mockResolvedValue(r(fakeJob()));
    db.workSession.findMany.mockResolvedValue(r([{ id: "s1", payRulesSnapshot: { hourlyRate: 1 } }]));
    await PATCH(makeReq("d1", { hourlyRate: 30, applyToPast: false }), ctx("j1"));
    expect(db.workSession.updateMany).not.toHaveBeenCalled();
  });

  it("未帶 applyToPast：不更動任何打卡紀錄", async () => {
    db.job.findFirst.mockResolvedValue(r(fakeJob()));
    db.job.update.mockResolvedValue(r(fakeJob({ hourlyRate: 30 })));
    await PATCH(makeReq("d1", { hourlyRate: 30 }), ctx("j1"));
    expect(db.workSession.updateMany).not.toHaveBeenCalled();
    expect(db.workSession.findMany).not.toHaveBeenCalled();
  });
});
