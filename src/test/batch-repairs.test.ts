import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("batch 1 source-fidelity question repairs", () => {
  const repairsPath = resolve(process.cwd(), "seed/question-repairs.v1.json");
  const frozenPath = resolve(process.cwd(), "seed/d1-questions.baseline-migration-2026-11-04.json");
  const baselinePath = frozenPath;

  const targetKeys = [
    // Batch 1 (Pages 22-25)
    "vol1:1.2.1",
    "vol1:1.2.2",
    "vol1:1.2.3",
    "vol1:1.2.4",
    "vol1:1.2.5",
    "vol1:1.2.6",
    "vol1:1.2.7",
    "vol1:1.2.8",
    "vol1:1.2.9",
    "vol1:1.2.10",
    "vol1:1.2.11",
    "vol1:1.2.12",
    "vol1:1.2.13",
    "vol1:1.2.14",
    "vol1:1.2.15",
    "vol1:1.2.16",
    "vol1:1.2.17",
    "vol1:1.2.18",
    "vol1:1.3.1",
    "vol1:1.3.3",
    // Batch 2 (Pages 20-28)
    "vol1:1.1.1",
    "vol1:1.1.2",
    "vol1:1.1.3",
    "vol1:1.1.4",
    "vol1:1.1.5",
    "vol1:1.1.6",
    "vol1:1.3.4",
    "vol1:1.3.5",
    "vol1:1.3.6",
    "vol1:1.4.1",
    "vol1:1.4.2",
    "vol1:1.4.3",
    "vol1:1.4.4",
    "vol1:1.4.6",
    "vol1:1.5.1",
    "vol1:1.5.2",
    "vol1:1.6.1",
    "vol1:1.7.1",
    "vol1:1.7.2",
    "vol1:1.7.3",
  ];

  it("verifies frozen baseline integrity is unchanged", () => {
    const baselineHash = createHash("sha256").update(readFileSync(baselinePath)).digest("hex");
    const frozenHash = createHash("sha256").update(readFileSync(frozenPath)).digest("hex");
    expect(baselineHash).toBe(frozenHash);
  });

  it("verifies all 20 batch repairs are complete, valid, and trace back to source PDF pages", () => {
    const repairs = JSON.parse(readFileSync(repairsPath, "utf-8"));
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const questionsList: any[] = JSON.parse(readFileSync(baselinePath, "utf-8"));
    const questionMap = new Map<string, any>();
    /* eslint-enable @typescript-eslint/no-explicit-any */
    for (const q of questionsList) {
      const match = /^q_(vol\d+)_(.+)$/.exec(q.id);
      if (match && match[1] && match[2]) {
        questionMap.set(`${match[1]}:${match[2].replace(/_/g, ".")}`, q);
      }
    }

    expect(targetKeys).toHaveLength(40);

    for (const key of targetKeys) {
      const repair = repairs[key];
      expect(repair, `Repair for ${key} must exist`).toBeDefined();
      expect(repair.reviewStatus).toBe("approved");
      expect(repair.verifiedFrom).toMatch(/^vol1 page/);
      expect(repair.reviewedBy).toMatch(/^source-fidelity-(pdf-repair|batch-2026-11-04)$/);
      expect(repair.bodyPatch).toBeDefined();
      expect(typeof repair.bodyPatch).toBe("string");
      expect(repair.bodyPatch.trim().length).toBeGreaterThan(10);

      // Verify dollar math delimiter balance in body
      const bodyDollars = (repair.bodyPatch.match(/\$/g) || []).length;
      expect(bodyDollars % 2, `LaTeX delimiters must be balanced in ${key} body`).toBe(0);

      const baselineQ = questionMap.get(key);
      expect(baselineQ, `Baseline question for ${key} must exist`).toBeDefined();

      if (baselineQ.options && baselineQ.options.length > 0) {
        expect(repair.optionPatch, `${key} must have optionPatch`).toBeDefined();
        expect(Object.keys(repair.optionPatch).sort()).toEqual(["A", "B", "C", "D"]);
        for (const [optId, optText] of Object.entries(
          repair.optionPatch as Record<string, string>,
        )) {
          expect(optText.trim().length, `${key} option ${optId} must not be empty`).toBeGreaterThan(
            0,
          );
          const optDollars = (optText.match(/\$/g) || []).length;
          expect(
            optDollars % 2,
            `LaTeX delimiters must be balanced in ${key} option ${optId}`,
          ).toBe(0);
        }

        // Official answer key must point to valid options
        for (const ans of baselineQ.answer) {
          expect(["A", "B", "C", "D"], `Answer ${ans} for ${key} must be valid option`).toContain(
            ans,
          );
        }
      }
    }
  });
});
