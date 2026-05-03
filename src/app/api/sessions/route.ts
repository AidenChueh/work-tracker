import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const deviceId = req.headers.get("x-device-id");
  if (!deviceId) {
    return NextResponse.json({ error: "x-device-id required" }, { status: 400 });
  }

  const jobId = req.nextUrl.searchParams.get("jobId");
  const since = req.nextUrl.searchParams.get("since");
  const to = req.nextUrl.searchParams.get("to");

  const where: { deviceId: string; jobId?: string; clockIn?: { gte?: Date; lte?: Date } } = { deviceId };
  if (jobId) where.jobId = jobId;
  if (since || to) {
    where.clockIn = {};
    if (since) where.clockIn.gte = new Date(since);
    if (to) where.clockIn.lte = new Date(to);
  }

  const limitParam = req.nextUrl.searchParams.get("limit");
  const take = limitParam ? parseInt(limitParam) : 100;

  const sessions = await prisma.workSession.findMany({
    where,
    include: { job: { include: { overtimeTiers: { orderBy: { afterHours: "asc" } } } }, breaks: true },
    orderBy: { clockIn: "desc" },
    take,
  });

  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const deviceId = req.headers.get("x-device-id");
  if (!deviceId) {
    return NextResponse.json({ error: "x-device-id required" }, { status: 400 });
  }

  const { jobId, clockIn, clockOut } = await req.json();
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  // Only block concurrent active session if this is a real clock-in (no clockIn provided)
  if (!clockIn) {
    const activeSession = await prisma.workSession.findFirst({
      where: { deviceId, clockOut: null },
    });
    if (activeSession) {
      return NextResponse.json({ error: "already clocked in" }, { status: 409 });
    }
  }

  await prisma.device.upsert({
    where: { id: deviceId },
    update: {},
    create: { id: deviceId },
  });

  const session = await prisma.workSession.create({
    data: {
      deviceId, jobId,
      clockIn: clockIn ? new Date(clockIn) : new Date(),
      clockOut: clockOut ? new Date(clockOut) : undefined,
    },
    include: { job: { include: { overtimeTiers: { orderBy: { afterHours: "asc" } } } }, breaks: true },
  });

  return NextResponse.json(session, { status: 201 });
}
