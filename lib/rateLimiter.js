import { Ratelimit } from "@upstash/ratelimit";
import redis from "./redis.js";
import { RATE_LIMIT } from "./constants.js";

export const apiLimiter = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(
    RATE_LIMIT.MAX_REQUESTS,
    `${RATE_LIMIT.WINDOW_SECONDS} s`,
  ),
  analytics: true,
  prefix: "ratelimit:api",
});

export const codeLimiter = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  analytics: true,
  prefix: "ratelimit:code",
});

export const loginLimiter = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(3, "60 s"),
  analytics: true,
  prefix: "ratelimit:login",
});

export async function checkRateLimit(limiter, identifier) {
  try {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      remaining: result.remaining,
    };
  } catch (error) {
    console.error("Rate limiter error:", error);
    return { success: true, remaining: 0 };
  }
}
