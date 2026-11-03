import { describe, it, expect } from "vitest";
import { evaluateQuestionAttempt } from "../server/scoring";

describe("GATE Scoring Engine", () => {
  describe("MCQ Grading", () => {
    it("awards +1.0 for correct 1-mark MCQ and penalizes -0.33 for incorrect", () => {
      const correct = evaluateQuestionAttempt({
        questionType: "MCQ",
        marks: 1.0,
        correctAnswer: "B",
        selectedAnswer: "B",
      });
      expect(correct.isCorrect).toBe(true);
      expect(correct.marksAwarded).toBe(1.0);
      expect(correct.negativeMarks).toBe(0);

      const wrong = evaluateQuestionAttempt({
        questionType: "MCQ",
        marks: 1.0,
        correctAnswer: "B",
        selectedAnswer: "C",
      });
      expect(wrong.isCorrect).toBe(false);
      expect(wrong.marksAwarded).toBeCloseTo(-1 / 3, 4);
      expect(wrong.negativeMarks).toBeCloseTo(1 / 3, 4);
    });

    it("awards +2.0 for correct 2-mark MCQ and penalizes -0.67 for incorrect", () => {
      const correct = evaluateQuestionAttempt({
        questionType: "MCQ",
        marks: 2.0,
        correctAnswer: "D",
        selectedAnswer: "D",
      });
      expect(correct.isCorrect).toBe(true);
      expect(correct.marksAwarded).toBe(2.0);

      const wrong = evaluateQuestionAttempt({
        questionType: "MCQ",
        marks: 2.0,
        correctAnswer: "D",
        selectedAnswer: "A",
      });
      expect(wrong.isCorrect).toBe(false);
      expect(wrong.marksAwarded).toBeCloseTo(-2 / 3, 4);
      expect(wrong.negativeMarks).toBeCloseTo(2 / 3, 4);
    });

    it("awards 0 marks for unattempted MCQ", () => {
      const unattempted = evaluateQuestionAttempt({
        questionType: "MCQ",
        marks: 1.0,
        correctAnswer: "A",
        selectedAnswer: "",
      });
      expect(unattempted.isCorrect).toBe(false);
      expect(unattempted.marksAwarded).toBe(0);
      expect(unattempted.negativeMarks).toBe(0);
    });
  });

  describe("MSQ Grading (Multiple Select)", () => {
    it("awards full marks only when ALL correct options are selected and NO incorrect", () => {
      const correct = evaluateQuestionAttempt({
        questionType: "MSQ",
        marks: 2.0,
        correctAnswer: "A;C;D",
        selectedAnswer: "A;C;D",
      });
      expect(correct.isCorrect).toBe(true);
      expect(correct.marksAwarded).toBe(2.0);
      expect(correct.negativeMarks).toBe(0);
    });

    it("awards 0 marks with ZERO negative marking for partial or wrong MSQ", () => {
      // Partial attempt (only A;C chosen, D missing)
      const partial = evaluateQuestionAttempt({
        questionType: "MSQ",
        marks: 2.0,
        correctAnswer: "A;C;D",
        selectedAnswer: "A;C",
      });
      expect(partial.isCorrect).toBe(false);
      expect(partial.marksAwarded).toBe(0);
      expect(partial.negativeMarks).toBe(0);

      // Wrong option included (B chosen)
      const wrong = evaluateQuestionAttempt({
        questionType: "MSQ",
        marks: 2.0,
        correctAnswer: "A;C;D",
        selectedAnswer: "A;B;C;D",
      });
      expect(wrong.isCorrect).toBe(false);
      expect(wrong.marksAwarded).toBe(0);
      expect(wrong.negativeMarks).toBe(0);
    });
  });

  describe("NAT Grading (Numerical Answer Type)", () => {
    it("accepts exact integers and decimal numbers within range with ZERO negative marking", () => {
      // Exact number
      const exact = evaluateQuestionAttempt({
        questionType: "NAT",
        marks: 1.0,
        correctAnswer: "7",
        selectedAnswer: "7.0",
      });
      expect(exact.isCorrect).toBe(true);
      expect(exact.marksAwarded).toBe(1.0);
      expect(exact.negativeMarks).toBe(0);

      // Range [195, 195]
      const range = evaluateQuestionAttempt({
        questionType: "NAT",
        marks: 2.0,
        correctAnswer: "147.0:148.5",
        selectedAnswer: "147.8",
      });
      expect(range.isCorrect).toBe(true);
      expect(range.marksAwarded).toBe(2.0);

      // Outside range
      const outside = evaluateQuestionAttempt({
        questionType: "NAT",
        marks: 2.0,
        correctAnswer: "147.0:148.5",
        selectedAnswer: "150.0",
      });
      expect(outside.isCorrect).toBe(false);
      expect(outside.marksAwarded).toBe(0);
      expect(outside.negativeMarks).toBe(0);
    });
  });

  describe("MTA Grading (Marks to All)", () => {
    it("awards full marks regardless of candidate submission for MTA questions", () => {
      const mta = evaluateQuestionAttempt({
        questionType: "MCQ",
        marks: 2.0,
        correctAnswer: "X",
        isMta: true,
        selectedAnswer: "",
      });
      expect(mta.isCorrect).toBe(true);
      expect(mta.marksAwarded).toBe(2.0);
      expect(mta.isMta).toBe(true);
    });
  });
});
