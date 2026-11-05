import { describe, expect, it } from "vitest";
import bankRaw from "../data/cse-it-question-bank.v1.json?raw";
import type { Question } from "../lib/types";

type Record = {
  key: string;
  source: { volume: string; page: number; url: string };
  quality: { status: "structurally-complete" | "needs-review"; issues: string[] };
  question: Question;
};
const bank = JSON.parse(bankRaw) as {
  scope: string[];
  counts: { total: number; structurallyComplete: number; needsReview: number };
  records: Record[];
};

describe("staged CSE/IT question bank", () => {
  it("has unique source identities and preserves both paper types", () => {
    expect(bank.scope).toEqual(["CSE", "IT"]);
    expect(bank.records).toHaveLength(bank.counts.total);
    expect(new Set(bank.records.map((record) => record.key)).size).toBe(bank.records.length);
    expect(new Set(bank.records.map((record) => record.question.id)).size).toBe(
      bank.records.length,
    );
    expect(
      bank.records.every(
        (record) =>
          ["CSE", "IT"].includes(record.question.sourcePaper ?? "") &&
          record.question.sourceUrl === record.source.url &&
          record.source.url.startsWith("https://gateoverflow.in/") &&
          record.source.page > 0,
      ),
    ).toBe(true);
  });

  it("never calls a record structurally complete while checks are outstanding", () => {
    const complete = bank.records.filter(
      (record) => record.quality.status === "structurally-complete",
    );
    expect(complete).toHaveLength(bank.counts.structurallyComplete);
    expect(bank.records.length - complete.length).toBe(bank.counts.needsReview);
    for (const record of complete) {
      expect(record.quality.issues).toEqual([]);
      const question = record.question;
      expect(question.body.trim()).not.toBe("");
      if (question.type === "NAT") {
        expect(Array.isArray(question.answer)).toBe(false);
      } else {
        const optionIds = question.options?.map((option) => option.id);
        expect(["ABCD", "ABCDE"]).toContain(optionIds?.join(""));
        expect((question.answer as string[]).every((answer) => optionIds?.includes(answer))).toBe(
          true,
        );
      }
    }
  });

  it("keeps an incomplete source question in review even after a body and option repair", () => {
    const record = bank.records.find((item) => item.key === "vol2:3.12.13");
    expect(record?.question.options).toHaveLength(4);
    expect(record?.quality.status).toBe("needs-review");
    expect(record?.quality.issues).toContain("diagram");
  });
});
