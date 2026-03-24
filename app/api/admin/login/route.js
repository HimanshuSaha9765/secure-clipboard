import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { checkRateLimit, loginLimiter } from "@/lib/rateLimiter";
import crypto from "crypto";

export async function POST(request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const rateLimitResult = await checkRateLimit(loginLimiter, ip);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many login attempts. Wait 1 minute." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password required" },
        { status: 400 },
      );
    }

    if (typeof username !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const validUsername = process.env.ADMIN_USERNAME;
    const passwordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!validUsername || !passwordHash) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 },
      );
    }

    const usernameMatch = username === validUsername;

    let passwordMatch = false;
    try {
      passwordMatch = await bcrypt.compare(password, passwordHash);
    } catch {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 },
      );
    }

    if (!usernameMatch || !passwordMatch) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    const sessionToken = crypto.randomBytes(32).toString("hex");
    const sessionSecret = process.env.SESSION_SECRET;

    if (!sessionSecret) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 },
      );
    }

    const hmac = crypto.createHmac("sha256", sessionSecret);
    hmac.update(sessionToken);
    const signature = hmac.digest("hex");
    const signedToken = `${sessionToken}.${signature}`;

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
    });

    response.cookies.set("admin_session", signedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
