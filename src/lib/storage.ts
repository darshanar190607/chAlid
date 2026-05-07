import { put } from '@vercel/blob';

export async function uploadToStorage(base64Image: string, filename: string): Promise<string> {
  try {
    // Vercel Blob requires BLOB_READ_WRITE_TOKEN. If missing we'll return a base64 string for local dev preview
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.warn("BLOB_READ_WRITE_TOKEN is missing. Returning local preview URL.");
        return `data:image/jpeg;base64,${base64Image}`;
    }

    const buffer = Buffer.from(base64Image, 'base64');
    
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: 'image/jpeg'
    });
    
    return blob.url;
  } catch (error) {
    console.error("Storage upload failed:", error);
    return `data:image/jpeg;base64,${base64Image}`;
  }
}
