import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createOpenAI } from '@ai-sdk/openai';

export const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

export const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY || '',
});

export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Primary Vision Model: Gemini 1.5 Flash (Fast, Cheap, Multimodal)
export const visionModel = google('gemini-1.5-flash');

// Fallback Vision Model: Groq Llama 3.2 Vision
export const fallbackVisionModel = groq('llama-3.2-11b-vision-preview');

// Primary Chat Model: Groq Llama 3 (Fastest)
export const chatModel = groq('llama-3.3-70b-versatile');

// Fallback Chat Model: Google Gemini
export const fallbackChatModel = google('gemini-1.5-flash');
