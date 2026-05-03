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
  if (body.clockOut === "now") body.clockOut = new Date();
  if (body.clockIn && typeof body.clockIn === "string") body.clockIn = new Date(body.clockIn);
  if (body.clockOut && typeof body.clockOut === "string") body.clockOut = new Date(body.clockOut);

  const updated = await prisma.workSession.update({
    where: { id },
    data: body,
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
