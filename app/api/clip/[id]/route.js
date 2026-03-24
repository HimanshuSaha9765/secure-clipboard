import { NextResponse } from "next/server";
import redis from "@/lib/redis";
import { isValidClipId } from "@/lib/security";
import { checkRateLimit, apiLimiter } from "@/lib/rateLimiter";

export async function GET(request, { params }) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const rateLimitResult = await checkRateLimit(apiLimiter, ip);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait." },
        { status: 429 },
      );
    }

    const { id } = await params;

    if (!isValidClipId(id)) {
      return NextResponse.json(
        { error: "Clip not found or has expired" },
        { status: 404 },
      );
    }

    const clipDataRaw = await redis.get(`clip:${id}`);

    if (!clipDataRaw) {
      return NextResponse.json(
        { error: "Clip not found or has expired" },
        { status: 404 },
      );
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
      await redis.del(`clip:${id}`);
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
    console.error("Error fetching clip:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
