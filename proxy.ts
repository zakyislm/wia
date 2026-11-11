import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED_ORIGINS = new Set([
  "https://app.kavi.jeki.me",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");
  const isAllowedOrigin = !origin || ALLOWED_ORIGINS.has(origin);

  if (request.method === "OPTIONS") {
    const preflight = new NextResponse(null, {
      status: isAllowedOrigin ? 204 : 403,
    });
    if (origin && isAllowedOrigin) {
      preflight.headers.set("Access-Control-Allow-Origin", origin);
      preflight.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS"
      );
      preflight.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, x-user-id, x-public-visitor"
      );
      preflight.headers.set("Access-Control-Allow-Credentials", "true");
    }
    return preflight;
  }

  const response = NextResponse.next();

  if (origin && isAllowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Vary", "Origin");
  }

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
