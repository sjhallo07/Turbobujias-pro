/**
 * Supabase Edge Functions Helper
 * Wrapper for calling 5 inventory/storage functions
 */

import axios from 'axios';

const SUPABASE_URL = 'https://auzubegrcawdobkfttpj.supabase.co';

// ========== PUBLIC FUNCTIONS (no auth) ==========

/**
 * Upload file to Supabase Storage (public, no JWT needed)
 */
export async function uploadToStorageBucket(
  bucket: string,
  path: string,
  base64Data: string,
  contentType: string = 'application/octet-stream'
) {
  const response = await axios.post(
    `${SUPABASE_URL}/functions/v1/upload-to-bucket?bucket=${encodeURIComponent(bucket)}`,
    {
      path,
      contentBase64: base64Data,
      contentType,
    },
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
  return response.data;
}

/**
 * Upload file to storage via multipart
 */
export async function uploadToStorageMultipart(
  bucket: string,
  path: string,
  fileBuffer: Buffer,
  contentType: string = 'application/octet-stream'
) {
  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer], { type: contentType }), path);
  formData.append('path', path);

  const response = await axios.post(
    `${SUPABASE_URL}/functions/v1/upload-to-bucket?bucket=${encodeURIComponent(bucket)}`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  );
  return response.data;
}

// ========== AUTHENTICATED FUNCTIONS (user JWT required) ==========

/**
 * Bulk import inventory items
 */
export async function importInventoryBulk(
  items: Array<{
    sku: string;
    upc?: string | null;
    ean?: string | null;
    oem_code?: string | null;
    title?: string | null;
    condition?: string | null;
    description?: string | null;
    image_urls?: string[] | null;
    stock?: number;
    quantity?: number;
    price?: number | string;
  }>,
  userJWT: string
) {
  const response = await axios.post(
    `${SUPABASE_URL}/functions/v1/import-inventory`,
    { items },
    {
      headers: {
        Authorization: `Bearer ${userJWT}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
}

/**
 * Scan QR code / lookup product
 */
export async function scanProduct(code: string, userJWT: string, wantImage = false) {
  const response = await axios.post(
    `${SUPABASE_URL}/functions/v1/inventory-mediator`,
    {
      action: 'scan',
      code,
      want_image: wantImage,
    },
    {
      headers: {
        Authorization: `Bearer ${userJWT}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
}

/**
 * Confirm sale and decrement inventory
 */
export async function confirmSale(
  code: string,
  deviceFingerprint: string,
  userJWT: string,
  qty: number = 1,
  source: string = 'payment-confirmed'
) {
  const response = await axios.post(
    `${SUPABASE_URL}/functions/v1/inventory-mediator`,
    {
      action: 'sell_confirmed',
      code,
      device_fingerprint: deviceFingerprint,
      qty,
      source,
    },
    {
      headers: {
        Authorization: `Bearer ${userJWT}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
}

/**
 * Summarize thread (placeholder - needs implementation)
 */
export async function summarizeThread(threadId: string, userJWT: string) {
  const response = await axios.post(
    `${SUPABASE_URL}/functions/v1/summarize-thread`,
    { thread_id: threadId },
    {
      headers: {
        Authorization: `Bearer ${userJWT}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
}

/**
 * Rapid function (placeholder - needs definition)
 */
export async function callRapidFunction(payload: any, userJWT: string) {
  const response = await axios.post(
    `${SUPABASE_URL}/functions/v1/rapid-function`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${userJWT}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
}

// ========== UTILITY HELPERS ==========

/**
 * Convert buffer to base64
 */
export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

/**
 * Fetch file as base64
 */
export async function fetchAsBase64(url: string): Promise<string> {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(response.data, 'binary');
  return bufferToBase64(buffer);
}

/**
 * Generate device fingerprint
 */
export function generateDeviceFingerprint(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
}
