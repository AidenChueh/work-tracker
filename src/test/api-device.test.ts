import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockReset, type DeepMockProxy } from "vitest-mock-extended";
import { type PrismaClient, type Device } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/device/route";

vi.mock("@/lib/prisma", async () => {
  const { mockDeep } = await import("vitest-mock-extended");
  return { prisma: mockDeep<PrismaClient>() };
});

const db = prisma as unknown as DeepMockProxy<PrismaClient>;
const r = <T>(v: T): never => v as never;

beforeEach(() => mockReset(db));

function fakeDevice(): Device {
  return { id: "d1", createdAt: new Date() };
}

describe("GET /api/device", () => {
  it("400 when no deviceId param", async () => {
    const req = new NextRequest("http://test/api/device");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("404 when deviceId not found", async () => {
    db.device.findUnique.mockResolvedValue(r(null));
    const req = new NextRequest("http://test/api/device?deviceId=unknown");
    const res = await GET(req);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ exists: false });
  });

  it("200 when deviceId found", async () => {
    db.device.findUnique.mockResolvedValue(r(fakeDevice()));
    const req = new NextRequest("http://test/api/device?deviceId=d1");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ exists: true });
  });
});
