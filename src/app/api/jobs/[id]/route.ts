import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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
  const job = await prisma.job.findFirst({
    where: { id, deviceId },
    include: { overtimeTiers: true },
  });
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json();
  const { overtimeTiers, applyToPast } = body;

  // 變更前的薪資規則快照，用於「僅之後的紀錄」時凍結舊紀錄
  const oldRules = {
    hourlyRate: job.hourlyRate,
    commissionPercentage: job.commissionPercentage,
    taxEnabled: job.taxEnabled,
    breakDuration: job.breakDuration,
    breakRate: job.breakRate,
    penaltyRatesEnabled: job.penaltyRatesEnabled,
    publicHolidayRate: job.publicHolidayRate,
    saturdayRate: job.saturdayRate,
    sundayRate: job.sundayRate,
    saturdayHourlyRate: job.saturdayHourlyRate,
    sundayHourlyRate: job.sundayHourlyRate,
    publicHolidayHourlyRate: job.publicHolidayHourlyRate,
    overtimeTiers: job.overtimeTiers.map((t) => ({ afterHours: t.afterHours, rate: t.rate })),
  };

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

  if (applyToPast === true) {
    // 套用至所有紀錄：清除快照，全部改用新規則即時計算
    await prisma.workSession.updateMany({
      where: { jobId: id },
      data: { payRulesSnapshot: Prisma.DbNull },
    });
  } else if (applyToPast === false) {
    // 僅之後的紀錄：把舊規則凍結到尚未凍結的紀錄上
    const sessions = await prisma.workSession.findMany({
      where: { jobId: id },
      select: { id: true, payRulesSnapshot: true },
    });
    const unfrozen = sessions.filter((s) => s.payRulesSnapshot == null).map((s) => s.id);
    if (unfrozen.length > 0) {
      await prisma.workSession.updateMany({
        where: { id: { in: unfrozen } },
        data: { payRulesSnapshot: oldRules },
      });
    }
  }

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
