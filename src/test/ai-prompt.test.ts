import { describe, expect, it } from "vitest";
import { buildExplainPrompt, chatgptUrl, claudeUrl, MAX_PROMPT } from "@/lib/ai-prompt";
import { questionById } from "@/data/questions";
import type { Question } from "@/lib/types";

describe("AI explanation prompt", () => {
  it("includes options, my answer and the correct answer once revealed", () => {
    const p = buildExplainPrompt(questionById("q5")!, ["C"], true);
    expect(p).toContain("(D) BCNF");
    expect(p).toContain("My answer: C");
    expect(p).toContain("Correct answer: B");
  });
  it("hides the correct answer before reveal", () => {
    expect(buildExplainPrompt(questionById("q5")!, ["C"], false)).not.toContain("Correct answer");
  });
  it("caps prompt length", () => {
    const q = { ...questionById("q1")!, body: "x".repeat(20000) } as Question;
    expect(buildExplainPrompt(q).length).toBeLessThanOrEqual(MAX_PROMPT);
  });
  it("builds ChatGPT and Claude links", () => {
    expect(chatgptUrl("a b")).toBe("https://chatgpt.com/?q=a%20b");
    expect(claudeUrl("a b")).toBe("https://claude.ai/new?q=a%20b");
  });
});
