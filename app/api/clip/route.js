import { NextResponse } from "next/server";
import redis from "@/lib/redis";
import {
  createClipId,
  createRetrievalCode,
  sanitizeText,
  validatePublicFile,
  isValidClipId,
} from "@/lib/security";
import { checkRateLimit, apiLimiter } from "@/lib/rateLimiter";
import { CLIP_TTL_SECONDS, PUBLIC_MAX_TEXT_LENGTH } from "@/lib/constants";

export async function POST(request) {
  try {
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

    const formData = await request.formData();
    const type = formData.get("type");

    if (!type || !["text", "file"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid request type" },
        { status: 400 },
      );
    }

    let clipId = createClipId();
    let code = createRetrievalCode();

    let existingClip = await redis.get(`clip:${clipId}`);
    let retries = 0;
    while (existingClip && retries < 5) {
      clipId = createClipId();
      existingClip = await redis.get(`clip:${clipId}`);
      retries++;
    }

    let existingCode = await redis.get(`code:${code}`);
    retries = 0;
    while (existingCode && retries < 5) {
      code = createRetrievalCode();
      existingCode = await redis.get(`code:${code}`);
      retries++;
    }

    let clipData;

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
          {
            error: `Text too long. Public limit is 1MB (~1,000,000 characters)`,
          },
          { status: 400 },
        );
      }

      const sanitized = sanitizeText(text, PUBLIC_MAX_TEXT_LENGTH);

      clipData = {
        type: "text",
        content: sanitized,
        createdAt: Date.now(),
      };
    } else if (type === "file") {
      const file = formData.get("file");

      if (!file || typeof file === "string") {
        return NextResponse.json(
          { error: "File is required" },
          { status: 400 },
        );
      }

      const validation = validatePublicFile(file);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString("base64");

      clipData = {
        type: "file",
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        content: base64,
        createdAt: Date.now(),
      };
    }

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
