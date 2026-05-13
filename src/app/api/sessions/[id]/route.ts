import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const deviceId = req.headers.get("x-device-id");
  if (!deviceId) {
    return NextResponse.json({ error: "x-device-id required" }, { status: 400 });
  }

  const { id } = await params;
  const session = await prisma.workSession.findFirst({ where: { id, deviceId } });
  if (!session) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json();

  let clockIn: Date | undefined;
  let clockOut: Date | undefined;
  if (body.clockIn) clockIn = new Date(body.clockIn);
  if (body.clockOut === "now") clockOut = new Date();
  else if (body.clockOut) clockOut = new Date(body.clockOut);

  const resolvedIn = clockIn ?? session.clockIn;
  const resolvedOut = clockOut ?? session.clockOut;
  if (resolvedOut && resolvedOut <= resolvedIn) {
    return NextResponse.json({ error: "clockOut must be after clockIn" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (clockIn !== undefined) data.clockIn = clockIn;
  if (clockOut !== undefined) data.clockOut = clockOut;
  if (body.isPublicHoliday !== undefined) data.isPublicHoliday = body.isPublicHoliday;
  if (body.dailyRevenue !== undefined) data.dailyRevenue = body.dailyRevenue;

  const updated = await prisma.workSession.update({
    where: { id },
    data,
    include: { job: { include: { overtimeTiers: { orderBy: { afterHours: "asc" } } } }, breaks: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const deviceId = req.headers.get("x-device-id");
  if (!deviceId) return NextResponse.json({ error: "x-device-id required" }, { status: 400 });

  const { id } = await params;
  const session = await prisma.workSession.findFirst({ where: { id, deviceId } });
  if (!session) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.workSession.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
