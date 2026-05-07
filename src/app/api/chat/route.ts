import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";
import { queryBabyAI, transcribeAudio, queryTNSchemes } from "@/lib/gemini";
import { adminAuth } from "@/lib/firebase-admin";

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
    const cursor = searchParams.get("cursor"); // for pagination
    if (!firebaseUid) return NextResponse.json({ error: "Missing firebaseUid" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { firebaseUid },
      include: {
        babies: {
          include: {
            chats: {
              orderBy: { createdAt: 'asc' },
              take: 50,
              ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
            }
          }
        }
      }
    });

    const chats = user?.babies[0]?.chats || [];
    const nextCursor = chats.length === 50 ? chats[chats.length - 1].id : null;
    return NextResponse.json({ messages: chats, nextCursor });
  } catch {
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "chat") {
      const { message, language, babyAgeMonths, history, firebaseUid, base64Image } = body;

      if (!message || !language || babyAgeMonths == null || !firebaseUid) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      // Rate limit: 60 messages per user per hour
      const rateLimitKey = `chat:ratelimit:${firebaseUid}`;
      try {
        const count = await redis.incr(rateLimitKey);
        if (count === 1) await redis.expire(rateLimitKey, 3600);
        if (count > 60) return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
      } catch { /* Redis unavailable — allow */ }

      // Per-user cache key (not global) — only for non-image, non-personalized queries
      const isPersonalized = /my baby|weight|height|name/i.test(message);
      const cacheKey = `chat:${firebaseUid}:${language}:${message.toLowerCase().trim()}`;
      if (!base64Image && !isPersonalized) {
        try {
          const cached = await redis.get(cacheKey);
          if (cached) return NextResponse.json({ cleanResponse: cached as string, severity: "low", cached: true });
        } catch { /* ignore */ }
      }

      const user = await prisma.user.findUnique({ where: { firebaseUid }, include: { babies: true } });
      const babyId = user?.babies[0]?.id;
      if (!babyId) return NextResponse.json({ error: "No baby found" }, { status: 404 });

      await prisma.chatMessage.create({ data: { babyId, role: "user", content: message, language } });

      const response = await queryBabyAI({ message, language, babyAgeMonths, history, base64Image });

      const severityMatch = response.match(/\[(LOW|MEDIUM|HIGH)\]/i) || response.match(/SEVERITY:\s*(LOW|MEDIUM|HIGH)/i);
      const severity = severityMatch ? severityMatch[1].toLowerCase() : "low";
      const cleanResponse = response.replace(/\[(LOW|MEDIUM|HIGH)\]/i, "").replace(/SEVERITY:\s*(LOW|MEDIUM|HIGH)/i, "").trim();

      await prisma.chatMessage.create({ data: { babyId, role: "ai", content: cleanResponse, severity, language } });

      if (!base64Image && !isPersonalized) {
        try { await redis.setex(cacheKey, 86400, cleanResponse); } catch { /* ignore */ }
      }

      return NextResponse.json({ cleanResponse, severity });
    }

    if (action === "tn-schemes") {
      const { message, language, babyAgeMonths, history, firebaseUid, userContext } = body;
      if (!message || !firebaseUid) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

      const user = await prisma.user.findUnique({ where: { firebaseUid }, include: { babies: true } });
      const babyId = user?.babies[0]?.id;

      const response = await queryTNSchemes({ message, language: language || 'en', babyAgeMonths: babyAgeMonths ?? 0, history, userContext });

      if (babyId) {
        await prisma.chatMessage.createMany({
          data: [
            { babyId, role: "user", content: message, language: language || 'en', isTNSchemes: true },
            { babyId, role: "ai", content: response, language: language || 'en', isTNSchemes: true }
          ]
        });
      }

      return NextResponse.json({ response });
    }

    if (action === "transcribe") {
      const { base64Audio, mimeType } = body;
      if (!base64Audio || !mimeType) return NextResponse.json({ error: "Missing audio data" }, { status: 400 });
      const transcription = await transcribeAudio(base64Audio, mimeType);
      return NextResponse.json({ transcription });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
