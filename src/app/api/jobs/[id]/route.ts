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

  const { overtimeTiers, ...rest } = await req.json();

  const updated = await prisma.job.update({
    where: { id },
    data: {
      ...rest,
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
