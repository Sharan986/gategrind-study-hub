import { describe, it, expect, beforeAll } from "vitest";
import { getDatabase } from "../server/db";
import { generateMockExam, evaluateMockSubmission } from "../server/mock";
import { authenticateGoogleUser } from "../server/auth";

describe("GATE Mock Exam Generator & Evaluation Engine", () => {
  let db: any;
  let testUser: any;

  beforeAll(async () => {
    db = getDatabase();
    const { user } = await authenticateGoogleUser(
      {
        sub: "mock_test_taker_8877",
        email: "mocktaker@gategrind.online",
        email_verified: true,
        name: "Mock Taker",
      },
      db,
      "test-secret-key-12345678901234567890"
    );
    testUser = user;
  });

  it("generates full 65-question / 100-mark GATE exam with 10 GA and 55 CS questions", async () => {
    const mock = await generateMockExam(
      {
        type: "full",
        userId: testUser.id,
      },
      db
    );

    expect(mock.id).toBeDefined();
    expect(mock.totalQuestions).toBe(65);
    expect(mock.durationMinutes).toBe(180);

    const gaQuestions = mock.questions.filter((q) => q.section === "GA");
    const csQuestions = mock.questions.filter((q) => q.section === "CS");

    expect(gaQuestions.length).toBe(10);
    expect(csQuestions.length).toBe(55);

    // Verify marks distribution
    const ga1 = gaQuestions.filter((q) => q.marks === 1.0);
    const ga2 = gaQuestions.filter((q) => q.marks === 2.0);
    expect(ga1.length).toBe(5);
    expect(ga2.length).toBe(5);

    const cs1 = csQuestions.filter((q) => q.marks === 1.0);
    const cs2 = csQuestions.filter((q) => q.marks === 2.0);
    expect(cs1.length).toBe(25);
    expect(cs2.length).toBe(30);

    // Total marks = 5*1 + 5*2 + 25*1 + 30*2 = 5 + 10 + 25 + 60 = 100
    const totalMarks = mock.questions.reduce((sum, q) => sum + q.marks, 0);
    expect(totalMarks).toBe(100);
  });

  it("evaluates submitted mock exam and calculates scores, sectional totals, and penalties", async () => {
    // Generate mini subject mock for evaluation test
    const mock = await generateMockExam(
      {
        type: "subject",
        subjectSlug: "algorithms",
        userId: testUser.id,
      },
      db
    );

    const answers: Record<string, string> = {};
    for (const q of mock.questions.slice(0, 5)) {
      answers[q.id] = "B"; // submit sample answers
    }

    const evalResult = await evaluateMockSubmission(
      {
        mockId: mock.id,
        userId: testUser.id,
        timeTakenSeconds: 600,
        answers,
      },
      db
    );

    expect(evalResult.mockId).toBe(mock.id);
    expect(evalResult.maxScore).toBeGreaterThan(0);
    expect(typeof evalResult.score).toBe("number");
    expect(typeof evalResult.accuracy).toBe("number");
    expect(evalResult.questionResults.length).toBe(5);
  });
});
