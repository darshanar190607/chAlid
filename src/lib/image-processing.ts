import sharp from 'sharp';

export async function preprocessImage(base64Image: string): Promise<string> {
  try {
    const buffer = Buffer.from(base64Image, 'base64');
    
    // Process image with Sharp
    const processedBuffer = await sharp(buffer)
      .resize(800, 800, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .sharpen()
      .normalize()
      .jpeg({ 
        quality: 85,
        progressive: true 
      })
      .toBuffer();
    
    return processedBuffer.toString('base64');
  } catch (error) {
    console.error("Image preprocessing failed:", error);
    return base64Image; // Return original if processing fails
  }
}

export function validateImage(base64Image: string): { valid: boolean; error?: string } {
  try {
    const buffer = Buffer.from(base64Image, 'base64');
    const size = buffer.length;
    
    if (size > 10 * 1024 * 1024) {
      return { valid: false, error: "Image too large. Maximum size is 10MB." };
    }
    
    const validFormats = ['image/jpeg', 'image/png', 'image/webp'];
    const format = getImageFormat(buffer);
    
    if (!validFormats.includes(format)) {
      return { valid: false, error: "Invalid image format. Please use JPEG, PNG, or WebP." };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: "Invalid image data." };
  }
}

function getImageFormat(buffer: Buffer): string {
  const signatures = {
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    'image/webp': [0x52, 0x49, 0x46, 0x46]
  };
  
  for (const [format, signature] of Object.entries(signatures)) {
    if (buffer.slice(0, signature.length).equals(Buffer.from(signature))) {
      return format;
    }
  }
  
  return 'unknown';
}
