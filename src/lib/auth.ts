// ── Authentication Utilities (Server-side only) ──────
// Uses bcryptjs — NOT compatible with Edge Runtime
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import prisma from "./db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-me-in-production"
);
const COOKIE_NAME = "shanuzz_token";
const JWT_EXPIRES_IN = "7d";

export interface JWTPayload {
  userId: number;
  username: string;
  role: "su" | "admin" | "staff";
}

export { COOKIE_NAME };

// ── Password hashing ──────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ── JWT token operations ──────────────────────────────
export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// ── Server-side session helpers ───────────────────────
export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAdmin(): Promise<JWTPayload> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  if (session.role !== "admin" && session.role !== "su") throw new Error("Forbidden: admin only");
  return session;
}

export async function requireNotSuperuser(username: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { username } });
  if (user?.isSuperuser) throw new Error("Cannot modify superuser");
}

export async function requireAuth(): Promise<JWTPayload> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

export function setTokenCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax; Secure`;
}

export function clearTokenCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax; Secure`;
}
