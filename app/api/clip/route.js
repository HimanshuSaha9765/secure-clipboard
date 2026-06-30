// ============================================
// API: POST /api/clip — Create public clip
// Supports: single text, single file, bulk files
// ============================================

import { NextResponse } from "next/server";
import redis from "@/lib/redis";
import {
  createClipId,
  createRetrievalCode,
  sanitizeText,
  validateFile,
  validatePublicBulkFiles,
} from "@/lib/security";
import { checkRateLimit, apiLimiter } from "@/lib/rateLimiter";
import {
  CLIP_TTL_SECONDS,
  PUBLIC_MAX_TEXT_LENGTH,
  PUBLIC_MAX_FILE_SIZE,
  PUBLIC_MAX_TOTAL_SIZE,
  MAX_FILES_COUNT,
} from "@/lib/constants";

export async function POST(request) {
  try {
    // ─── Rate Limiting ───
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const rateLimitResult = await checkRateLimit(apiLimiter, ip);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429 },
      );
    }

    // ─── Parse FormData ───
    const formData = await request.formData();
    const type = formData.get("type");

    if (!type || !["text", "file", "bulk"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid request type" },
        { status: 400 },
      );
    }

    // ─── Generate unique ID and code ───
    let clipId = createClipId();
    let code = createRetrievalCode();

    // Ensure uniqueness
    let retries = 0;
    while ((await redis.get(`clip:${clipId}`)) && retries < 5) {
      clipId = createClipId();
      retries++;
    }
    retries = 0;
    while ((await redis.get(`code:${code}`)) && retries < 5) {
      code = createRetrievalCode();
      retries++;
    }

    let clipData;

    // ─── TEXT ───
    if (type === "text") {
      const text = formData.get("content");

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return NextResponse.json(
          { error: "Text content is required" },
          { status: 400 },
        );
      }

      if (text.length > PUBLIC_MAX_TEXT_LENGTH) {
        return NextResponse.json(
          { error: "Text too long. Max ~4.5MB" },
          { status: 400 },
        );
      }

      clipData = {
        type: "text",
        content: sanitizeText(text, PUBLIC_MAX_TEXT_LENGTH),
        createdAt: Date.now(),
      };

      // ─── SINGLE FILE ───
    } else if (type === "file") {
      const file = formData.get("file");

      if (!file || typeof file === "string") {
        return NextResponse.json(
          { error: "File is required" },
          { status: 400 },
        );
      }

      const validation = validateFile(file, PUBLIC_MAX_FILE_SIZE);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString("base64");

      clipData = {
        type: "file",
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
        content: base64,
        createdAt: Date.now(),
      };

      // ─── BULK FILES ───
    } else if (type === "bulk") {
      const files = formData.getAll("files");

      if (!files || files.length === 0) {
        return NextResponse.json(
          { error: "No files provided" },
          { status: 400 },
        );
      }

      if (files.length > MAX_FILES_COUNT) {
        return NextResponse.json(
          { error: `Maximum ${MAX_FILES_COUNT} files allowed` },
          { status: 400 },
        );
      }

      // Validate all files
      const { accepted, rejected, totalSize } = validatePublicBulkFiles(files);

      if (accepted.length === 0) {
        return NextResponse.json(
          {
            error: "No valid files to upload",
            rejected: rejected,
          },
          { status: 400 },
        );
      }

      // Convert accepted files to base64
      const fileDataArray = [];
      for (const file of accepted) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString("base64");

        fileDataArray.push({
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size,
          content: base64,
        });
      }

      clipData = {
        type: "bulk",
        files: fileDataArray,
        fileCount: fileDataArray.length,
        createdAt: Date.now(),
      };

      // Store in Redis
      await redis.set(`clip:${clipId}`, JSON.stringify(clipData), {
        ex: CLIP_TTL_SECONDS,
      });
      await redis.set(`code:${code}`, clipId, {
        ex: CLIP_TTL_SECONDS,
      });

      const expiresAt = Date.now() + CLIP_TTL_SECONDS * 1000;

      return NextResponse.json({
        success: true,
        id: clipId,
        code: code,
        expiresAt: expiresAt,
        acceptedCount: accepted.length,
        rejectedFiles: rejected.length > 0 ? rejected : undefined,
      });
    }

    // ─── Store text/single file in Redis ───
    await redis.set(`clip:${clipId}`, JSON.stringify(clipData), {
      ex: CLIP_TTL_SECONDS,
    });
    await redis.set(`code:${code}`, clipId, {
      ex: CLIP_TTL_SECONDS,
    });

    const expiresAt = Date.now() + CLIP_TTL_SECONDS * 1000;

    return NextResponse.json({
      success: true,
      id: clipId,
      code: code,
      expiresAt: expiresAt,
    });
  } catch (error) {
    console.error("Error creating clip:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
