import { NextRequest, NextResponse } from "next/server";
import { generateSpeech } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voiceName } = body;

    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const base64Audio = await generateSpeech(text, voiceName);
    return NextResponse.json({ base64Audio });
  } catch (error) {
    console.error("[/api/tts] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
