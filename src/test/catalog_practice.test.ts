import { describe, it, expect, beforeAll } from "vitest";
import { getDatabase, type D1Database } from "../server/db";
import { getSubjects, getQuestions, getQuestionById, getPastPaperYears } from "../server/catalog";
import { recordAttempt, toggleBookmark, getUserAnalytics } from "../server/practice";
import { authenticateGoogleUser, type UserProfile } from "../server/auth";

describe("Catalog, Practice & Analytics Services", () => {
  let db: D1Database;
  let testUser: UserProfile;

  beforeAll(async () => {
    db = getDatabase();
    const { user } = await authenticateGoogleUser(
      {
        sub: "test_candidate_12345",
        email: "candidate@gategrind.online",
        email_verified: true,
        name: "GATE Candidate",
      },
      db,
      "test-secret-key-12345678901234567890",
    );
    testUser = user;
  });

  it("loads 13 subjects with full question counts", async () => {
    const subjects = await getSubjects(db);
    expect(subjects.length).toBe(13);
    const totalQ = subjects.reduce((sum, s) => sum + s.total_questions, 0);
    expect(totalQ).toBe(3823);
  });

  it("filters questions by subject, year, question type, and marks", async () => {
    // Subject filter
    const algoRes = await getQuestions(db, { subjectSlug: "algorithms", pageSize: 10 });
    expect(algoRes.questions.length).toBe(10);
    expect(algoRes.total).toBe(358); // Exactly 358 questions in Algorithms chapter

    // Question type filter
    const natRes = await getQuestions(db, { questionType: "NAT", pageSize: 5 });
    expect(natRes.questions.every((q) => q.question_type === "NAT")).toBe(true);

    // Year filter
    const y2024Res = await getQuestions(db, { year: 2024, pageSize: 5 });
    expect(y2024Res.questions.every((q) => q.gate_year === 2024)).toBe(true);
  });

  it("retrieves individual question with parsed options and tags", async () => {
    const qList = await getQuestions(db, { pageSize: 1 });
    const firstQ = qList.questions[0];
    expect(firstQ).toBeDefined();

    const q = await getQuestionById(firstQ!.id, db, testUser.id);
    expect(q).not.toBeNull();
    expect(q!.id).toBe(firstQ!.id);
    expect(typeof q!.options).toBe("object");
    expect(Array.isArray(q!.tags)).toBe(true);
  });

  it("records attempts, calculates scores, updates streak, and reflects in analytics", async () => {
    const qList = await getQuestions(db, { pageSize: 2 });
    const q1 = qList.questions[0];
    expect(q1).toBeDefined();

    const result = await recordAttempt(
      {
        userId: testUser.id,
        questionId: q1!.id,
        selectedAnswer: "D",
        timeTakenSeconds: 45,
        mode: "study",
      },
      db,
    );

    expect(result.attemptId).toBeDefined();
    expect(typeof result.isCorrect).toBe("boolean");
    expect(result.streakDays).toBeGreaterThanOrEqual(1);

    // Toggle bookmark
    const bm1 = await toggleBookmark(testUser.id, q1!.id, db);
    expect(bm1.isBookmarked).toBe(true);
    const bm2 = await toggleBookmark(testUser.id, q1!.id, db);
    expect(bm2.isBookmarked).toBe(false);

    // Analytics
    const analytics = await getUserAnalytics(testUser.id, db);
    expect(analytics.totalAttempted).toBeGreaterThanOrEqual(1);
    expect(analytics.dailyGoal).toBe(15);
  });

  it("fetches all past paper years with counts", async () => {
    const years = await getPastPaperYears(db);
    expect(years.length).toBeGreaterThan(25);
    expect(years.some((y) => y.year === 2024)).toBe(true);
    expect(years.some((y) => y.year === 2015)).toBe(true);
  });
});
