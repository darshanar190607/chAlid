import { generateText, generateObject } from 'ai';
import { visionModel, fallbackVisionModel, chatModel, fallbackChatModel } from './providers';
import { z } from 'zod';

export async function generateVisionAnalysis<T>({
  prompt,
  imageBuffer,
  schema,
}: {
  prompt: string;
  imageBuffer: string; // base64
  schema: z.ZodType<T>;
}) {
  try {
    const { object } = await generateObject({
      model: visionModel,
      schema,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image', image: imageBuffer },
          ],
        },
      ],
    });
    return object;
  } catch (error) {
    console.warn('Primary vision model failed, trying fallback:', (error as Error).message);
    try {
      const { object } = await generateObject({
        model: fallbackVisionModel,
        schema,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image', image: imageBuffer },
            ],
          },
        ],
      });
      return object;
    } catch (fallbackError) {
      console.error('All vision models failed:', fallbackError);
      throw fallbackError;
    }
  }
}

export async function generateChatResponse({
  system,
  prompt,
}: {
  system?: string;
  prompt: string;
}) {
  try {
    const { text } = await generateText({
      model: chatModel,
      system,
      prompt,
    });
    return text;
  } catch (error) {
    console.warn('Primary chat model failed, trying fallback:', (error as Error).message);
    const { text } = await generateText({
      model: fallbackChatModel,
      system,
      prompt,
    });
    return text;
  }
}
