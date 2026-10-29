/**
 * GATE Grind - Mock Exam & Paper Generator Engine
 * ===============================================
 * Generates official 65-question / 100-mark GATE simulations and custom tests
 * with exact sectional splits, timing controls, and complete scoring analytics.
 */

import type { D1Database } from "./db";
import { evaluateQuestionAttempt } from "./scoring";

/** Raw D1 row shape for mock exam question queries (includes joined subject/topic names). */
interface MockQuestionRow {
  id: string;
  external_code: string;
  question_type: string;
  marks: number;
  difficulty: string;
  question_html: string;
  correct_answer: string;
  options: string | Record<string, string>;
  has_image: number;
  is_mta: number | null;
  subject_name: string;
  topic_name: string;
  subject_slug: string;
}

export interface MockConfig {
  type: "full" | "subject" | "topic";
  subjectSlug?: string | undefined;
  topicSlug?: string | undefined;
  userId: string;
}

export interface GeneratedMockExam {
  id: string;
  title: string;
  type: string;
  totalQuestions: number;
  totalMarks: number;
  durationMinutes: number;
  questions: {
    section: "GA" | "CS";
    index: number;
    id: string;
    external_code: string;
    question_type: string;
    marks: number;
    difficulty: string;
    question_html: string;
    options: Record<string, string>;
    has_image: number;
    subject_name: string;
    topic_name: string;
  }[];
}

export async function generateMockExam(
  config: MockConfig,
  db: D1Database,
): Promise<GeneratedMockExam> {
  const mockId = `mock_${crypto.randomUUID().replace(/-/g, "")}`;

  if (config.type === "full") {
    // Official GATE Exam: 65 questions, 100 marks, 180 minutes
    // 1. General Aptitude (GA): 10 questions (5 1-mark, 5 2-mark)
    const ga1Mark = await db
      .prepare(
        `SELECT q.*, s.name as subject_name, t.name as topic_name
         FROM questions q
         JOIN subjects s ON q.subject_id = s.id
         JOIN topics t ON q.topic_id = t.id
         WHERE s.slug LIKE '%aptitude%' AND q.marks = 1.0
         ORDER BY RANDOM() LIMIT 5`,
      )
      .all<MockQuestionRow>();

    const ga2Mark = await db
      .prepare(
        `SELECT q.*, s.name as subject_name, t.name as topic_name
         FROM questions q
         JOIN subjects s ON q.subject_id = s.id
         JOIN topics t ON q.topic_id = t.id
         WHERE s.slug LIKE '%aptitude%' AND q.marks = 2.0
         ORDER BY RANDOM() LIMIT 5`,
      )
      .all<MockQuestionRow>();

    // 2. Core CS & Math: 55 questions (25 1-mark, 30 2-mark)
    const cs1Mark = await db
      .prepare(
        `SELECT q.*, s.name as subject_name, t.name as topic_name
         FROM questions q
         JOIN subjects s ON q.subject_id = s.id
         JOIN topics t ON q.topic_id = t.id
         WHERE s.slug NOT LIKE '%aptitude%' AND q.marks = 1.0
         ORDER BY RANDOM() LIMIT 25`,
      )
      .all<MockQuestionRow>();

    const cs2Mark = await db
      .prepare(
        `SELECT q.*, s.name as subject_name, t.name as topic_name
         FROM questions q
         JOIN subjects s ON q.subject_id = s.id
         JOIN topics t ON q.topic_id = t.id
         WHERE s.slug NOT LIKE '%aptitude%' AND q.marks = 2.0
         ORDER BY RANDOM() LIMIT 30`,
      )
      .all<MockQuestionRow>();

    const gaQuestions = [...ga1Mark.results, ...ga2Mark.results].map((q, idx) => ({
      section: "GA" as const,
      index: idx + 1,
      id: q.id,
      external_code: q.external_code,
      question_type: q.question_type,
      marks: q.marks,
      difficulty: q.difficulty,
      question_html: q.question_html,
      options: typeof q.options === "string" ? JSON.parse(q.options || "{}") : q.options || {},
      has_image: q.has_image,
      subject_name: q.subject_name,
      topic_name: q.topic_name,
    }));

    const csQuestions = [...cs1Mark.results, ...cs2Mark.results].map((q, idx) => ({
      section: "CS" as const,
      index: gaQuestions.length + idx + 1,
      id: q.id,
      external_code: q.external_code,
      question_type: q.question_type,
      marks: q.marks,
      difficulty: q.difficulty,
      question_html: q.question_html,
      options: typeof q.options === "string" ? JSON.parse(q.options || "{}") : q.options || {},
      has_image: q.has_image,
      subject_name: q.subject_name,
      topic_name: q.topic_name,
    }));

    const allQuestions = [...gaQuestions, ...csQuestions];

    // Record mock test shell in mocks table
    await db
      .prepare(
        `INSERT INTO mocks (id, user_id, title, config, status, total_marks, created_at)
         VALUES (?, ?, ?, ?, 'created', ?, datetime('now'))`,
      )
      .bind(
        mockId,
        config.userId,
        "GATE Full Length Mock Test",
        JSON.stringify({ duration_minutes: 180, total_questions: 65 }),
        100,
      )
      .run();

    return {
      id: mockId,
      title: "GATE Full Length Mock Test",
      type: "full",
      totalQuestions: allQuestions.length,
      totalMarks: 100,
      durationMinutes: 180,
      questions: allQuestions,
    };
  }

  // Subject or Topic Test fallback (e.g. 20 questions, 30 mins)
  const where = config.subjectSlug ? "WHERE s.slug = ?" : "WHERE 1=1";
  const params = config.subjectSlug ? [config.subjectSlug] : [];

  const rawQuestions = await db
    .prepare(
      `SELECT q.*, s.name as subject_name, t.name as topic_name
       FROM questions q
       JOIN subjects s ON q.subject_id = s.id
       JOIN topics t ON q.topic_id = t.id
       ${where}
       ORDER BY RANDOM() LIMIT 20`,
    )
    .bind(...params)
    .all<MockQuestionRow>();

  const questions = rawQuestions.results.map((q, idx) => ({
    section: "CS" as const,
    index: idx + 1,
    id: q.id,
    external_code: q.external_code,
    question_type: q.question_type,
    marks: q.marks,
    difficulty: q.difficulty,
    question_html: q.question_html,
    options: typeof q.options === "string" ? JSON.parse(q.options || "{}") : q.options || {},
    has_image: q.has_image,
    subject_name: q.subject_name,
    topic_name: q.topic_name,
  }));

  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);

  await db
    .prepare(
      `INSERT INTO mocks (id, user_id, title, config, status, total_marks, created_at)
       VALUES (?, ?, ?, ?, 'created', ?, datetime('now'))`,
    )
    .bind(
      mockId,
      config.userId,
      `Subject Test: ${config.subjectSlug || "Mixed"}`,
      JSON.stringify({ duration_minutes: 45, total_questions: questions.length }),
      totalMarks,
    )
    .run();

  return {
    id: mockId,
    title: `Subject Test: ${config.subjectSlug || "Mixed"}`,
    type: config.type,
    totalQuestions: questions.length,
    totalMarks,
    durationMinutes: 45,
    questions,
  };
}

export interface MockSubmissionInput {
  mockId: string;
  userId: string;
  timeTakenSeconds: number;
  answers: Record<string, string>; // questionId -> candidateSelection
}

export interface MockEvaluationResult {
  mockId: string;
  score: number;
  maxScore: number;
  negativeMarks: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  accuracy: number;
  timeSpentSeconds: number;
  gaScore: number;
  csScore: number;
  questionResults: {
    questionId: string;
    selectedAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    marksAwarded: number;
    feedback: string;
  }[];
}

export async function evaluateMockSubmission(
  input: MockSubmissionInput,
  db: D1Database,
): Promise<MockEvaluationResult> {
  const { mockId, userId, timeTakenSeconds, answers } = input;
  const questionIds = Object.keys(answers);

  if (questionIds.length === 0) {
    throw new Error("No answers provided for evaluation.");
  }

  // Fetch all questions submitted
  const placeholders = questionIds.map(() => "?").join(",");
  const questionsRes = await db
    .prepare(
      `SELECT q.*, s.slug as subject_slug
       FROM questions q
       JOIN subjects s ON q.subject_id = s.id
       WHERE q.id IN (${placeholders})`,
    )
    .bind(...questionIds)
    .all<MockQuestionRow>();

  let totalScore = 0;
  let maxScore = 0;
  let negativeMarks = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unattemptedCount = 0;
  let gaScore = 0;
  let csScore = 0;

  const questionResults = [];

  for (const q of questionsRes.results) {
    const selected = answers[q.id] || "";
    const isAttempted = Boolean(selected.trim());
    maxScore += q.marks;

    const evalRes = evaluateQuestionAttempt({
      questionType: q.question_type,
      marks: q.marks,
      correctAnswer: q.correct_answer,
      isMta: Boolean(q.is_mta),
      selectedAnswer: selected,
    });

    totalScore += evalRes.marksAwarded;
    negativeMarks += evalRes.negativeMarks;

    const isGA = q.subject_slug.includes("aptitude");
    if (isGA) {
      gaScore += evalRes.marksAwarded;
    } else {
      csScore += evalRes.marksAwarded;
    }

    if (!isAttempted) {
      unattemptedCount += 1;
    } else if (evalRes.isCorrect) {
      correctCount += 1;
    } else {
      incorrectCount += 1;
    }

    // Record individual attempt in DB linked to mockId
    await db
      .prepare(
        `INSERT INTO attempts (id, user_id, question_id, selected_answer, is_correct, time_taken_seconds, mode, mock_id, attempted_at)
         VALUES (?, ?, ?, ?, ?, ?, 'mock', ?, datetime('now'))`,
      )
      .bind(
        `att_${crypto.randomUUID().replace(/-/g, "")}`,
        userId,
        q.id,
        selected,
        evalRes.isCorrect ? 1 : 0,
        Math.round(timeTakenSeconds / questionsRes.results.length),
        mockId,
      )
      .run();

    questionResults.push({
      questionId: q.id,
      selectedAnswer: selected,
      correctAnswer: q.correct_answer,
      isCorrect: evalRes.isCorrect,
      marksAwarded: evalRes.marksAwarded,
      feedback: evalRes.feedback,
    });
  }

  // Update mock record in DB
  const finalScore = Math.max(0, parseFloat(totalScore.toFixed(2)));
  const totalAttempted = correctCount + incorrectCount;
  const accuracy = totalAttempted > 0 ? Math.round((correctCount / totalAttempted) * 100) : 0;

  await db
    .prepare(
      `UPDATE mocks
       SET score = ?, status = 'completed', completed_at = datetime('now')
       WHERE id = ?`,
    )
    .bind(finalScore, mockId)
    .run();

  return {
    mockId,
    score: finalScore,
    maxScore,
    negativeMarks: parseFloat(negativeMarks.toFixed(2)),
    correctCount,
    incorrectCount,
    unattemptedCount,
    accuracy,
    timeSpentSeconds: timeTakenSeconds,
    gaScore: parseFloat(gaScore.toFixed(2)),
    csScore: parseFloat(csScore.toFixed(2)),
    questionResults,
  };
}
