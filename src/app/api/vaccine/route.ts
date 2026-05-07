import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/firebase-admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

async function verifyAuth(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.split("Bearer ")[1]);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const firebaseUid = searchParams.get("firebaseUid");
    if (!firebaseUid) return NextResponse.json({ error: "Missing firebaseUid" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { firebaseUid },
      include: {
        babies: {
          include: {
            vaccines: { orderBy: { scheduledDate: "asc" }, include: { hospital: true } }
          }
        }
      }
    });

    const baby = user?.babies[0];
    if (!baby) return NextResponse.json({ error: "Baby not found" }, { status: 404 });

    return NextResponse.json({ baby, records: baby.vaccines });
  } catch {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const uid = await verifyAuth(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, status, givenDate, hospitalId, hospitalName, hospitalLocation } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing record ID" }, { status: 400 });

    // Verify ownership: record must belong to a baby owned by this user
    const existing = await prisma.vaccineRecord.findFirst({
      where: { id, baby: { user: { firebaseUid: uid } } }
    });
    if (!existing) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const record = await prisma.vaccineRecord.update({
      where: { id },
      data: {
        status: status || "done",
        givenDate: givenDate ? new Date(givenDate) : new Date(),
        hospitalId: hospitalId || undefined,
        hospitalName: hospitalName || undefined,
        hospitalLocation: hospitalLocation || undefined
      }
    });

    return NextResponse.json({ success: true, record });
  } catch {
    return NextResponse.json({ error: "Failed to update record" }, { status: 500 });
  }
}
