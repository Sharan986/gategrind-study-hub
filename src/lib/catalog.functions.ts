import { createServerFn } from "@tanstack/react-start";
import { getAppDatabase } from "@/server/d1-http.server";
import {
  getQuestionById,
  getQuestions,
  getSubjects,
  type QuestionFilterOptions,
} from "@/server/catalog";
import { toFrontendQuestion } from "@/server/adapter";
import type { Question } from "@/lib/types";

/** Fetches a single question from D1 by ID or external code, returning the frontend Question shape. */
export const fetchQuestion = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as { questionId: string })
  .handler(async ({ data }): Promise<Question | null> => {
    const db = getAppDatabase();
    if (!db) return null;
    try {
      const raw = await getQuestionById(data.questionId, db);
      if (!raw) return null;
      return toFrontendQuestion(raw);
    } catch (err) {
      console.error("fetchQuestion failed:", err);
      return null;
    }
  });

/** Fetches paginated questions from D1 with filters. */
export const fetchCatalogQuestions = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as QuestionFilterOptions)
  .handler(async ({ data }) => {
    const db = getAppDatabase();
    if (!db) return { questions: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
    try {
      return await getQuestions(db, data);
    } catch (err) {
      console.error("fetchCatalogQuestions failed:", err);
      return { questions: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
    }
  });

/** Fetches subjects from D1. */
export const fetchCatalogSubjects = createServerFn({ method: "GET" }).handler(async () => {
  const db = getAppDatabase();
  if (!db) return [];
  try {
    return await getSubjects(db);
  } catch (err) {
    console.error("fetchCatalogSubjects failed:", err);
    return [];
  }
});
