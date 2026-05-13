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
  const job = await prisma.job.findFirst({ where: { id, deviceId } });
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json();
  const { overtimeTiers } = body;

  const ALLOWED = new Set([
    "name", "hourlyRate", "commissionPercentage", "commissionRequired",
    "payFrequency", "payDay", "payWeekStart", "taxEnabled", "breakDuration", "breakRate",
    "penaltyRatesEnabled", "publicHolidayRate", "saturdayRate", "sundayRate",
    "saturdayHourlyRate", "sundayHourlyRate", "publicHolidayHourlyRate",
    "scheduleType", "fixedClockIn", "fixedClockOut", "isActive",
  ]);
  const safeFields = Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED.has(k)));

  const updated = await prisma.job.update({
    where: { id },
    data: {
      ...safeFields,
      ...(overtimeTiers !== undefined && {
        overtimeTiers: {
          deleteMany: {},
          create: (overtimeTiers as { afterHours: number; rate: number }[]).map((t, i) => ({
            afterHours: t.afterHours,
            rate: t.rate,
            order: i,
          })),
        },
      }),
    },
    include: { overtimeTiers: { orderBy: { afterHours: "asc" } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const deviceId = req.headers.get("x-device-id");
  if (!deviceId) {
    return NextResponse.json({ error: "x-device-id required" }, { status: 400 });
  }

  const { id } = await params;
  const job = await prisma.job.findFirst({ where: { id, deviceId } });
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.job.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
