// ── Middleware: Route protection ───────────────────────
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/jwt-edge";

// Paths that don't require authentication
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/me"];

// Paths that require admin role
const ADMIN_API_PREFIXES = ["/api/users", "/api/analytics", "/api/admin"];
const ADMIN_PAGE_PREFIXES = ["/admin"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Dev mode: bypass all auth checks ─────────────────
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow API routes that don't need auth (like uploads serving)
  if (pathname.startsWith("/api/uploads/")) {
    return NextResponse.next();
  }

  // Check auth for everything else
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    // API routes: return 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Pages: redirect to login
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const resp = NextResponse.redirect(new URL("/login", req.url));
    resp.cookies.delete(COOKIE_NAME);
    return resp;
  }

  // Check admin-only routes
  const needsAdmin =
    ADMIN_API_PREFIXES.some((p) => pathname.startsWith(p)) ||
    ADMIN_PAGE_PREFIXES.some((p) => pathname.startsWith(p));

  if (needsAdmin && payload.role !== "admin" && payload.role !== "su") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files, _next, favicon, etc.
    "/((?!_next|icons|manifest.json|favicon.ico|sw.js).*)",
  ],
};
