import express, { Request, Response } from "express";
import { uploadViaEdgeFunction, bufferToBase64 } from "../helpers/supabase-upload.js";

const router = express.Router();

/**
 * POST /api/storage/upload
 * Upload file to Supabase via Edge Function
 *
 * Body:
 * {
 *   "bucket": "turbobujias-fullstack",
 *   "path": "uploads/test.png",
 *   "contentType": "image/png",
 *   "fileBase64": "<base64_encoded_file>"
 * }
 */
router.post("/upload", async (req: Request, res: Response) => {
  try {
    const { bucket, path, contentType, fileBase64 } = req.body;

    if (!bucket || !path || !fileBase64) {
      return res.status(400).json({
        error: "Missing required fields: bucket, path, fileBase64",
      });
    }

    const result = await uploadViaEdgeFunction(
      bucket,
      path,
      fileBase64,
      contentType || "application/octet-stream"
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    res.status(500).json({
      error: error.message || "Upload failed",
    });
  }
});

/**
 * POST /api/storage/upload-form
 * Upload file from multipart form data
 *
 * FormData:
 *   file: <file>
 *   bucket: "turbobujias-fullstack"
 *   path: "uploads/filename.png"
 */
router.post("/upload-form", async (req: Request, res: Response) => {
  try {
    // This requires multer middleware
    // For now, just document the expected usage
    res.status(501).json({
      message: "Multipart upload not yet implemented",
      note: "Use /upload endpoint with base64-encoded file",
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * POST /api/storage/qr-scan-upload
 * Example: Upload QR code scan result image
 *
 * Body:
 * {
 *   "qrCodeData": "<base64_image_from_scanner>",
 *   "productSku": "NGK-BKR5E"
 * }
 */
router.post("/qr-scan-upload", async (req: Request, res: Response) => {
  try {
    const { qrCodeData, productSku } = req.body;

    if (!qrCodeData || !productSku) {
      return res.status(400).json({
        error: "Missing qrCodeData or productSku",
      });
    }

    const path = `qr-scans/${productSku}/${Date.now()}.jpg`;

    const result = await uploadViaEdgeFunction(
      "turbobujias-fullstack",
      path,
      qrCodeData,
      "image/jpeg"
    );

    res.json({
      success: true,
      uploadPath: path,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
    });
  }
});

export default router;
