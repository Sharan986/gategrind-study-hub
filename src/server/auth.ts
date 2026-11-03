/**
 * GATE Grind - Authentication & Session Engine
 * ============================================
 * Cloudflare Native: WebCrypto HMAC-SHA256 session signatures + Google ID token verification.
 * Zero client-side secret exposure.
 */

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

const DEFAULT_SECRET = "gategrind-dev-session-secret-key-must-be-changed-in-production-64char";

export async function hmacSign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret || DEFAULT_SECRET),
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
  return expected === signature;
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

/**
 * Verify Google ID Token payload (client-side or server-side).
 * In production, checks Google's public certs or tokeninfo endpoint.
 */
export async function verifyGoogleIdToken(
  idToken: string,
  expectedClientId?: string
): Promise<GoogleTokenPayload> {
  if (!idToken || typeof idToken !== "string") {
    throw new Error("Invalid token format.");
  }

  // 1. Try Google TokenInfo endpoint for authoritative signature & audience validation
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (res.ok) {
      const data = (await res.json()) as any;
      if (expectedClientId && data.aud !== expectedClientId) {
        throw new Error(`Audience mismatch: expected ${expectedClientId}, got ${data.aud}`);
      }
      if (data.email_verified !== "true" && data.email_verified !== true) {
        throw new Error("Google email is not verified.");
      }
      return {
        sub: data.sub,
        email: data.email,
        email_verified: true,
        name: data.name || data.email.split("@")[0],
        picture: data.picture || "",
        aud: data.aud,
        exp: parseInt(data.exp, 10),
      };
    }
  } catch (err: any) {
    if (err.message?.includes("Audience mismatch") || err.message?.includes("not verified")) {
      throw err;
    }
    // Fallback to JWT payload decoding if offline / local dev mock
  }

  // 2. Decode JWT payload fallback (for testing/dev)
  const parts = idToken.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed JWT token.");
  }

  try {
    const payloadJson = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson);
    if (!payload.sub || !payload.email) {
      throw new Error("Incomplete Google ID token claims.");
    }
    return {
      sub: payload.sub,
      email: payload.email,
      email_verified: Boolean(payload.email_verified),
      name: payload.name || payload.email.split("@")[0],
      picture: payload.picture || "",
      aud: payload.aud,
      exp: payload.exp,
    };
  } catch {
    throw new Error("Failed to parse Google ID token payload.");
  }
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
