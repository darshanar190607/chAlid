import { generateVisionAnalysis } from "@/lib/ai";
import { z } from "zod";

const analysisSchema = z.object({
  condition: z.string(),
  isNormal: z.boolean(),
  severity: z.enum(["normal", "monitor", "doctor", "emergency"]),
  confidence: z.enum(["high", "medium", "low"]),
  whatYouSee: z.string(),
  explanation: z.string(),
  isCommonThisSeason: z.boolean(),
  seasonNote: z.string().optional(),
  preventionTips: z.array(z.string()),
  whenToWorry: z.array(z.string()),
  immediateAction: z.string(),
  needsDoctor: z.boolean(),
  urgencyHours: z.number().nullable(),
  searchQuery: z.string(),
});

type AnalysisResult = z.infer<typeof analysisSchema> & { aiModel?: string };

function getSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return "summer";
  if (month >= 5 && month <= 8) return "monsoon";
  if (month >= 9 && month <= 10) return "post-monsoon";
  return "winter";
}

const CLIMATES: Record<string, string> = {
  "Tamil Nadu": "hot humid tropical", "Kerala": "heavy monsoon", "Karnataka": "moderate tropical",
  "Andhra Pradesh": "hot humid", "Telangana": "hot semi-arid", "Maharashtra": "moderate coastal",
  "Goa": "coastal tropical", "Gujarat": "dry tropical", "Rajasthan": "arid desert",
  "Punjab": "semi-arid continental", "Haryana": "semi-arid", "Delhi": "extreme continental",
  "Uttar Pradesh": "subtropical continental", "Bihar": "humid subtropical", "West Bengal": "humid subtropical",
  "Odisha": "tropical coastal", "Assam": "humid subtropical", "Puducherry": "coastal tropical"
};

function getAgeStage(ageMonths: number): string {
  if (ageMonths < 1) return "newborn";
  if (ageMonths < 3) return "early infant";
  if (ageMonths < 6) return "young infant";
  if (ageMonths < 12) return "older infant";
  return "toddler";
}

function buildPrompt(ageMonths: number, state: string, season: string, description?: string): string {
  return `You are a pediatric AI assistant for Indian baby healthcare. Analyze the symptom image.
CONTEXT: Age=${ageMonths}mo (${getAgeStage(ageMonths)}), State=${state}, Climate=${CLIMATES[state] || "moderate"}, Season=${season}, Description=${description || "None"}
RULES: Follow IAP+WHO guidelines. NEVER prescribe medications. Recommend doctor for high severity.`;
}

export async function POST(req: NextRequest) {
  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = authHeader.split("Bearer ")[1];
    let firebaseUid: string;
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      firebaseUid = decoded.uid;
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 10 analyses per user per hour
    const rateLimitKey = `symptom:ratelimit:${firebaseUid}`;
    try {
      const count = await redis.incr(rateLimitKey);
      if (count === 1) await redis.expire(rateLimitKey, 3600);
      if (count > 10) return NextResponse.json({ error: "Rate limit exceeded. Try again in an hour." }, { status: 429 });
    } catch { /* Redis unavailable — allow request */ }

    const formData = await req.formData();
    const image = formData.get('image') as File;
    const babyId = formData.get('babyId') as string;
    let state = formData.get('state') as string;
    let description = formData.get('description') as string;

    // Sanitize inputs
    const validator = (await import('validator')).default;
    if (state) state = validator.escape(state.trim());
    if (description) description = validator.escape(description.trim());

    if (!image || !babyId || !state) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    const baby = await prisma.baby.findFirst({ where: { id: babyId, user: { firebaseUid } } });
    if (!baby) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const ageInMonths = Math.floor((Date.now() - new Date(baby.dob).getTime()) / (1000 * 60 * 60 * 24 * 30));
    const base64Image = Buffer.from(await image.arrayBuffer()).toString('base64');
    const prompt = buildPrompt(ageInMonths, state, getSeason(), description);

    const analysis: AnalysisResult = await generateVisionAnalysis({
      prompt,
      imageBuffer: base64Image,
      schema: analysisSchema,
    });

    await prisma.symptomAnalysis.create({
      data: {
        userId: baby.userId,
        category: "general",
        result: analysis as object,
        confidence: analysis.confidence === "high" ? 90 : analysis.confidence === "medium" ? 70 : 50,
        severity: analysis.severity.toUpperCase(),
        recommendations: analysis.immediateAction,
        babyAgeMonths: ageInMonths
      }
    });

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Symptom analysis failed:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const firebaseUid = searchParams.get("firebaseUid");
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!firebaseUid) {
      return NextResponse.json({ error: "Missing firebaseUid" }, { status: 400 });
    }

    const analyses = await prisma.symptomAnalysis.findMany({
      where: { user: { firebaseUid } },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
    });

    const nextCursor = analyses.length === limit ? analyses[analyses.length - 1].id : null;

    return NextResponse.json({
      analyses,
      nextCursor
    });
  } catch (error) {
    console.error("Failed to fetch symptom history:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}


