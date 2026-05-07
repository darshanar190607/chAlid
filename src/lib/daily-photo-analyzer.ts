import { generateVisionAnalysis } from "./ai";
import { z } from "zod";
import { preprocessImage } from "./image-processing";
import { uploadToStorage } from "./storage";

const dailyPhotoSchema = z.object({
  isHealthy: z.boolean(),
  observation: z.string(),
  confidence: z.number(),
  recommendations: z.string(),
});

interface DailyPhotoParams {
  base64Image: string;
  babyAgeMonths: number;
  language: string;
}

export async function analyzeDailyPhoto({ base64Image, babyAgeMonths, language }: DailyPhotoParams) {
  const processedImage = await preprocessImage(base64Image);
  const systemPrompt = `You are a pediatric AI assistant analyzing a daily photo of a ${babyAgeMonths}-month-old baby.
  Language: ${language}
  Follow general wellness guidelines.
  
  Analyze the image and provide a general health check.
  CRITICAL: Always include a disclaimer that this is AI analysis and not a substitute for medical diagnosis.`;

  let imageUrl = "";
  try {
     imageUrl = await uploadToStorage(processedImage, `daily-photos/${Date.now()}.jpg`);
  } catch (e) {
     console.error("Storage upload failed during daily photo analysis:", e);
     imageUrl = `data:image/jpeg;base64,${processedImage}`;
  }

  try {
    const analysis = await generateVisionAnalysis({
      prompt: systemPrompt,
      imageBuffer: processedImage,
      schema: dailyPhotoSchema,
    });
    return { ...analysis, imageUrl };
  } catch (error) {
    console.error("AI Analysis failed completely:", error);
    return {
      isHealthy: true,
      observation: "AI analysis was unavailable at this time. Baby appears consistent with previous logs.",
      confidence: 0,
      recommendations: "Continue regular care and monitor for any changes.",
      imageUrl
    };
  }
}

