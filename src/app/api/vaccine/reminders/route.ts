import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { redis } from "@/lib/redis";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const token = authHeader.split("Bearer ")[1];
    let firebaseUid: string;
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      firebaseUid = decoded.uid;
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { enabled } = await req.json();

    // Simulate enqueuing/dequeuing a background reminder job
    const reminderKey = `vaccine:reminders:${firebaseUid}`;
    
    if (enabled) {
      await redis.set(reminderKey, "true");
      // Here you would push a job to BullMQ:
      // await queue.add('vaccine-reminder', { uid: firebaseUid }, { repeat: { cron: '0 9 * * *' } });
    } else {
      await redis.del(reminderKey);
      // await queue.removeRepeatableByKey(`vaccine-reminder-${firebaseUid}`);
    }

    return NextResponse.json({ success: true, remindersEnabled: enabled });
  } catch (error) {
    console.error("[/api/vaccine/reminders] Error:", error);
    return NextResponse.json({ error: "Failed to toggle reminders" }, { status: 500 });
  }
}
