import { describe, it, expect } from "vitest";
import { toFrontendQuestion, toFrontendSubject, toFrontendDifficulty } from "../server/adapter";

describe("D1 to Frontend Type Adapter", () => {
  it("converts D1 question record to exact frontend Question shape", () => {
    const d1Row = {
      id: "q_vol2_1_1_1",
      external_code: "vol2-1.1.1",
      subject_slug: "algorithms",
      topic_slug: "asymptotic-notations",
      gate_year: 2023,
      gate_set: "Set 1",
      gate_question_number: "14",
      question_type: "MCQ",
      marks: 2.0,
      difficulty: "hard",
      question_html: "What is the time complexity of the algorithm?",
      options: JSON.stringify({ A: "O(n)", B: "O(n log n)", C: "O(n^2)", D: "O(1)" }),
      correct_answer: "B",
      explanation_html: "By applying the master theorem case 2...",
      tags: "algorithms,master-theorem,hard",
    };

    const q = toFrontendQuestion(d1Row);
    expect(q.id).toBe("q_vol2_1_1_1");
    expect(q.subjectId).toBe("algorithms");
    expect(q.topicId).toBe("asymptotic-notations");
    expect(q.year).toBe(2023);
    expect(q.set).toBe(1);
    expect(q.number).toBe(14);
    expect(q.type).toBe("MCQ");
    expect(q.marks).toBe(2);
    expect(q.difficulty).toBe("Hard");
    expect(q.options?.length).toBe(4);
    expect(q.options?.[1]).toEqual({ id: "B", text: "O(n log n)" });
    expect(q.answer).toEqual(["B"]);
    expect(q.tags).toEqual(["algorithms", "master-theorem", "hard"]);
  });

  it("handles MSQ and NAT question shapes correctly", () => {
    // MSQ
    const msq = toFrontendQuestion({
      id: "q_msq",
      question_type: "MSQ",
      correct_answer: "A;C;D",
      marks: 2.0,
    });
    expect(msq.type).toBe("MSQ");
    expect(msq.answer).toEqual(["A", "C", "D"]);

    // NAT Range
    const nat = toFrontendQuestion({
      id: "q_nat",
      question_type: "NAT",
      correct_answer: "14.5 : 15.5",
      marks: 1.0,
    });
    expect(nat.type).toBe("NAT");
    expect(nat.answer).toEqual({ min: 14.5, max: 15.5 });
  });

  it("converts D1 subject and topics to frontend Subject shape", () => {
    const sub = toFrontendSubject(
      { slug: "algorithms", name: "Algorithms", weightage_marks: 8.5 },
      [{ slug: "sorting", name: "Sorting", total_questions: 42 }],
    );
    expect(sub.id).toBe("algorithms");
    expect(sub.name).toBe("Algorithms");
    expect(sub.topics[0]).toEqual({ id: "sorting", name: "Sorting", questionCount: 42 });
  });
});
