import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const deviceId = req.headers.get("x-device-id");
  if (!deviceId) {
    return NextResponse.json({ error: "x-device-id required" }, { status: 400 });
  }

  try {
    const jobs = await prisma.job.findMany({
      where: { deviceId, isActive: true },
      include: { overtimeTiers: { orderBy: { afterHours: "asc" } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(jobs);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const deviceId = req.headers.get("x-device-id");
  if (!deviceId) {
    return NextResponse.json({ error: "x-device-id required" }, { status: 400 });
  }

  const body = await req.json();
  const { name, hourlyRate, commissionPercentage, payFrequency, payDay, taxEnabled, breakDuration, breakRate, overtimeTiers } = body;

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
      payFrequency: payFrequency ?? "weekly",
      payDay: payDay ?? null,
      taxEnabled: taxEnabled ?? false,
      breakDuration: breakDuration ?? null,
      breakRate: breakRate ?? null,
      overtimeTiers: Array.isArray(overtimeTiers) && overtimeTiers.length > 0
        ? { create: overtimeTiers.map((t: { afterHours: number; rate: number }, i: number) => ({ afterHours: t.afterHours, rate: t.rate, order: i })) }
        : undefined,
    },
    include: { overtimeTiers: { orderBy: { afterHours: "asc" } } },
  });

  return NextResponse.json(job, { status: 201 });
}
