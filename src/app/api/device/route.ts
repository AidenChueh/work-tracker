import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { deviceId } = await req.json();

  if (!deviceId || typeof deviceId !== "string") {
    return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  }

  const device = await prisma.device.upsert({
    where: { id: deviceId },
    update: {},
    create: { id: deviceId },
  });

  return NextResponse.json(device);
}
