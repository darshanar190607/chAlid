import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const firebaseUid = req.nextUrl.searchParams.get("firebaseUid");
  if (!firebaseUid) return NextResponse.json({ error: "Missing firebaseUid" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { firebaseUid } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { firebaseUid, abhaId } = body;
    if (!firebaseUid) return NextResponse.json({ error: "Missing firebaseUid" }, { status: 400 });

    const user = await prisma.user.update({
      where: { firebaseUid },
      data: { abhaId: abhaId ?? null },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Profile PATCH error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
