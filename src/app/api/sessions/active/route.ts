import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const deviceId = req.headers.get("x-device-id");
  if (!deviceId) {
    return NextResponse.json({ error: "x-device-id required" }, { status: 400 });
  }

  const session = await prisma.workSession.findFirst({
    where: { deviceId, clockOut: null },
    include: { job: { include: { overtimeTiers: { orderBy: { afterHours: "asc" } } } }, breaks: true },
  });

  return NextResponse.json(session);
}
