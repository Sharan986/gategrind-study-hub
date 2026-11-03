/**
 * GATE Grind - Authoritative GATE Scoring Engine
 * ==============================================
 * Implements official GATE grading rules across all question types:
 * - MCQ: +1.0 or +2.0 for correct. Negative marking: -1/3 for 1-mark, -2/3 for 2-mark.
 * - MSQ: Full marks ONLY if ALL correct options chosen & zero incorrect chosen. NO negative marking.
 * - NAT: Full marks if candidate answer is within [min, max] range. NO negative marking.
 * - MTA: Marks to All. Full marks awarded.
 * - DESCRIPTIVE: Practice / self-assessment mode.
 */

export interface QuestionEvaluationInput {
  questionType: "MCQ" | "MSQ" | "NAT" | "DESCRIPTIVE" | string;
  marks: number;
  correctAnswer: string; // e.g. "B", "A;C", "195:195", "X", "N/A"
  isMta?: boolean | number;
  selectedAnswer: string; // Candidate submission, e.g. "B", "A;C", "195.0", ""
}

export interface QuestionEvaluationResult {
  isCorrect: boolean;
  marksAwarded: number;
  maxMarks: number;
  negativeMarks: number;
  isMta: boolean;
  feedback: string;
}

export function evaluateQuestionAttempt(
  input: QuestionEvaluationInput
): QuestionEvaluationResult {
  const { questionType, marks, correctAnswer, isMta, selectedAnswer } = input;
  const maxMarks = Number(marks) || 1.0;
  const isCancelled = Boolean(isMta) || correctAnswer === "X";

  // Case 1: MTA (Marks to All)
  if (isCancelled) {
    return {
      isCorrect: true,
      marksAwarded: maxMarks,
      maxMarks,
      negativeMarks: 0,
      isMta: true,
      feedback: "Marks to All (MTA): Full marks awarded to all candidates.",
    };
  }

  const trimmedSelection = (selectedAnswer ?? "").trim();

  // Case 2: Unattempted
  if (!trimmedSelection) {
    return {
      isCorrect: false,
      marksAwarded: 0,
      maxMarks,
      negativeMarks: 0,
      isMta: false,
      feedback: "Unattempted.",
    };
  }

  // Case 3: MCQ (Single Choice)
  if (questionType === "MCQ") {
    const isCorrect = trimmedSelection.toUpperCase() === correctAnswer.trim().toUpperCase();
    if (isCorrect) {
      return {
        isCorrect: true,
        marksAwarded: maxMarks,
        maxMarks,
        negativeMarks: 0,
        isMta: false,
        feedback: `Correct! Full marks awarded (+${maxMarks}).`,
      };
    } else {
      const penalty = maxMarks === 2.0 ? 2 / 3 : 1 / 3;
      return {
        isCorrect: false,
        marksAwarded: -penalty,
        maxMarks,
        negativeMarks: penalty,
        isMta: false,
        feedback: `Incorrect. Correct answer is (${correctAnswer.trim().toUpperCase()}). Negative marking (-${penalty.toFixed(2)}).`,
      };
    }
  }

  // Case 4: MSQ (Multiple Select)
  if (questionType === "MSQ") {
    const expectedSet = new Set(
      correctAnswer
        .split(";")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    );

    const selectedSet = new Set(
      trimmedSelection
        .split(";")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    );

    // Official GATE Rule: FULL MARKS ONLY IF ALL CORRECT AND NO WRONG. ZERO NEGATIVE.
    let isExactMatch = expectedSet.size === selectedSet.size;
    if (isExactMatch) {
      for (const opt of expectedSet) {
        if (!selectedSet.has(opt)) {
          isExactMatch = false;
          break;
        }
      }
    }

    if (isExactMatch) {
      return {
        isCorrect: true,
        marksAwarded: maxMarks,
        maxMarks,
        negativeMarks: 0,
        isMta: false,
        feedback: `Correct! All correct options selected (+${maxMarks}).`,
      };
    } else {
      const correctStr = Array.from(expectedSet).sort().join(", ");
      return {
        isCorrect: false,
        marksAwarded: 0,
        maxMarks,
        negativeMarks: 0,
        isMta: false,
        feedback: `Incorrect. Correct combination is [${correctStr}]. No negative marking for MSQ.`,
      };
    }
  }

  // Case 5: NAT (Numerical Answer Type)
  if (questionType === "NAT") {
    const candidateVal = parseFloat(trimmedSelection);
    if (isNaN(candidateVal)) {
      return {
        isCorrect: false,
        marksAwarded: 0,
        maxMarks,
        negativeMarks: 0,
        isMta: false,
        feedback: "Invalid numeric input. Expected a valid number.",
      };
    }

    let minVal = 0;
    let maxVal = 0;
    if (correctAnswer.includes(":")) {
      const parts = correctAnswer.split(":");
      minVal = parseFloat((parts[0] ?? "").trim());
      maxVal = parseFloat((parts[1] ?? "").trim());
    } else {
      const single = parseFloat(correctAnswer.trim());
      minVal = single;
      maxVal = single;
    }

    // Allow precision tolerance of 1e-4 for float rounding
    const inRange = candidateVal >= minVal - 1e-4 && candidateVal <= maxVal + 1e-4;

    if (inRange) {
      return {
        isCorrect: true,
        marksAwarded: maxMarks,
        maxMarks,
        negativeMarks: 0,
        isMta: false,
        feedback: `Correct! Entered value ${candidateVal} is within the acceptable range [${minVal}, ${maxVal}]. (+${maxMarks}).`,
      };
    } else {
      const rangeStr = minVal === maxVal ? `${minVal}` : `[${minVal} to ${maxVal}]`;
      return {
        isCorrect: false,
        marksAwarded: 0,
        maxMarks,
        negativeMarks: 0,
        isMta: false,
        feedback: `Incorrect. Correct answer range is ${rangeStr}. No negative marking for NAT.`,
      };
    }
  }

  // Case 6: Descriptive / Practice questions
  return {
    isCorrect: true,
    marksAwarded: maxMarks,
    maxMarks,
    negativeMarks: 0,
    isMta: false,
    feedback: "Descriptive question completed.",
  };
}
