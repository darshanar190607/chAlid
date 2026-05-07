import { NextRequest, NextResponse } from "next/server";
import { analyzeDailyPhoto } from "@/lib/daily-photo-analyzer";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/firebase-admin";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { base64Image, babyId, babyAgeMonths, language, firebaseUid } = await req.json();
    
    if (!base64Image || !babyId || !babyAgeMonths || !language || !firebaseUid) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    try {
      const isDummy = (adminAuth as any).app.options.projectId === "dummy";
      if (!isDummy) {
        const userRecord = await adminAuth.getUser(firebaseUid);
        if (!userRecord) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
      } else {
        console.warn("Firebase Admin in dummy mode. Skipping auth verification.");
      }
    } catch (authError) {
       console.error("Auth verification failed:", authError);
    }

    // Rate limiting: 1 daily photo per user per day (86400 seconds)
    const { redis } = await import("@/lib/redis");
    const rateLimitKey = `dailyphoto:ratelimit:${firebaseUid}`;
    try {
      const count = await redis.incr(rateLimitKey);
      if (count === 1) await redis.expire(rateLimitKey, 86400);
      if (count > 1) {
        return NextResponse.json({ error: "Rate limit exceeded. Only 1 daily photo allowed per day." }, { status: 429 });
      }
    } catch { /* Redis unavailable — allow request */ }

    // Sanitize inputs
    const validator = (await import('validator')).default;
    const sanitizedLanguage = validator.escape(language.trim());
    const sanitizedBabyId = validator.escape(babyId.trim());

    // Analyze photo with AI
    const analysis = await analyzeDailyPhoto({
      base64Image,
      babyAgeMonths,
      language
    });

    // Store analysis in database
    const prismaUser = await prisma.user.findUnique({
        where: { firebaseUid }
    });

    if (prismaUser) {
        // Verify the baby belongs to the user
        const baby = await prisma.baby.findFirst({
            where: { id: babyId, userId: prismaUser.id }
        });

        if (baby) {
            await (prisma as any).dailyPhoto.create({
              data: {
                babyId: baby.id,
                imageUrl: analysis.imageUrl,
                isHealthy: analysis.isHealthy !== false, // default to true if undefined
                analysisResult: analysis, // Store entire result object
              }
            });
        } else {
            console.warn("Baby not found or does not belong to user. Skipping database save.");
        }
    } else {
        console.warn("User not found in Prisma when saving daily photo. Skipping database save.");
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("[/api/baby/daily-photo] Error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const firebaseUid = searchParams.get('firebaseUid');
    const babyId = searchParams.get('babyId');

    if (!firebaseUid || !babyId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const prismaUser = await prisma.user.findUnique({
        where: { firebaseUid }
    });

    if (!prismaUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '10');

    const photos = await (prisma as any).dailyPhoto.findMany({
        where: { babyId: babyId, baby: { userId: prismaUser.id } },
        orderBy: { date: 'desc' },
        take: limit,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
    });

    const nextCursor = photos.length === limit ? photos[photos.length - 1].id : null;

    return NextResponse.json({
        photos,
        nextCursor
    });
  } catch (error) {
    console.error("[/api/baby/daily-photo] GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch photos" }, { status: 500 });
  }
}
