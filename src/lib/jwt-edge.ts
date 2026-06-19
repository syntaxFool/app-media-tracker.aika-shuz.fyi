// ── Edge-compatible JWT utilities ─────────────────────
// No Node.js APIs, safe for Next.js Middleware (Edge Runtime)
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-me-in-production"
);
const JWT_EXPIRES_IN = "7d";
const COOKIE_NAME = "shanuzz_token";

export interface JWTPayload {
  userId: number;
  username: string;
  role: "admin" | "staff";
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export { COOKIE_NAME, JWT_SECRET, JWT_EXPIRES_IN };
