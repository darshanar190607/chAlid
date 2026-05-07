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

export async function POST(req: NextRequest) {
  try {
    const uid = await verifyAuth(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { babyId, weightKg, heightCm, note } = await req.json();
    
    if (!babyId || !weightKg) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify ownership
    const baby = await prisma.baby.findFirst({
      where: { id: babyId, user: { firebaseUid: uid } }
    });
    
    if (!baby) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const weightLog = await prisma.weightLog.create({
      data: {
        babyId,
        weightKg: parseFloat(weightKg.toString()),
        heightCm: heightCm ? parseFloat(heightCm.toString()) : null,
        note: note || null
      }
    });

    return NextResponse.json({ success: true, weightLog }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to log weight" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const uid = await verifyAuth(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!babyId) {
      return NextResponse.json({ error: "Missing babyId" }, { status: 400 });
    }

    // Verify ownership
    const baby = await prisma.baby.findFirst({
      where: { id: babyId, user: { firebaseUid: uid } }
    });
    
    if (!baby) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const logs = await prisma.weightLog.findMany({
      where: { babyId },
      orderBy: { loggedAt: "desc" },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
    });

    const nextCursor = logs.length === limit ? logs[logs.length - 1].id : null;

    return NextResponse.json({
        logs,
        nextCursor
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch weight logs" }, { status: 500 });
  }
}
