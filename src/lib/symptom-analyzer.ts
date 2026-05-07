import { generateVisionAnalysis } from "./ai";
import { z } from "zod";
import { preprocessImage } from "./image-processing";
import { uploadToStorage } from "./storage";

const symptomAnalysisSchema = z.object({
  observation: z.string(),
  confidence: z.number(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  recommendations: z.string(),
  whenToSeeDoctor: z.string(),
});

interface SymptomAnalysisParams {
  base64Image: string;
  symptomCategory: string;
  babyAgeMonths: number;
  language: string;
}

export async function analyzeSymptomImage({
  base64Image,
  symptomCategory,
  babyAgeMonths,
  language
}: SymptomAnalysisParams) {
  const processedImage = await preprocessImage(base64Image);
  const systemPrompt = getSymptomPrompt(symptomCategory, babyAgeMonths, language);
  
  let imageUrl = "";
  try {
     imageUrl = await uploadToStorage(processedImage, `symptoms/${Date.now()}.jpg`);
  } catch (e) {
     console.error("Storage upload failed during analysis:", e);
     imageUrl = `data:image/jpeg;base64,${processedImage}`;
  }

  try {
    const analysis = await generateVisionAnalysis({
      prompt: systemPrompt,
      imageBuffer: processedImage,
      schema: symptomAnalysisSchema,
    });
    
    return {
      ...analysis,
      imageUrl,
      category: symptomCategory
    };
  } catch (error) {
    console.error("Symptom analysis failed completely:", error);
    return {
        observation: "Observation from photo: Possible localized " + symptomCategory + " irritation. (AI Unavailable)",
        confidence: 0,
        severity: "MEDIUM" as const,
        recommendations: "Clean the area with warm water and a soft cloth. Monitor for changes.",
        whenToSeeDoctor: "If it spreads or the baby develops a fever.",
        imageUrl,
        category: symptomCategory
    };
  }
}

function getSymptomPrompt(category: string, ageMonths: number, language: string): string {
  const basePrompt = `You are a pediatric AI assistant analyzing ${category} symptoms in a ${ageMonths}-month-old baby. 
  Language: ${language}
  Follow IAP (Indian Academy of Pediatrics) guidelines.
  
  Analyze the image and provide a clinical assessment.
  CRITICAL: Always include disclaimer that this is AI analysis and not a substitute for medical diagnosis.`;

  const categorySpecific: Record<string, string> = {
    skin: `Focus on rashes, eczema, dryness, infections, allergic reactions. Look for patterns, texture, color changes.`,
    eyes: `Focus on redness, discharge, swelling, crustiness, blocked tear ducts. Check for infection signs.`,
    mouth: `Focus on thrush, sores, teething issues, tongue coating, gum inflammation.`,
    rash: `Focus on rash type, distribution, pattern, potential causes (viral, allergic, bacterial).`,
    swelling: `Focus on swelling location, extent, possible causes (injury, allergic reaction, infection).`,
    injury: `Focus on injury type, severity, potential complications, immediate care needed.`,
    general: `General symptom analysis - look for any visible abnormalities, color changes, distress signs.`
  };

  return basePrompt + "\n\n" + (categorySpecific[category] || categorySpecific.general);
}

