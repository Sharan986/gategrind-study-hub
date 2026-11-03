import { describe, expect, it } from "vitest";
import { questionById, scoreFor } from "@/data/questions";

describe("GATE marking", () => {
  it("1-mark MCQ wrong answer costs 1/3", () => {
    expect(scoreFor(questionById("q1")!, ["A"])).toBeCloseTo(-1 / 3);
  });
  it("2-mark MCQ wrong answer costs 2/3", () => {
    expect(scoreFor(questionById("q15")!, ["A"])).toBeCloseTo(-2 / 3);
  });
  it("MSQ wrong answer has no negative marks", () => {
    expect(scoreFor(questionById("q3")!, ["A"])).toBe(0);
  });
  it("NAT correct gives full marks", () => {
    expect(scoreFor(questionById("q2")!, "13")).toBe(2);
  });
  it("unanswered scores zero", () => {
    expect(scoreFor(questionById("q1")!, undefined)).toBe(0);
  });
});
