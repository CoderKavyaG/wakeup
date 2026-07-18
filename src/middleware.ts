import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const { auth } = NextAuth(authConfig);

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

const apiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "60 s"),
  analytics: true,
  prefix: "wakeup_ratelimit",
});

export default auth(async (req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;

  // 1. Rate Limiting for heavy API endpoints
  const isRateLimitedRoute = nextUrl.pathname.startsWith("/api/cockpit") || 
                             nextUrl.pathname.startsWith("/api/intelligence");

  if (isRateLimitedRoute) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "anonymous";
    const identifier = req.auth?.user?.id || ip;
    try {
      if (process.env.UPSTASH_REDIS_REST_URL) {
        const { success, limit, reset, remaining } = await apiLimiter.limit(identifier);
        if (!success) {
          return new Response(
            JSON.stringify({ error: "Too many requests. Please wait a minute." }),
            {
              status: 429,
              headers: {
                "Content-Type": "application/json",
                "X-RateLimit-Limit": limit.toString(),
                "X-RateLimit-Remaining": remaining.toString(),
                "X-RateLimit-Reset": reset.toString(),
              },
            }
          );
        }
      }
    } catch (e) {
      console.error("Rate limiting error:", e);
    }
  }

  // 2. Allow API routes to pass through (authentication checks are handled inside them or below)
  if (nextUrl.pathname.startsWith("/api")) {
    return;
  }

  // 3. Page Routes Authentication Checks
  const isPublicRoute = nextUrl.pathname === "/";

  if (isLoggedIn && nextUrl.pathname === "/") {
    return Response.redirect(new URL("/dashboard", nextUrl));
  }

  if (!isPublicRoute && !isLoggedIn) {
    return Response.redirect(new URL("/", nextUrl));
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|mp4|mp3|pdf|woff|woff2|ttf|otf)).*)",
  ],
};
