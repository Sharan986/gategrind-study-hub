/**
 * GATE Grind - User Practice, Attempts & Analytics Engine
 * ========================================================
 * Evaluates attempts, updates user streaks, tracks syllabus progress,
 * and detects weak areas for personalized preparation.
 */

import type { D1Database } from "./db";
import { evaluateQuestionAttempt, type QuestionEvaluationResult } from "./scoring";

export interface RecordAttemptInput {
  userId: string;
  questionId: string;
  selectedAnswer: string;
  timeTakenSeconds: number;
  mode?: "study" | "mock" | "paper";
  mockId?: string;
}

export interface AttemptSubmissionResult extends QuestionEvaluationResult {
  attemptId: string;
  correctAnswer: string;
  explanationHtml?: string;
  streakDays: number;
}

export async function recordAttempt(
  input: RecordAttemptInput,
  db: D1Database
): Promise<AttemptSubmissionResult> {
  const { userId, questionId, selectedAnswer, timeTakenSeconds = 0, mode = "study", mockId } = input;

  // 1. Fetch question from DB
  const q = await db
    .prepare("SELECT * FROM questions WHERE id = ?")
    .bind(questionId)
    .first<any>();

  if (!q) {
    throw new Error(`Question not found: ${questionId}`);
  }

  // 2. Evaluate with official GATE scoring engine
  const evalResult = evaluateQuestionAttempt({
    questionType: q.question_type,
    marks: q.marks,
    correctAnswer: q.correct_answer,
    isMta: q.is_mta,
    selectedAnswer,
  });

  const attemptId = `att_${crypto.randomUUID().replace(/-/g, "")}`;
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  // 3. Insert into attempts table
  await db
    .prepare(
      `INSERT INTO attempts (id, user_id, question_id, selected_answer, is_correct, time_taken_seconds, mode, mock_id, attempted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      attemptId,
      userId,
      questionId,
      selectedAnswer,
      evalResult.isCorrect ? 1 : 0,
      timeTakenSeconds,
      mode,
      mockId || null,
      now
    )
    .run();

  // 4. Update user streak in user_profiles
  const user = await db
    .prepare("SELECT last_active_date, streak_days FROM user_profiles WHERE id = ?")
    .bind(userId)
    .first<{ last_active_date: string | null; streak_days: number }>();

  let newStreak = 1;
  if (user) {
    const lastActive = user.last_active_date;
    const currentStreak = user.streak_days || 0;

    if (lastActive === today) {
      newStreak = currentStreak || 1;
    } else if (lastActive) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (lastActive === yesterday) {
        newStreak = currentStreak + 1;
      } else {
        newStreak = 1;
      }
    }

    await db
      .prepare("UPDATE user_profiles SET streak_days = ?, last_active_date = ?, updated_at = ? WHERE id = ?")
      .bind(newStreak, today, now, userId)
      .run();
  }

  // 5. Update syllabus progress table
  const progressId = `syl_${userId}_${q.topic_id}`;
  const status = evalResult.isCorrect ? "completed" : "in_progress";

  await db
    .prepare(
      `INSERT INTO syllabus_progress (id, user_id, topic_id, status, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, topic_id) DO UPDATE SET
         status = excluded.status,
         updated_at = excluded.updated_at`
    )
    .bind(progressId, userId, q.topic_id, status, now)
    .run();

  return {
    ...evalResult,
    attemptId,
    correctAnswer: q.correct_answer,
    explanationHtml: q.explanation_html || undefined,
    streakDays: newStreak,
  };
}

export async function toggleBookmark(
  userId: string,
  questionId: string,
  db: D1Database,
  note?: string
): Promise<{ isBookmarked: boolean }> {
  const existing = await db
    .prepare("SELECT id FROM bookmarks WHERE user_id = ? AND question_id = ?")
    .bind(userId, questionId)
    .first<{ id: string }>();

  if (existing) {
    await db.prepare("DELETE FROM bookmarks WHERE id = ?").bind(existing.id).run();
    return { isBookmarked: false };
  } else {
    const bmId = `bmk_${crypto.randomUUID().replace(/-/g, "")}`;
    await db
      .prepare("INSERT INTO bookmarks (id, user_id, question_id, notes) VALUES (?, ?, ?, ?)")
      .bind(bmId, userId, questionId, note || null)
      .run();
    return { isBookmarked: true };
  }
}

export interface UserAnalytics {
  totalAttempted: number;
  totalCorrect: number;
  accuracyPercentage: number;
  attemptedToday: number;
  dailyGoal: number;
  streakDays: number;
  subjectPerformance: {
    subjectName: string;
    subjectSlug: string;
    attempted: number;
    correct: number;
    accuracy: number;
  }[];
  weakTopics: {
    topicName: string;
    subjectName: string;
    attempted: number;
    accuracy: number;
  }[];
}

export async function getUserAnalytics(
  userId: string,
  db: D1Database
): Promise<UserAnalytics> {
  const today = new Date().toISOString().slice(0, 10);

  // 1. Overall stats
  const overallQuery = `
    SELECT 
      COUNT(*) as total_attempted,
      SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as total_correct,
      SUM(CASE WHEN attempted_at LIKE '${today}%' THEN 1 ELSE 0 END) as attempted_today
    FROM attempts
    WHERE user_id = ?
  `;
  const overall = await db.prepare(overallQuery).bind(userId).first<any>();

  // 2. User profile
  const profile = await db
    .prepare("SELECT daily_goal_questions, streak_days FROM user_profiles WHERE id = ?")
    .bind(userId)
    .first<any>();

  // 3. Subject performance
  const subQuery = `
    SELECT 
      s.name as subject_name,
      s.slug as subject_slug,
      COUNT(a.id) as attempted,
      SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) as correct
    FROM attempts a
    JOIN questions q ON a.question_id = q.id
    JOIN subjects s ON q.subject_id = s.id
    WHERE a.user_id = ?
    GROUP BY s.id
    ORDER BY attempted DESC
  `;
  const subRes = await db.prepare(subQuery).bind(userId).all<any>();

  // 4. Weak topics (accuracy < 50% with at least 3 attempts)
  const weakQuery = `
    SELECT 
      t.name as topic_name,
      s.name as subject_name,
      COUNT(a.id) as attempted,
      ROUND((SUM(CASE WHEN a.is_correct = 1 THEN 1.0 ELSE 0.0 END) / COUNT(a.id)) * 100) as accuracy
    FROM attempts a
    JOIN questions q ON a.question_id = q.id
    JOIN topics t ON q.topic_id = t.id
    JOIN subjects s ON q.subject_id = s.id
    WHERE a.user_id = ?
    GROUP BY t.id
    HAVING attempted >= 3 AND accuracy < 50
    ORDER BY accuracy ASC, attempted DESC
    LIMIT 5
  `;
  const weakRes = await db.prepare(weakQuery).bind(userId).all<any>();

  const totalAttempted = Number(overall?.total_attempted) || 0;
  const totalCorrect = Number(overall?.total_correct) || 0;

  return {
    totalAttempted,
    totalCorrect,
    accuracyPercentage: totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0,
    attemptedToday: Number(overall?.attempted_today) || 0,
    dailyGoal: profile?.daily_goal_questions || 15,
    streakDays: profile?.streak_days || 0,
    subjectPerformance: subRes.results.map((r) => {
      const att = Number(r.attempted) || 0;
      const cor = Number(r.correct) || 0;
      return {
        subjectName: r.subject_name,
        subjectSlug: r.subject_slug,
        attempted: att,
        correct: cor,
        accuracy: att > 0 ? Math.round((cor / att) * 100) : 0,
      };
    }),
    weakTopics: weakRes.results.map((r) => ({
      topicName: r.topic_name,
      subjectName: r.subject_name,
      attempted: Number(r.attempted),
      accuracy: Number(r.accuracy),
    })),
  };
}
