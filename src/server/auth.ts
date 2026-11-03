/**
 * GATE Grind - Authentication & Session Engine
 * ============================================
 * Cloudflare Native: WebCrypto HMAC-SHA256 session signatures + Google ID token verification.
 * Zero client-side secret exposure.
 */

import { createRemoteJWKSet, jwtVerify } from "jose";
import type { D1Database } from "./db";

export interface UserProfile {
  id: string;
  google_sub: string;
  email: string;
  display_name: string;
  avatar_url: string;
  role: "student" | "contributor" | "admin";
  target_gate_year: number;
  daily_goal_questions: number;
  streak_days: number;
  last_active_date: string | null;
}

export interface UserSession {
  id: string;
  user_id: string;
  email: string;
  role: string;
  expires_at: number;
  created_at: number;
}


function requireSecret(secret: string): string {
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be set (32+ chars).");
  return secret;
}

export async function hmacSign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(requireSecret(secret)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hmacVerify(data: string, signature: string, secret: string): Promise<boolean> {
  const expected = await hmacSign(data, secret);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

export interface GoogleTokenPayload {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  aud?: string;
  exp?: number;
}

const GOOGLE_JWKS_URL = new URL("https://www.googleapis.com/oauth2/v3/certs");
let googleJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

/**
 * Verify a Google ID token's signature (Google JWKS), issuer, audience and expiry.
 * There is deliberately no unverified fallback: an unverifiable token is rejected.
 */
export async function verifyGoogleIdToken(idToken: string, expectedClientId: string): Promise<GoogleTokenPayload> {
  if (!idToken || typeof idToken !== "string") throw new Error("Invalid token format.");
  if (!expectedClientId) throw new Error("GOOGLE_CLIENT_ID is not configured.");
  googleJwks ??= createRemoteJWKSet(GOOGLE_JWKS_URL);
  const { payload } = await jwtVerify(idToken, googleJwks, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: expectedClientId,
  });
  const email = typeof payload["email"] === "string" ? payload["email"] : "";
  if (!payload.sub || !email) throw new Error("Incomplete Google ID token claims.");
  if (payload["email_verified"] !== true && payload["email_verified"] !== "true") throw new Error("Google email is not verified.");
  return {
    sub: payload.sub,
    email,
    email_verified: true,
    name: typeof payload["name"] === "string" ? payload["name"] : email.split("@")[0] ?? email,
    picture: typeof payload["picture"] === "string" ? payload["picture"] : "",
    aud: expectedClientId,
    ...(payload.exp !== undefined ? { exp: payload.exp } : {}),
  };
}

/**
 * Upsert user profile from verified Google identity and create session.
 */
export async function authenticateGoogleUser(
  tokenPayload: GoogleTokenPayload,
  db: D1Database,
  sessionSecret: string,
  clientMeta?: { userAgent?: string; ipAddress?: string }
): Promise<{ user: UserProfile; cookieValue: string; sessionId: string }> {
  const userId = `usr_${tokenPayload.sub.slice(0, 16)}`;
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  // 1. Upsert user_profiles
  await db
    .prepare(
      `INSERT INTO user_profiles (id, google_sub, email, display_name, avatar_url, last_active_date, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(google_sub) DO UPDATE SET
         display_name = excluded.display_name,
         avatar_url = excluded.avatar_url,
         last_active_date = excluded.last_active_date,
         updated_at = excluded.updated_at`
    )
    .bind(
      userId,
      tokenPayload.sub,
      tokenPayload.email,
      tokenPayload.name || tokenPayload.email.split("@")[0],
      tokenPayload.picture || "",
      today,
      now
    )
    .run();

  // Retrieve user
  const user = (await db
    .prepare("SELECT * FROM user_profiles WHERE google_sub = ?")
    .bind(tokenPayload.sub)
    .first()) as UserProfile;

  // 2. Create session (30-day lifetime)
  const sessionId = `ses_${crypto.randomUUID().replace(/-/g, "")}`;
  const expiresAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

  await db
    .prepare(
      `INSERT INTO user_sessions (id, user_id, email, role, user_agent, ip_address, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      sessionId,
      user.id,
      user.email,
      user.role || "student",
      clientMeta?.userAgent || null,
      clientMeta?.ipAddress || null,
      expiresAt
    )
    .run();

  // 3. Sign session cookie
  const signature = await hmacSign(sessionId, sessionSecret);
  const cookieValue = `${sessionId}.${signature}`;

  return { user, cookieValue, sessionId };
}

/**
 * Validate session from request cookie header.
 */
export async function resolveSessionFromCookie(
  cookieHeader: string | null | undefined,
  db: D1Database,
  sessionSecret: string
): Promise<{ user: UserProfile; session: UserSession } | null> {
  if (!cookieHeader) return null;

  // Parse cookie "gategrind_session=..."
  const match = cookieHeader.match(/gategrind_session=([^;]+)/);
  if (!match) return null;

  const raw = match[1].trim();
  const [sessionId, signature] = raw.split(".");
  if (!sessionId || !signature) return null;

  // Verify HMAC signature
  const isValid = await hmacVerify(sessionId, signature, sessionSecret);
  if (!isValid) return null;

  // Check D1 session store
  const now = Math.floor(Date.now() / 1000);
  const session = (await db
    .prepare("SELECT * FROM user_sessions WHERE id = ? AND expires_at > ?")
    .bind(sessionId, now)
    .first()) as UserSession | null;

  if (!session) return null;

  // Retrieve user profile
  const user = (await db
    .prepare("SELECT * FROM user_profiles WHERE id = ?")
    .bind(session.user_id)
    .first()) as UserProfile | null;

  if (!user) return null;

  return { user, session };
}

/**
 * Invalidate session on logout.
 */
export async function invalidateSession(
  sessionId: string,
  db: D1Database
): Promise<boolean> {
  const res = await db
    .prepare("DELETE FROM user_sessions WHERE id = ?")
    .bind(sessionId)
    .run();
  return res.success;
}
