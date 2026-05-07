import { NextRequest, NextResponse } from "next/server";
import { analyzeSymptomImage } from "@/lib/symptom-analyzer";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/firebase-admin";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { base64Image, symptomCategory, babyAgeMonths, language, firebaseUid } = await req.json();
    
    if (!base64Image || !symptomCategory || !babyAgeMonths || !language || !firebaseUid) {
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

    // Analyze symptom with specialized AI
    const analysis = await analyzeSymptomImage({
      base64Image,
      symptomCategory,
      babyAgeMonths,
      language
    });

    // Store analysis in database
    // Need to ensure the user exists in Prisma first or use firebaseUid as relational key
    const prismaUser = await prisma.user.findUnique({
        where: { firebaseUid }
    });

    if (prismaUser) {
        await (prisma as any).symptomAnalysis.create({
          data: {
            userId: prismaUser.id,
            category: symptomCategory,
            result: analysis, // Entire analysis object
            confidence: analysis.confidence || 70.0,
            severity: analysis.severity || "MEDIUM",
            recommendations: analysis.recommendations || "Consult a doctor",
            imageUrl: analysis.imageUrl,
            babyAgeMonths
          }
        });
    } else {
        console.warn("User not found in Prisma when saving symptom analysis. Skipping database save.");
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("[/api/symptom-analyzer] Error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
