import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { mergeQuestionRepair } from "../data/question-repairs";
import type { Question } from "../lib/types";

describe("field-level question repairs", () => {
  it("merges only the verified repair fields and leaves the baseline file unchanged", () => {
    const baselinePath = resolve(process.cwd(), "src/data/d1-questions.json");
    const baselineBefore = readFileSync(baselinePath);
    const question: Question = {
      id: "q_vol2_3_12_15",
      subjectId: "algo",
      topicId: "queues",
      year: 1999,
      number: 15,
      type: "MCQ",
      marks: 1,
      difficulty: "Easy",
      body: "Extracted body",
      options: [{ id: "A", text: "Extracted option" }],
      answer: ["B"],
      solution: "Existing solution",
    };

    const repaired = mergeQuestionRepair(question);

    expect(repaired.body).toContain("implementation of a queue");
    expect(repaired.options).toHaveLength(4);
    expect(repaired.code?.source).toContain("f(queue Q)");
    expect(repaired.solution).toBe("Existing solution");
    expect(createHash("sha256").update(readFileSync(baselinePath)).digest("hex")).toBe(
      createHash("sha256").update(baselineBefore).digest("hex"),
    );
  });

  it("uses the versioned repair ledger rather than a separate hard-coded map", () => {
    const question: Question = {
      id: "q_vol1_3_3_34",
      subjectId: "dm",
      topicId: "propositional-logic",
      year: 2000,
      number: 34,
      type: "MCQ",
      marks: 1,
      difficulty: "Medium",
      body: "Existing body",
      options: [{ id: "A", text: "Broken option" }],
      answer: ["A"],
      solution: "Existing solution",
    };

    const repaired = mergeQuestionRepair(question);

    expect(repaired.options).toEqual([
      { id: "A", text: "a tautology" },
      { id: "B", text: "a contradiction" },
      { id: "C", text: "always TRUE when $p$ is FALSE" },
      { id: "D", text: "always TRUE when $q$ is TRUE" },
    ]);
    expect(repaired.body).toBe("Existing body");
  });
});
