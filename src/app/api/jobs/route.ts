import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const deviceId = req.headers.get("x-device-id");
  if (!deviceId) {
    return NextResponse.json({ error: "x-device-id required" }, { status: 400 });
  }

  const jobs = await prisma.job.findMany({
    where: { deviceId, isActive: true },
    include: { overtimeTiers: { orderBy: { afterHours: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const deviceId = req.headers.get("x-device-id");
  if (!deviceId) {
    return NextResponse.json({ error: "x-device-id required" }, { status: 400 });
  }

  const body = await req.json();
  const {
    name, hourlyRate, commissionPercentage, commissionRequired,
    payFrequency, payDay, payWeekStart, taxEnabled, breakDuration, breakRate, overtimeTiers,
    penaltyRatesEnabled, penaltyBaseRate, publicHolidayRate, saturdayRate, sundayRate,
    saturdayHourlyRate, sundayHourlyRate, publicHolidayHourlyRate,
  } = body;

  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  await prisma.device.upsert({
    where: { id: deviceId },
    update: {},
    create: { id: deviceId },
  });

  const job = await prisma.job.create({
    data: {
      deviceId,
      name,
      hourlyRate: hourlyRate ?? null,
      commissionPercentage: commissionPercentage ?? null,
      commissionRequired: commissionRequired ?? false,
      payFrequency: payFrequency ?? "weekly",
      payDay: payDay ?? null,
      payWeekStart: payWeekStart ?? null,
      taxEnabled: taxEnabled ?? false,
      breakDuration: breakDuration ?? null,
      breakRate: breakRate ?? null,
      penaltyRatesEnabled: penaltyRatesEnabled ?? false,
      penaltyBaseRate: penaltyBaseRate ?? null,
      publicHolidayRate: publicHolidayRate ?? 2.5,
      saturdayRate: saturdayRate ?? 1.5,
      sundayRate: sundayRate ?? 2.0,
      saturdayHourlyRate: saturdayHourlyRate ?? null,
      sundayHourlyRate: sundayHourlyRate ?? null,
      publicHolidayHourlyRate: publicHolidayHourlyRate ?? null,
      overtimeTiers: Array.isArray(overtimeTiers) && overtimeTiers.length > 0
        ? { create: overtimeTiers.map((t: { afterHours: number; rate: number }, i: number) => ({ afterHours: t.afterHours, rate: t.rate, order: i })) }
        : undefined,
    },
    include: { overtimeTiers: { orderBy: { afterHours: "asc" } } },
  });

  return NextResponse.json(job, { status: 201 });
}
