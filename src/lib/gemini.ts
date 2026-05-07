import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import { toFile } from "groq-sdk";

// Initialize Gemini (Still used for Text-to-Speech)
const geminiApiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenAI({ apiKey: geminiApiKey });

// Initialize Groq (Lightning fast LLM + Whisper)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Singleton exports for use in other route files
export { genAI, groq };

const TN_SCHEMES_SYSTEM_PROMPT = `You are a Tamil Nadu Maternal & Child Welfare Schemes Expert AI embedded in the chAIid app.
Your ONLY job is to guide parents through Tamil Nadu government schemes.

KNOWLEDGE BASE (Tamil Nadu Schemes):

--- PHASE 1: PREGNANCY ---
1. Dr. Muthulakshmi Reddy Maternity Benefit Scheme (MRMBS): ₹18,000 total (₹14,000 cash in 3 installments + ₹4,000 as 2 nutrition kits). Must register on PICME portal before 12 weeks to get RCH ID. Tracks via 'Thaimai' app.
2. Pradhan Mantri Matru Vandana Yojana (PMMVY): ₹5,000 for 1st child, ₹6,000 for 2nd girl child (central scheme integrated with MRMBS).
3. Construction Workers Welfare Board: ₹18,000 for registered female construction workers. Manual workers: ₹6,000.

--- PHASE 2: DELIVERY ---
4. Chief Minister's Comprehensive Health Insurance Scheme (CMCHIS): Cashless coverage up to ₹5 Lakh/year for families with annual income < ₹1,20,000. Covers maternity + NICU care.
5. Janani Suraksha Yojana (JSY): BPL/SC/ST mothers only. ₹700 (rural) or ₹600 (urban) cash incentive for institutional delivery.

--- PHASE 3: NEWBORN & INFANCY (0–12 months) ---
6. Amma Baby Care Kit: ₹1,000 kit with 16 hygiene items (towel, dress, mosquito net, soap, sanitizer) for newborns in govt hospitals. Universal.
7. Low Birth Weight (LBW) Baby Care Kit: For babies born < 2.5 kg at 92 SNCUs. Monthly kit with iron drops, multivitamin drops, Vitamin D3 drops for 1 year.
8. Cradle Baby Scheme: Anonymous surrender of unwanted newborns at designated govt hospitals/PHCs. No legal repercussion. Child put up for adoption.

--- PHASE 4: CHILD GROWTH & NUTRITION (1–5 years) ---
9. Chief Minister's Breakfast Scheme: Free hot nutritious breakfast for Classes 1–5 in govt/state-aided schools. Combats morning hunger.
10. NGO Support (Aram Foundation, Coimbatore/TN): ₹2,000 nutrient kits for underprivileged children for malnutrition.

--- PHASE 5: EDUCATION & FUTURE (6+ years / school age) ---
11. Chief Minister's Girl Child Protection Scheme: For families with 1 or 2 daughters (income < ₹72,000) who adopt family planning. Govt deposits ₹50,000 (single girl) or ₹25,000 each (two girls). Matures at age 18 when girl writes 10th standard exam.
12. Pudhumai Penn Scheme: ₹1,000/month DBT for girls who studied in govt schools (Classes 6–12) pursuing UG degree/diploma/ITI.
13. Tamizh Pudhalvan Scheme: ₹1,000/month for boys from govt/govt-aided schools (Classes 6–12) for higher education.
14. Ulagam Ungal Kaiyil (Free Laptop Scheme): Free laptop (~₹30,000) for eligible final-year students in govt arts/science/engineering/medical institutions.

RULES:
- Baby age in months is provided. Use it to determine which schemes are CURRENTLY APPLICABLE vs FUTURE PLANNING.
- ALWAYS list ALL schemes but clearly mark each as:
  ✅ OPEN NOW — directly applicable at current age
  📅 PLAN AHEAD — applicable in future (mention when)
  ℹ️ ALREADY PASSED — window has passed (if applicable)
- Ask for: income bracket, employment type, child gender if not provided — but still show all schemes with eligibility notes.
- Be concise, structured, and use emojis for readability.
- Respond in the user's language.
- Format response as structured scheme cards.
- Always end with: "Register on PICME portal & visit your nearest PHC/Anganwadi for enrollment."
`;

export async function queryTNSchemes({
  message,
  language,
  babyAgeMonths,
  history = [],
  userContext
}: {
  message: string;
  language: string;
  babyAgeMonths: number;
  history?: { role: 'user' | 'model', parts: { text: string }[] }[];
  userContext?: { income?: string; employment?: string; gender?: string };
}) {
  const contextNote = userContext
    ? `User context: Income=${userContext.income || 'unknown'}, Employment=${userContext.employment || 'unknown'}, Child gender=${userContext.gender || 'unknown'}.`
    : 'User context not yet provided — show all schemes with eligibility notes and ask for details.';

  const fullPrompt = `${TN_SCHEMES_SYSTEM_PROMPT}

Current baby age: ${babyAgeMonths} months.
${contextNote}

User message: ${message}

IMPORTANT: Based on baby age of ${babyAgeMonths} months, categorize each scheme as ✅ OPEN NOW, 📅 PLAN AHEAD, or ℹ️ ALREADY PASSED. Be specific about age thresholds.`;

  try {
    const geminiHistory = history.map(h => ({ role: h.role, parts: [...h.parts] }));
    const response = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        ...geminiHistory,
        { role: "user", parts: [{ text: fullPrompt }] }
      ],
      config: { temperature: 0.3, maxOutputTokens: 800 }
    });
    const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) return text;
    throw new Error("No output from Gemini");
  } catch (error: any) {
    console.warn("[queryTNSchemes] Gemini failed, falling back to Groq:", error.message);
    const mappedHistory: any = history.map(h => ({
      role: h.role === 'model' ? 'assistant' : 'user',
      content: h.parts[0].text
    }));
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: fullPrompt },
        ...mappedHistory,
        { role: "user", content: message }
      ],
      temperature: 0.3,
      max_tokens: 800,
    });
    return completion.choices[0]?.message?.content || "";
  }
}

export async function queryBabyAI({
  message,
  language,
  babyAgeMonths,
  history = [],
  base64Image
}: {
  message: string;
  language: string;
  babyAgeMonths: number;
  history?: { role: 'user' | 'model', parts: { text: string }[] }[];
  base64Image?: string | null;
}) {
  const systemInstruction = `You are chAIid, a baby healthcare assistant for Indian parents.
  Baby age: ${babyAgeMonths} months.
  Language: ${language}.
  Guidelines: IAP (Indian Academy of Pediatrics) + WHO standards.
  Rules:
  - NEVER prescribe medication or exact dosages.
  - Always suggest seeing a doctor for HIGH severity.
  - If analyzing a photo, state clearly that you are an AI and the parent must consult a real doctor for an exact diagnosis.
  - Respond in ${language} language.
  - Keep response under 100 words.
  - End with severity: [LOW/MEDIUM/HIGH] in brackets at the very end.
  - Be warm, empathetic, and culturally sensitive to Indian parents.`;

  try {
    // 1. Try Gemini First
    const geminiHistory = history.map(h => ({ role: h.role, parts: [...h.parts] }));
    const userParts: any[] = [{ text: message }];
    
    if (base64Image) {
      const isDataUrl = base64Image.startsWith('data:');
      const mimeType = isDataUrl ? base64Image.split(';')[0].split(':')[1] : "image/jpeg";
      const data = isDataUrl ? base64Image.split(',')[1] : base64Image;
      
      userParts.unshift({
        inlineData: { mimeType, data }
      });
    }

    const response = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        ...geminiHistory,
        { role: "user", parts: userParts }
      ],
      config: {
        systemInstruction,
        temperature: 0.5,
        maxOutputTokens: 300,
      }
    });

    const textOutput = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (textOutput) return textOutput;
    throw new Error("No text output from Gemini candidates");
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn("[queryBabyAI] Gemini failed, falling back to Groq. Error:", msg);

    const mappedHistory = history.map((h) => ({
      role: h.role === 'model' ? 'assistant' as const : 'user' as const,
      content: h.parts[0].text
    }));

    let groqUserContent: string | { type: string; text?: string; image_url?: { url: string } }[] = message;
    let groqModel = "llama-3.3-70b-versatile";

    if (base64Image) {
      // Switch Groq model to Vision
      groqModel = "llama-3.2-11b-vision-preview";
      const isDataUrl = base64Image.startsWith('data:');
      const imageUrl = isDataUrl ? base64Image : `data:image/jpeg;base64,${base64Image}`;
      
      groqUserContent = [
        { type: "text", text: message },
        { type: "image_url", image_url: { url: imageUrl } }
      ];
    }

    const completion = await groq.chat.completions.create({
      model: groqModel,
      messages: [
        { role: "system", content: systemInstruction },
        ...mappedHistory,
        { role: "user", content: groqUserContent }
      ],
      temperature: 0.5,
      max_tokens: 300,
    });

    return completion.choices[0]?.message?.content || "";
  }
}

export async function transcribeAudio(base64Audio: string, mimeType: string) {
  try {
    // 1. Try Gemini First
    const response = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: base64Audio } },
            { text: "Please transcribe this audio accurately. Reply ONLY with the transcribed text." }
          ]
        }
      ]
    });

    const textOutput = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (textOutput) return textOutput.trim();
    throw new Error("No transcription text from Gemini");
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn("[transcribeAudio] Gemini failed, falling back to Groq. Error:", msg);

    // 2. Fallback to Groq
    // Convert base64 to Buffer then to File via SDK utility
    const buffer = Buffer.from(base64Audio, "base64");
    const extension = mimeType.split("/")[1]?.split(";")[0] || "webm";
    const file = await toFile(buffer, `audio.${extension}`, { type: mimeType });

    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: "whisper-large-v3",
      response_format: "text",
      language: "en" // We can force base language detection or EN
    });

    return transcription;
  }
}

export async function generateSpeech(text: string, voiceName: 'Kore' | 'Puck' | 'Fenrir' | 'Zephyr' | 'Charon' = 'Kore') {
  // TTS remains on Gemini
  const response = await genAI.models.generateContent({
    model: "gemini-1.5-flash",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
}
