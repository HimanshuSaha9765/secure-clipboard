import { NextResponse } from "next/server";
import redis from "@/lib/redis";
import { isValidCode, isValidClipId } from "@/lib/security";
import { checkRateLimit, codeLimiter } from "@/lib/rateLimiter";

export async function POST(request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const rateLimitResult = await checkRateLimit(codeLimiter, ip);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait 1 minute." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    if (!isValidCode(code)) {
      return NextResponse.json(
        { error: "Invalid or expired code" },
        { status: 404 },
      );
    }

    const clipId = await redis.get(`code:${code}`);

    if (!clipId) {
      return NextResponse.json(
        { error: "Invalid or expired code" },
        { status: 404 },
      );
    }

    if (!isValidClipId(clipId)) {
      return NextResponse.json(
        { error: "Invalid or expired code" },
        { status: 404 },
      );
    }

    const clipDataRaw = await redis.get(`clip:${clipId}`);

    if (!clipDataRaw) {
      await redis.del(`code:${code}`);
      return NextResponse.json({ error: "Clip has expired" }, { status: 410 });
    }

    let clipData;
    if (typeof clipDataRaw === "string") {
      clipData = JSON.parse(clipDataRaw);
    } else {
      clipData = clipDataRaw;
    }

    const age = Date.now() - clipData.createdAt;
    const maxAge = 10 * 60 * 1000;

    if (age > maxAge) {
      await redis.del(`clip:${clipId}`);
      await redis.del(`code:${code}`);
      return NextResponse.json({ error: "Clip has expired" }, { status: 410 });
    }

    const remainingMs = maxAge - age;

    return NextResponse.json({
      success: true,
      clip: {
        type: clipData.type,
        content: clipData.content,
        fileName: clipData.fileName || null,
        fileType: clipData.fileType || null,
        fileSize: clipData.fileSize || null,
      },
      remainingMs: remainingMs,
    });
  } catch (error) {
    console.error("Error retrieving clip:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
