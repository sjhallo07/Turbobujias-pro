import axios from "axios";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://auzubegrcawdobkfttpj.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

/**
 * Upload file to Supabase via Edge Function
 * @param bucket Supabase storage bucket name
 * @param path File path in bucket (e.g., "uploads/test.png")
 * @param base64Data File content in base64 format
 * @param contentType MIME type (e.g., "image/png")
 */
export async function uploadViaEdgeFunction(
  bucket: string,
  path: string,
  base64Data: string,
  contentType: string = "application/octet-stream"
) {
  const functionUrl = `${SUPABASE_URL}/functions/v1/upload-to-bucket`;

  try {
    const response = await axios.post(
      functionUrl,
      {
        path,
        contentBase64: base64Data,
        contentType,
      },
      {
        params: { bucket },
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error("Upload error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.error || "Upload failed");
  }
}

/**
 * Convert file buffer to base64
 */
export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString("base64");
}

/**
 * Convert URL to base64 (for testing)
 */
export async function urlToBase64(fileUrl: string): Promise<string> {
  const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
  const buffer = Buffer.from(response.data, "binary");
  return bufferToBase64(buffer);
}
