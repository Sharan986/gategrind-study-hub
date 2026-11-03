/**
 * GATE Grind - Type-Safe TanStack Start Server Functions
 * ======================================================
 * RPC endpoints called directly by React client components:
 * - Auth: getCurrentUser, verifyGoogleAuth, logoutUser
 * - Catalog: fetchSubjects, fetchSubjectTopics, fetchQuestions, fetchQuestion, fetchPastPaperYears
 * - Practice: submitQuestionAttempt, toggleQuestionBookmark, fetchUserAnalytics
 * - Mocks: startMockExam, submitMockExam
 */

import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie, deleteCookie, getRequestHeaders } from "@tanstack/react-start/server";
import { getAppDatabase } from "./d1-http.server";
import type { D1Database } from "./db";

function getDatabase(): D1Database {
  const db = getAppDatabase();
  if (!db) throw new Error("Database is not configured yet.");
  return db;
}
import {
  authenticateGoogleUser,
  resolveSessionFromCookie,
  invalidateSession,
  verifyGoogleIdToken,
  type UserProfile,
} from "./auth";
import {
  getSubjects,
  getSubjectTopicsBySlug,
  getQuestions,
  getQuestionById,
  getPastPaperYears,
  type QuestionFilterOptions,
} from "./catalog";
import { recordAttempt, toggleBookmark, getUserAnalytics } from "./practice";
import { generateMockExam, evaluateMockSubmission, type MockConfig, type MockSubmissionInput } from "./mock";

const SESSION_COOKIE_NAME = "gategrind_session";
const sessionSecret = () => process.env["SESSION_SECRET"] ?? "";

// Helper: resolve user from current session cookie
async function resolveCurrentUser() {
  const cookieHeader = getCookie(SESSION_COOKIE_NAME);
  if (!cookieHeader) return null;

  const db = getDatabase();
  const sessionData = await resolveSessionFromCookie(
    `gategrind_session=${cookieHeader}`,
    db,
    sessionSecret()
  );
  return sessionData?.user ?? null;
}

// ─────────────────────────────────────────────
// 1. AUTHENTICATION SERVER FUNCTIONS
// ─────────────────────────────────────────────

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async (): Promise<UserProfile | null> => {
  return await resolveCurrentUser();
});

export const verifyGoogleAuth = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { idToken: string })
  .handler(async ({ data }): Promise<{ user: UserProfile; success: boolean }> => {
    const db = getDatabase();
    const userAgent = getRequestHeaders().get("user-agent") ?? undefined;

    const payload = await verifyGoogleIdToken(data.idToken, process.env["GOOGLE_CLIENT_ID"] ?? "");
    const { user, cookieValue } = await authenticateGoogleUser(
      payload,
      db,
      sessionSecret(),
      userAgent ? { userAgent } : {}
    );

    // Set signed HttpOnly session cookie (30 days)
    setCookie(SESSION_COOKIE_NAME, cookieValue, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
    });

    return { user, success: true };
  });

export const logoutUser = createServerFn({ method: "POST" }).handler(async () => {
  const cookieVal = getCookie(SESSION_COOKIE_NAME);
  if (cookieVal) {
    const sessionId = cookieVal.split(".")[0];
    if (sessionId) {
      const db = getDatabase();
      await invalidateSession(sessionId, db);
    }
  }

  deleteCookie(SESSION_COOKIE_NAME, { path: "/" });
  return { success: true };
});

// ─────────────────────────────────────────────
// 2. CATALOG & QUESTION FUNCTIONS
// ─────────────────────────────────────────────

export const fetchSubjects = createServerFn({ method: "GET" }).handler(async () => {
  const user = await resolveCurrentUser();
  const db = getDatabase();
  return await getSubjects(db, user?.id);
});

export const fetchSubjectTopics = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => d as { subjectSlug: string })
  .handler(async ({ data }) => {
    const user = await resolveCurrentUser();
    const db = getDatabase();
    const topics = await getSubjectTopicsBySlug
      ? await (async () => {
          const { getTopicsBySubjectSlug } = await import("./catalog");
          return await getTopicsBySubjectSlug(data.subjectSlug, db, user?.id);
        })()
      : [];
    return topics;
  });

export const fetchQuestions = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as QuestionFilterOptions)
  .handler(async ({ data }) => {
    const user = await resolveCurrentUser();
    const db = getDatabase();
    return await getQuestions(db, { ...data, ...(user ? { userId: user.id } : {}) });
  });

export const fetchQuestion = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { questionId: string })
  .handler(async ({ data }) => {
    const user = await resolveCurrentUser();
    const db = getDatabase();
    return await getQuestionById(data.questionId, db, user?.id);
  });

export const fetchPastPaperYears = createServerFn({ method: "GET" }).handler(async () => {
  const db = getDatabase();
  return await getPastPaperYears(db);
});

// ─────────────────────────────────────────────
// 3. PRACTICE & ATTEMPTS FUNCTIONS
// ─────────────────────────────────────────────

export const submitQuestionAttempt = createServerFn({ method: "POST" })
  .inputValidator(
    (d: unknown) =>
      d as {
        questionId: string;
        selectedAnswer: string;
        timeTakenSeconds: number;
        mode?: "study" | "mock" | "paper";
      }
  )
  .handler(async ({ data }) => {
    const user = await resolveCurrentUser();
    if (!user) {
      throw new Error("Authentication required to record attempt.");
    }

    const db = getDatabase();
    return await recordAttempt(
      {
        userId: user.id,
        questionId: data.questionId,
        selectedAnswer: data.selectedAnswer,
        timeTakenSeconds: data.timeTakenSeconds,
        mode: data.mode || "study",
      },
      db
    );
  });

export const toggleQuestionBookmark = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { questionId: string; note?: string })
  .handler(async ({ data }) => {
    const user = await resolveCurrentUser();
    if (!user) {
      throw new Error("Authentication required to manage bookmarks.");
    }

    const db = getDatabase();
    return await toggleBookmark(user.id, data.questionId, db, data.note);
  });

export const fetchUserAnalytics = createServerFn({ method: "GET" }).handler(async () => {
  const user = await resolveCurrentUser();
  if (!user) {
    throw new Error("Authentication required to view analytics.");
  }

  const db = getDatabase();
  return await getUserAnalytics(user.id, db);
});

// ─────────────────────────────────────────────
// 4. MOCK EXAM FUNCTIONS
// ─────────────────────────────────────────────

export const startMockExam = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { type: "full" | "subject" | "topic"; subjectSlug?: string; topicSlug?: string })
  .handler(async ({ data }) => {
    const user = await resolveCurrentUser();
    if (!user) {
      throw new Error("Authentication required to generate mock exam.");
    }

    const db = getDatabase();
    return await generateMockExam(
      {
        type: data.type,
        ...(data.subjectSlug ? { subjectSlug: data.subjectSlug } : {}),
        ...(data.topicSlug ? { topicSlug: data.topicSlug } : {}),
        userId: user.id,
      },
      db
    );
  });

export const submitMockExam = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { mockId: string; timeTakenSeconds: number; answers: Record<string, string> })
  .handler(async ({ data }) => {
    const user = await resolveCurrentUser();
    if (!user) {
      throw new Error("Authentication required to submit mock exam.");
    }

    const db = getDatabase();
    return await evaluateMockSubmission(
      {
        mockId: data.mockId,
        userId: user.id,
        timeTakenSeconds: data.timeTakenSeconds,
        answers: data.answers,
      },
      db
    );
  });
