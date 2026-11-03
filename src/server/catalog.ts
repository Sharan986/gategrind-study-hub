/**
 * GATE Grind - Catalog & Question Query Engine
 * ============================================
 * Provides rich filtering, pagination, and user progress joins for subjects,
 * topics, and 3,823 questions in Cloudflare D1.
 */

import type { D1Database } from "./db";

/** Raw D1 row shape returned from joins in catalog queries — extends QuestionListItem with raw field types before post-processing. */
interface RawQuestionRow {
  id: string;
  external_code: string;
  subject_id: string;
  subject_name: string;
  subject_slug: string;
  topic_id: string;
  topic_name: string;
  topic_slug: string;
  gate_year: number | null;
  gate_set: string | null;
  gate_question_number: string | null;
  question_type: string;
  marks: number;
  difficulty: string;
  question_html: string;
  options: string | Record<string, string>;
  has_image: number;
  tags: string;
  // Optional user-context fields (present when userId is provided)
  user_attempted?: number | boolean | null;
  user_is_correct?: number | null;
  is_bookmarked?: number | boolean | null;
}

/** Raw D1 row for a single question detail (includes all q.* columns + joins). */
interface RawQuestionDetailRow {
  id: string;
  external_code: string;
  subject_id: string;
  subject_name: string;
  subject_slug: string;
  topic_id: string;
  topic_name: string;
  topic_slug: string;
  gate_year: number | null;
  gate_set: string | null;
  gate_question_number: string | null;
  question_type: string;
  marks: number;
  difficulty: string;
  question_html: string;
  correct_answer: string;
  explanation_html: string | null;
  options: string | Record<string, string>;
  has_image: number;
  tags: string;
  is_mta: number | null;
}

export type QuestionDetailItem = Omit<RawQuestionDetailRow, "tags" | "options"> & {
  options: Record<string, string>;
  tags: string[];
  userAttempt: RawAttemptRow | null;
  isBookmarked: boolean;
};

/** Raw D1 row for attempt lookup. */
interface RawAttemptRow {
  id: string;
  user_id: string;
  question_id: string;
  selected_answer: string;
  is_correct: number;
  time_taken_seconds: number;
  attempted_at: string;
}

/** Raw D1 row for PYQ year aggregation. */
interface RawYearRow {
  year: number;
  total_questions: number;
  sets_str: string | null;
}

export interface SubjectItem {
  id: string;
  name: string;
  slug: string;
  code?: string | undefined;
  description?: string | undefined;
  icon?: string | undefined;
  weightage_marks: number;
  total_questions: number;
  attempted_count?: number | undefined;
  correct_count?: number | undefined;
  progress_percentage?: number | undefined;
}

export interface TopicItem {
  id: string;
  subject_id: string;
  name: string;
  slug: string;
  total_questions: number;
  attempted_count?: number | undefined;
  correct_count?: number | undefined;
}

export interface QuestionFilterOptions {
  subjectSlug?: string | undefined;
  topicSlug?: string | undefined;
  year?: number | undefined;
  difficulty?: "easy" | "normal" | "hard" | string | undefined;
  questionType?: "MCQ" | "MSQ" | "NAT" | "DESCRIPTIVE" | string | undefined;
  marks?: number | undefined;
  status?: "all" | "attempted" | "unattempted" | "correct" | "incorrect" | "bookmarked" | undefined;
  search?: string | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
  userId?: string | undefined;
}

export interface QuestionListItem {
  id: string;
  external_code: string;
  subject_id: string;
  subject_name: string;
  subject_slug: string;
  topic_id: string;
  topic_name: string;
  topic_slug: string;
  gate_year: number | null;
  gate_set: string | null;
  gate_question_number: string | null;
  question_type: string;
  marks: number;
  difficulty: string;
  question_html: string;
  options: Record<string, string>;
  has_image: number;
  tags: string[];
  user_attempted?: boolean | undefined;
  user_is_correct?: boolean | undefined;
  is_bookmarked?: boolean | undefined;
}

export async function getSubjects(db: D1Database, userId?: string): Promise<SubjectItem[]> {
  if (!userId) {
    const res = await db
      .prepare("SELECT * FROM subjects ORDER BY sort_order ASC, name ASC")
      .all<SubjectItem>();
    return res.results;
  }

  // Join attempts to calculate user progress
  const query = `
    SELECT 
      s.*,
      COUNT(DISTINCT a.question_id) as attempted_count,
      SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) as correct_count
    FROM subjects s
    LEFT JOIN questions q ON q.subject_id = s.id
    LEFT JOIN attempts a ON a.question_id = q.id AND a.user_id = ?
    GROUP BY s.id
    ORDER BY s.sort_order ASC, s.name ASC
  `;

  const res = await db.prepare(query).bind(userId).all<SubjectItem>();
  return res.results.map((r) => {
    const attempted = Number(r.attempted_count) || 0;
    const total = Number(r.total_questions) || 1;
    return {
      ...r,
      attempted_count: attempted,
      correct_count: Number(r.correct_count) || 0,
      progress_percentage: Math.min(100, Math.round((attempted / total) * 100)),
    };
  });
}

export async function getSubjectBySlug(slug: string, db: D1Database): Promise<SubjectItem | null> {
  const res = await db
    .prepare("SELECT * FROM subjects WHERE slug = ?")
    .bind(slug)
    .first<SubjectItem>();
  return res;
}

export async function getTopicsBySubjectSlug(
  subjectSlug: string,
  db: D1Database,
  userId?: string,
): Promise<TopicItem[]> {
  const subject = await getSubjectBySlug(subjectSlug, db);
  if (!subject) return [];

  if (!userId) {
    const res = await db
      .prepare("SELECT * FROM topics WHERE subject_id = ? ORDER BY sort_order ASC, name ASC")
      .bind(subject.id)
      .all<TopicItem>();
    return res.results;
  }

  const query = `
    SELECT 
      t.*,
      COUNT(DISTINCT a.question_id) as attempted_count,
      SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) as correct_count
    FROM topics t
    LEFT JOIN questions q ON q.topic_id = t.id
    LEFT JOIN attempts a ON a.question_id = q.id AND a.user_id = ?
    WHERE t.subject_id = ?
    GROUP BY t.id
    ORDER BY t.sort_order ASC, t.name ASC
  `;

  const res = await db.prepare(query).bind(userId, subject.id).all<TopicItem>();
  return res.results.map((r) => ({
    ...r,
    attempted_count: Number(r.attempted_count) || 0,
    correct_count: Number(r.correct_count) || 0,
  }));
}

export async function getQuestions(
  db: D1Database,
  options: QuestionFilterOptions = {},
): Promise<{
  questions: QuestionListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const {
    subjectSlug,
    topicSlug,
    year,
    difficulty,
    questionType,
    marks,
    status = "all",
    search,
    page = 1,
    pageSize = 20,
    userId,
  } = options;

  const conditions: string[] = ["1=1"];
  const params: unknown[] = [];

  if (subjectSlug) {
    conditions.push("s.slug = ?");
    params.push(subjectSlug);
  }

  if (topicSlug) {
    conditions.push("t.slug = ?");
    params.push(topicSlug);
  }

  if (year) {
    conditions.push("q.gate_year = ?");
    params.push(year);
  }

  if (difficulty) {
    conditions.push("q.difficulty = ?");
    params.push(difficulty);
  }

  if (questionType) {
    conditions.push("q.question_type = ?");
    params.push(questionType);
  }

  if (marks) {
    conditions.push("q.marks = ?");
    params.push(marks);
  }

  if (search) {
    conditions.push("(q.question_html LIKE ? OR q.external_code LIKE ?)");
    const searchTerm = `%${search.trim()}%`;
    params.push(searchTerm, searchTerm);
  }

  if (userId && status !== "all") {
    if (status === "attempted") {
      conditions.push("a.id IS NOT NULL");
    } else if (status === "unattempted") {
      conditions.push("a.id IS NULL");
    } else if (status === "correct") {
      conditions.push("a.is_correct = 1");
    } else if (status === "incorrect") {
      conditions.push("a.is_correct = 0");
    } else if (status === "bookmarked") {
      conditions.push("b.id IS NOT NULL");
    }
  }

  const whereClause = conditions.join(" AND ");
  const limit = Math.min(100, Math.max(1, pageSize));
  const offset = (Math.max(1, page) - 1) * limit;

  const joinClause = userId
    ? `
      LEFT JOIN attempts a ON a.question_id = q.id AND a.user_id = '${userId.replace(/'/g, "''")}'
      LEFT JOIN bookmarks b ON b.question_id = q.id AND b.user_id = '${userId.replace(/'/g, "''")}'
    `
    : "";

  // 1. Count query
  const countQuery = `
    SELECT COUNT(DISTINCT q.id) as total
    FROM questions q
    JOIN subjects s ON q.subject_id = s.id
    JOIN topics t ON q.topic_id = t.id
    ${joinClause}
    WHERE ${whereClause}
  `;

  const countRow = await db
    .prepare(countQuery)
    .bind(...params)
    .first<{ total: number }>();
  const total = Number(countRow?.total) || 0;

  // 2. Data query
  const dataQuery = `
    SELECT 
      q.id,
      q.external_code,
      q.subject_id,
      s.name as subject_name,
      s.slug as subject_slug,
      q.topic_id,
      t.name as topic_name,
      t.slug as topic_slug,
      q.gate_year,
      q.gate_set,
      q.gate_question_number,
      q.question_type,
      q.marks,
      q.difficulty,
      q.question_html,
      q.options,
      q.has_image,
      q.tags
      ${userId ? ", (a.id IS NOT NULL) as user_attempted, a.is_correct as user_is_correct, (b.id IS NOT NULL) as is_bookmarked" : ""}
    FROM questions q
    JOIN subjects s ON q.subject_id = s.id
    JOIN topics t ON q.topic_id = t.id
    ${joinClause}
    WHERE ${whereClause}
    ORDER BY q.gate_year DESC NULLS LAST, q.gate_question_number ASC
    LIMIT ? OFFSET ?
  `;

  const queryParams = [...params, limit, offset];
  const res = await db
    .prepare(dataQuery)
    .bind(...queryParams)
    .all<RawQuestionRow>();

  const questions: QuestionListItem[] = res.results.map((row) => {
    let parsedOptions: Record<string, string> = {};
    try {
      parsedOptions = typeof row.options === "string" ? JSON.parse(row.options) : row.options || {};
    } catch {
      parsedOptions = {};
    }

    const tagsArr = typeof row.tags === "string" ? row.tags.split(",").filter(Boolean) : [];

    return {
      ...row,
      options: parsedOptions,
      tags: tagsArr,
      user_attempted: Boolean(row.user_attempted),
      user_is_correct: row.user_is_correct === 1,
      is_bookmarked: Boolean(row.is_bookmarked),
    };
  });

  return {
    questions,
    total,
    page: Math.max(1, page),
    pageSize: limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getQuestionById(
  questionId: string,
  db: D1Database,
  userId?: string,
): Promise<QuestionDetailItem | null> {
  const query = `
    SELECT 
      q.*,
      s.name as subject_name,
      s.slug as subject_slug,
      t.name as topic_name,
      t.slug as topic_slug
    FROM questions q
    JOIN subjects s ON q.subject_id = s.id
    JOIN topics t ON q.topic_id = t.id
    WHERE q.id = ? OR q.external_code = ?
  `;

  const q = await db.prepare(query).bind(questionId, questionId).first<RawQuestionDetailRow>();
  if (!q) return null;

  let optionsObj: Record<string, string> = {};
  try {
    optionsObj = typeof q.options === "string" ? JSON.parse(q.options) : q.options || {};
  } catch {
    optionsObj = {};
  }

  let userAttempt = null;
  let isBookmarked = false;

  if (userId) {
    const attempt = await db
      .prepare(
        "SELECT * FROM attempts WHERE user_id = ? AND question_id = ? ORDER BY attempted_at DESC LIMIT 1",
      )
      .bind(userId, q.id)
      .first<RawAttemptRow>();
    userAttempt = attempt;

    const bm = await db
      .prepare("SELECT id FROM bookmarks WHERE user_id = ? AND question_id = ?")
      .bind(userId, q.id)
      .first();
    isBookmarked = Boolean(bm);
  }

  return {
    ...q,
    options: optionsObj,
    tags: typeof q.tags === "string" ? q.tags.split(",").filter(Boolean) : [],
    userAttempt,
    isBookmarked,
  };
}

export async function getPastPaperYears(
  db: D1Database,
): Promise<{ year: number; total_questions: number; sets: string[] }[]> {
  const query = `
    SELECT 
      gate_year as year,
      COUNT(*) as total_questions,
      GROUP_CONCAT(DISTINCT gate_set) as sets_str
    FROM questions
    WHERE gate_year IS NOT NULL
    GROUP BY gate_year
    ORDER BY gate_year DESC
  `;

  const res = await db.prepare(query).all<RawYearRow>();
  return res.results.map((r) => ({
    year: Number(r.year),
    total_questions: Number(r.total_questions),
    sets: r.sets_str ? r.sets_str.split(",").filter(Boolean) : [],
  }));
}
