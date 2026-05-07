import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/firebase-admin";
import { generateVaccineSchedule } from "@/lib/vaccine-schedule";
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

    const body = await req.json();
    const { name, dob, gender, isPremature, weeksGestation, birthWeight, photoUrl, description } = body;

    if (!name || !dob) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    const user = await prisma.user.upsert({
      where: { firebaseUid: uid },
      update: {},
      create: { firebaseUid: uid, language: body.language || "hi" }
    });

    const baby = await prisma.baby.create({
      data: {
        name,
        dob: new Date(dob),
        gender: gender || null,
        isPremature: isPremature || false,
        weeksGestation: weeksGestation ? parseInt(weeksGestation.toString()) : 40,
        birthWeight: birthWeight ? parseFloat(birthWeight.toString()) : null,
        description: description || null,
        photoUrl: photoUrl || null,
        userId: user.id
      }
    });

    await generateVaccineSchedule(baby.id, new Date(dob));

    return NextResponse.json({ success: true, baby }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const babyId = searchParams.get("id");
    const firebaseUid = searchParams.get("firebaseUid");

    if (firebaseUid) {
      const user = await prisma.user.findUnique({
        where: { firebaseUid },
        include: { babies: true }
      });
      return NextResponse.json(user?.babies || []);
    }

    if (!babyId) return NextResponse.json({ error: "Missing baby id or firebaseUid" }, { status: 400 });

    const baby = await prisma.baby.findUnique({
      where: { id: babyId },
      include: {
        vaccines: { orderBy: { scheduledDate: "asc" } },
        chats: { orderBy: { createdAt: "desc" }, take: 20 },
        weightLogs: { orderBy: { loggedAt: "asc" }, take: 90 }
      }
    });

    if (!baby) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    return NextResponse.json(baby);
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
