import { describe, expect, it } from "vitest";
import { aptitudeConcepts, mocks, papers } from "../data/catalog";
import { aptitudeQuestions, questionById, questions } from "../data/questions";
import { matchesSubject, matchesTopic, subjects } from "../data/subjects";

describe("curated question catalog", () => {
  it("labels every imported question from the embedded source link", () => {
    expect(questions).toHaveLength(3541);
    expect(
      questions.every(
        (question) =>
          question.sourcePaper && question.sourceUrl?.startsWith("https://gateoverflow.in/"),
      ),
    ).toBe(true);
    expect(questions.filter((question) => question.sourcePaper === "CSE")).toHaveLength(3185);
    expect(questions.filter((question) => question.sourcePaper === "IT")).toHaveLength(356);
    expect(
      questions.every(
        (question) => question.sourcePaper === "CSE" || question.sourcePaper === "IT",
      ),
    ).toBe(true);
  });

  it("keeps every paper scoped to its exact source year and set", () => {
    for (const paper of papers) {
      expect(paper.questionIds.length).toBeGreaterThan(0);
      expect(["PRACTICE", "UGCNET", "DS&AI SAMPLE", "unclassified"]).not.toContain(
        paper.sourcePaper,
      );
      expect(
        paper.questionIds.every((id) => {
          const question = questionById(id);
          return (
            question?.year === paper.year &&
            (question.set ?? undefined) === paper.set &&
            question.sourcePaper === paper.sourcePaper
          );
        }),
      ).toBe(true);
    }
  });

  it("builds full mocks with the official 65-question, 100-mark distribution", () => {
    for (const mock of mocks.filter((mock) => mock.category === "Full Length")) {
      const selected = mock.questionIds.map((id) => questionById(id)!);
      expect(selected).toHaveLength(65);
      expect(selected.reduce((sum, question) => sum + question.marks, 0)).toBe(100);
      expect(selected.filter((question) => question.subjectId === "general-aptitude")).toHaveLength(
        10,
      );
      expect(selected.every((question) => question.sourcePaper === "CSE")).toBe(true);
    }
  });

  it("only links aptitude concepts to curated general-aptitude questions", () => {
    for (const concept of aptitudeConcepts) {
      expect(
        concept.questionIds.every((id) => questionById(id)?.subjectId === "general-aptitude"),
      ).toBe(true);
    }
  });

  it("keeps aptitude pages and drills within the General Aptitude PYQ subset", () => {
    expect(aptitudeQuestions).toHaveLength(269);
    expect(aptitudeQuestions.every((question) => question.subjectId === "general-aptitude")).toBe(
      true,
    );
    const aptitudeDrill = mocks.find((mock) => mock.id === "apt-1")!;
    expect(
      aptitudeDrill.questionIds.every((id) => questionById(id)?.subjectId === "general-aptitude"),
    ).toBe(true);
  });

  it("scopes a practice navigator to the current question's subject and topic", () => {
    const current = questionById("q_vol2_3_12_15")!;
    const navigator = questions.filter(
      (question) =>
        question.subjectId === current.subjectId && question.topicId === current.topicId,
    );

    expect(navigator).toContainEqual(current);
    expect(navigator.length).toBeGreaterThan(0);
    expect(navigator.length).toBeLessThan(questions.length);
  });

  it("preserves the complete source content for corrected multi-column questions", () => {
    const question = questionById("q_vol2_3_12_13")!;
    expect(question.body).toContain("stack $S$ and a queue $Q$");
    expect(question.options).toEqual([
      { id: "A", text: "$1S, 2Q, 3S, 4S, 5Q$" },
      { id: "B", text: "$1Q, 2Q, 3S, 4S, 5Q$" },
      { id: "C", text: "$1Q, 2Q, 3Q, 4S, 5S$" },
      { id: "D", text: "$1S, 2S, 3S, 4Q, 5Q$" },
    ]);
    expect(question.answer).toEqual(["A", "B"]);
  });

  it("removes PDF page furniture and preserves structured code in corrected questions", () => {
    const question = questionById("q_vol2_3_12_15")!;
    expect(question.body).not.toContain("Practice Tests");
    expect(question.body).not.toContain("3.13");
    expect(question.body).toContain("(i) $\\operatorname{isEmpty}(Q)$");
    expect(question.body).toContain("otherwise.\n\n(ii)");
    expect(question.code?.source).toContain("if (!isEmpty(Q))");
    expect(question.options).toHaveLength(4);
  });

  it("promotes extracted source snippets to code blocks across the imported bank", () => {
    const question = questionById("q_vol2_5_7_8")!;
    expect(question.body).toContain("Consider the following program in C");
    expect(question.body).not.toContain("#include <stdio.h>");
    expect(question.body).not.toContain("Parameter Passing (12)");
    expect(question.code?.source).toContain("void func(int i, int j)");
    expect(question.code?.source).toContain("int main()");
  });

  it("makes every Browse subject and topic link resolve against the full bank", () => {
    for (const subject of subjects) {
      expect(questions.some((q) => matchesSubject(q.subjectId, subject.id))).toBe(true);
      for (const topic of subject.topics) {
        const found = questions.some(
          (q) =>
            matchesSubject(q.subjectId, subject.id) &&
            matchesTopic(q.topicId, topic.id, subject.id),
        );
        expect(found, `${subject.id}/${topic.id}`).toBe(true);
      }
    }
  });
});
