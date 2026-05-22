import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockReset, type DeepMockProxy } from "vitest-mock-extended";
import { type PrismaClient, type WorkSession } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { PATCH } from "@/app/api/sessions/[id]/route";
import { GET, POST } from "@/app/api/sessions/route";

vi.mock("@/lib/prisma", async () => {
  const { mockDeep } = await import("vitest-mock-extended");
  return { prisma: mockDeep<PrismaClient>() };
});

const db = prisma as unknown as DeepMockProxy<PrismaClient>;
const r = <T>(v: T): never => v as never;

beforeEach(() => mockReset(db));

function fakeSession(overrides: Partial<WorkSession> = {}): WorkSession {
  return {
    id: "s1",
    deviceId: "d1",
    jobId: "j1",
    clockIn: new Date("2026-05-20T09:00:00.000Z"),
    clockOut: new Date("2026-05-20T17:00:00.000Z"),
    notes: null,
    isPublicHoliday: false,
    dailyRevenue: null,
    breakMinutes: null,
    payRulesSnapshot: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function patchReq(deviceId: string | null, body: unknown): NextRequest {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (deviceId) headers["x-device-id"] = deviceId;
  return new NextRequest("http://test/api/sessions/s1", {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
}

function getReq(deviceId: string | null, query = ""): NextRequest {
  const headers: Record<string, string> = {};
  if (deviceId) headers["x-device-id"] = deviceId;
  return new NextRequest(`http://test/api/sessions${query}`, { headers });
}

function postReq(deviceId: string | null, body: unknown): NextRequest {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (deviceId) headers["x-device-id"] = deviceId;
  return new NextRequest("http://test/api/sessions", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe("PATCH /api/sessions/[id]", () => {
  it("缺 x-device-id 回傳 400", async () => {
    const res = await PATCH(patchReq(null, { breakMinutes: 30 }), ctx("s1"));
    expect(res.status).toBe(400);
  });

  it("找不到紀錄回傳 404", async () => {
    db.workSession.findFirst.mockResolvedValue(r(null));
    const res = await PATCH(patchReq("d1", { breakMinutes: 30 }), ctx("s1"));
    expect(res.status).toBe(404);
  });

  it("breakMinutes 寫入 update data", async () => {
    db.workSession.findFirst.mockResolvedValue(r(fakeSession()));
    db.workSession.update.mockResolvedValue(r(fakeSession({ breakMinutes: 45 })));
    const res = await PATCH(patchReq("d1", { breakMinutes: 45 }), ctx("s1"));
    expect(res.status).toBe(200);
    const data = db.workSession.update.mock.calls[0][0].data as Record<string, unknown>;
    expect(data.breakMinutes).toBe(45);
  });

  it("breakMinutes 設為 null（回復用工作預設）", async () => {
    db.workSession.findFirst.mockResolvedValue(r(fakeSession({ breakMinutes: 60 })));
    db.workSession.update.mockResolvedValue(r(fakeSession()));
    await PATCH(patchReq("d1", { breakMinutes: null }), ctx("s1"));
    const data = db.workSession.update.mock.calls[0][0].data as Record<string, unknown>;
    expect(data.breakMinutes).toBeNull();
  });

  it("breakMinutes 為負數回傳 400，且不呼叫 update", async () => {
    db.workSession.findFirst.mockResolvedValue(r(fakeSession()));
    const res = await PATCH(patchReq("d1", { breakMinutes: -5 }), ctx("s1"));
    expect(res.status).toBe(400);
    expect(db.workSession.update).not.toHaveBeenCalled();
  });

  it("clockOut 早於 clockIn 回傳 400", async () => {
    db.workSession.findFirst.mockResolvedValue(r(fakeSession()));
    const res = await PATCH(
      patchReq("d1", {
        clockIn: "2026-05-20T10:00:00.000Z",
        clockOut: "2026-05-20T09:00:00.000Z",
      }),
      ctx("s1")
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/sessions", () => {
  it("缺 x-device-id 回傳 400", async () => {
    const res = await GET(getReq(null));
    expect(res.status).toBe(400);
  });

  it("limit 非數字時 take 預設為 100", async () => {
    db.workSession.findMany.mockResolvedValue(r([]));
    await GET(getReq("d1", "?limit=abc"));
    const args = db.workSession.findMany.mock.calls[0][0] as Record<string, unknown>;
    expect(args.take).toBe(100);
  });

  it("limit 有效時帶入該值", async () => {
    db.workSession.findMany.mockResolvedValue(r([]));
    await GET(getReq("d1", "?limit=5"));
    const args = db.workSession.findMany.mock.calls[0][0] as Record<string, unknown>;
    expect(args.take).toBe(5);
  });
});

describe("POST /api/sessions", () => {
  it("缺 x-device-id 回傳 400", async () => {
    const res = await POST(postReq(null, { jobId: "j1" }));
    expect(res.status).toBe(400);
  });

  it("缺 jobId 回傳 400", async () => {
    const res = await POST(postReq("d1", {}));
    expect(res.status).toBe(400);
  });

  it("clockOut 早於 clockIn 回傳 400", async () => {
    const res = await POST(
      postReq("d1", {
        jobId: "j1",
        clockIn: "2026-05-20T17:00:00.000Z",
        clockOut: "2026-05-20T09:00:00.000Z",
      })
    );
    expect(res.status).toBe(400);
  });
});
