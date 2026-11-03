import { describe, expect, it } from "vitest";
import { mergeProgress, type ProgressRow } from "@/lib/sync";
import { computeAnalytics, computeStreak } from "@/lib/analytics";

const row = (kind: ProgressRow["kind"], key: string, payload: unknown, updatedAt: number): ProgressRow => ({ kind, key, payload, updatedAt });

describe("progress merge", () => {
  it("newest attempt wins per question", () => {
    const m = mergeProgress([row("attempt", "q1", { correct: true }, 200)], [row("attempt", "q1", { correct: false }, 100)]);
    expect(m).toHaveLength(1);
    expect(m[0]!.payload).toEqual({ correct: true });
  });
  it("keeps items only on one side", () => {
    const m = mergeProgress([row("attempt", "q1", {}, 1)], [row("attempt", "q2", {}, 1)]);
    expect(m.map((r) => r.key).sort()).toEqual(["q1", "q2"]);
  });
  it("first login unions bookmarks so nothing is lost", () => {
    const m = mergeProgress([row("bookmarks", "all", ["q1"], 50)], [row("bookmarks", "all", ["q2"], 100)], { union: true });
    expect((m[0]!.payload as string[]).sort()).toEqual(["q1", "q2"]);
  });
  it("later syncs let the newest bookmark list win (so removals stick)", () => {
    const m = mergeProgress([row("bookmarks", "all", ["q1"], 50)], [row("bookmarks", "all", ["q2"], 100)]);
    expect(m[0]!.payload).toEqual(["q2"]);
  });
});

describe("analytics", () => {
  const day = 86400000;
  const now = Date.UTC(2026, 10, 3, 12);
  it("streak counts consecutive active days", () => {
    const days = new Set([0, 1, 2].map((i) => new Date(now - i * day).toISOString().slice(0, 10)));
    expect(computeStreak(days, now)).toBe(3);
  });
  it("accuracy uses each question's latest result", () => {
    const a = computeAnalytics({
      attempts: { q1: { qid: "q1", correct: true, at: now }, q5: { qid: "q5", correct: false, at: now } },
      history: [],
      mocks: {},
      syllabusDone: [],
      now,
    });
    expect(a.solved).toBe(2);
    expect(a.accuracy).toBe(50);
  });
});
