import { NextResponse } from "next/server";
import { sendTextToTelegram, sendFileToTelegram } from "@/lib/telegram";
import { validateAdminFile, sanitizeText } from "@/lib/security";
import { checkRateLimit, apiLimiter } from "@/lib/rateLimiter";
import { ADMIN_MAX_TEXT_LENGTH } from "@/lib/constants";
import crypto from "crypto";

function verifyAdminSession(request) {
  const cookie = request.cookies.get("admin_session");

  if (!cookie || !cookie.value) {
    return false;
  }

  const signedToken = cookie.value;
  const parts = signedToken.split(".");

  if (parts.length !== 2) {
    return false;
  }

  const [token, signature] = parts;
  const sessionSecret = process.env.SESSION_SECRET;

  const hmac = crypto.createHmac("sha256", sessionSecret);
  hmac.update(token);
  const expectedSignature = hmac.digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex"),
    );
  } catch {
    return false;
  }
}

export async function POST(request) {
  try {
    if (!verifyAdminSession(request)) {
      return NextResponse.json(
        { error: "Unauthorized. Please login first." },
        { status: 401 },
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const rateLimitResult = await checkRateLimit(apiLimiter, `admin:${ip}`);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait." },
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

    if (type === "text") {
      const text = formData.get("content");

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return NextResponse.json(
          { error: "Text content is required" },
          { status: 400 },
        );
      }

      if (text.length > ADMIN_MAX_TEXT_LENGTH) {
        return NextResponse.json(
          { error: "Text too long. Admin limit is 4.5MB" },
          { status: 400 },
        );
      }

      const sanitized = sanitizeText(text, ADMIN_MAX_TEXT_LENGTH);

      if (sanitized.length <= 4096) {
        await sendTextToTelegram(`📋 <b>Admin Clipboard</b>\n\n${sanitized}`);
      } else {
        await sendTextToTelegram(
          `📋 <b>Admin Clipboard</b> (large text - sending as file)`,
        );

        const buffer = Buffer.from(sanitized, "utf-8");
        await sendFileToTelegram(
          buffer,
          `clipboard_${Date.now()}.txt`,
          "text/plain",
          "📋 Full text content",
        );
      }

      return NextResponse.json({
        success: true,
        message: "Text sent to Telegram",
      });
    } else if (type === "file") {
      const file = formData.get("file");

      if (!file || typeof file === "string") {
        return NextResponse.json(
          { error: "File is required" },
          { status: 400 },
        );
      }

      const validation = validateAdminFile(file);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

      await sendFileToTelegram(
        buffer,
        file.name,
        file.type,
        `📎 Admin Upload\n📁 ${file.name}\n💾 ${fileSizeMB}MB`,
      );

      return NextResponse.json({
        success: true,
        message: "File sent to Telegram",
      });
    }
  } catch (error) {
    console.error("Admin send error:", error);
    return NextResponse.json(
      { error: "Failed to send to Telegram. Check bot settings." },
      { status: 500 },
    );
  }
}
