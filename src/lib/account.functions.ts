import { createServerFn } from "@tanstack/react-start";
import { deleteCookie, getCookie, getRequestHeader, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  authenticateGoogleUser,
  invalidateSession,
  resolveSessionFromCookie,
  verifyGoogleIdToken,
} from "@/server/auth";
import { getAppDatabase } from "@/server/d1-http.server";
import type { D1Database } from "@/server/db";
import type { ProgressRow } from "@/lib/sync";

const COOKIE = "gategrind_session";

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  targetGateYear: number;
  dailyGoal: number;
  streakDays: number;
}

function env() {
  const db = getAppDatabase();
  const secret = process.env["SESSION_SECRET"] ?? "";
  const clientId = process.env["GOOGLE_CLIENT_ID"] ?? "";
  const ready = !!db && secret.length >= 32 && !!clientId;
  return { db, secret, clientId, ready };
}

async function currentUser(db: D1Database, secret: string) {
  const raw = getCookie(COOKIE);
  if (!raw) return null;
  return resolveSessionFromCookie(`${COOKIE}=${raw}`, db, secret);
}

const toPublic = (u: {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  target_gate_year: number;
  daily_goal_questions: number;
  streak_days: number;
}): PublicUser => ({
  id: u.id,
  email: u.email,
  name: u.display_name,
  avatarUrl: u.avatar_url,
  targetGateYear: u.target_gate_year,
  dailyGoal: u.daily_goal_questions,
  streakDays: u.streak_days,
});

async function requireUser() {
  const e = env();
  if (!e.ready || !e.db) throw new Error("Accounts are not set up yet.");
  const s = await currentUser(e.db, e.secret);
  if (!s) throw new Error("Please log in.");
  return { db: e.db, user: s.user };
}

/** Public: whether login is configured, the Google client ID (public by design), and the signed-in user if any. */
export const getAuthStatus = createServerFn({ method: "GET" }).handler(async () => {
  const e = env();
  if (!e.ready || !e.db) return { configured: false as const, clientId: null, user: null };
  try {
    const s = await currentUser(e.db, e.secret);
    return { configured: true as const, clientId: e.clientId, user: s ? toPublic(s.user) : null };
  } catch (err) {
    console.error("getAuthStatus failed", err);
    return { configured: true as const, clientId: e.clientId, user: null };
  }
});

export const signInWithGoogle = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ idToken: z.string().min(20).max(5000) }).parse(d))
  .handler(async ({ data }) => {
    const e = env();
    if (!e.ready || !e.db) throw new Error("Accounts are not set up yet.");
    const payload = await verifyGoogleIdToken(data.idToken, e.clientId);
    const ua = getRequestHeader("user-agent");
    const { user, cookieValue } = await authenticateGoogleUser(
      payload,
      e.db,
      e.secret,
      ua ? { userAgent: ua } : {},
    );
    setCookie(COOKIE, cookieValue, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
    });
    return toPublic(user);
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const e = env();
  const raw = getCookie(COOKIE);
  if (raw && e.db) {
    const sid = raw.split(".")[0];
    if (sid) await invalidateSession(sid, e.db).catch((err) => console.error("logout", err));
  }
  deleteCookie(COOKIE, { path: "/" });
  return { ok: true };
});

const rowSchema = z.object({
  kind: z.enum(["attempt", "history", "mock", "bookmarks", "syllabus", "planner"]),
  key: z.string().min(1).max(200),
  payload: z.unknown(),
  updatedAt: z.number().int().nonnegative(),
});

/** Upserts the caller's rows (newest wins) and returns the caller's full server snapshot. */
export const syncProgress = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ rows: z.array(rowSchema).max(3000) }).parse(d))
  .handler(
    async ({
      data,
    }): Promise<
      { kind: ProgressRow["kind"]; key: string; payloadJson: string; updatedAt: number }[]
    > => {
      const { db, user } = await requireUser();
      for (const r of data.rows) {
        const payload = JSON.stringify(r.payload ?? null);
        if (payload.length > 200_000) continue;
        await db
          .prepare(
            `INSERT INTO user_progress (user_id, kind, item_key, payload, updated_at) VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(user_id, kind, item_key) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
           WHERE excluded.updated_at > user_progress.updated_at`,
          )
          .bind(user.id, r.kind, r.key, payload, r.updatedAt)
          .run();
      }
      const res = await db
        .prepare("SELECT kind, item_key, payload, updated_at FROM user_progress WHERE user_id = ?")
        .bind(user.id)
        .all<{
          kind: ProgressRow["kind"];
          item_key: string;
          payload: string;
          updated_at: number;
        }>();
      return res.results.map((r) => ({
        kind: r.kind,
        key: r.item_key,
        payloadJson: r.payload,
        updatedAt: Number(r.updated_at),
      }));
    },
  );

export const updateProfile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        targetGateYear: z.number().int().min(2025).max(2035),
        dailyGoal: z.number().int().min(1).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { db, user } = await requireUser();
    await db
      .prepare(
        "UPDATE user_profiles SET target_gate_year = ?, daily_goal_questions = ?, updated_at = ? WHERE id = ?",
      )
      .bind(data.targetGateYear, data.dailyGoal, new Date().toISOString(), user.id)
      .run();
    return { ok: true };
  });
