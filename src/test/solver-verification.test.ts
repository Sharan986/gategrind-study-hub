import { describe, expect, it, beforeEach, beforeAll } from "vitest";
import {
  recordVerificationLocal,
  removeVerificationLocal,
  readLocal,
  type QuestionVerificationRecord,
} from "@/hooks/use-local-store";

// Mock localStorage for test environment
class LocalStorageMock {
  private store: Record<string, string> = {};

  clear() {
    this.store = {};
  }

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }
}

describe("Solver Verification & Approval Workflow", () => {
  beforeAll(() => {
    const mockStorage = new LocalStorageMock();
    if (typeof window === "undefined") {
      (globalThis as unknown as { window: { localStorage: LocalStorageMock } }).window = {
        localStorage: mockStorage,
      };
    } else {
      Object.defineProperty(window, "localStorage", {
        value: mockStorage,
        writable: true,
      });
    }
  });

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("records an approval decision for an unverified question", () => {
    const record: QuestionVerificationRecord = {
      questionId: "q_test_101",
      status: "approved",
      decision: "approve",
      solverNotes: "Verified against original GATE 2018 official PDF question 14.",
      timestamp: Date.now(),
    };

    recordVerificationLocal(record);

    const saved = readLocal<Record<string, QuestionVerificationRecord>>("gg:verifications", {});
    expect(saved["q_test_101"]).toBeDefined();
    expect(saved["q_test_101"]!.status).toBe("approved");
    expect(saved["q_test_101"]!.solverNotes).toContain("GATE 2018");
  });

  it("records an issue report with category and proposed answer", () => {
    const record: QuestionVerificationRecord = {
      questionId: "q_test_102",
      status: "flagged_issue",
      decision: "report_issue",
      issueCategory: "wrong_answer_key",
      solverNotes: "Official answer key revised from B to C after challenge.",
      proposedAnswer: "C",
      timestamp: Date.now(),
    };

    recordVerificationLocal(record);

    const saved = readLocal<Record<string, QuestionVerificationRecord>>("gg:verifications", {});
    expect(saved["q_test_102"]).toBeDefined();
    expect(saved["q_test_102"]!.status).toBe("flagged_issue");
    expect(saved["q_test_102"]!.issueCategory).toBe("wrong_answer_key");
    expect(saved["q_test_102"]!.proposedAnswer).toBe("C");
  });

  it("supports revoking a solver verification decision", () => {
    recordVerificationLocal({
      questionId: "q_test_revoke",
      status: "approved",
      decision: "approve",
      timestamp: Date.now(),
    });

    let saved = readLocal<Record<string, QuestionVerificationRecord>>("gg:verifications", {});
    expect(saved["q_test_revoke"]).toBeDefined();

    removeVerificationLocal("q_test_revoke");

    saved = readLocal<Record<string, QuestionVerificationRecord>>("gg:verifications", {});
    expect(saved["q_test_revoke"]).toBeUndefined();
  });

  it("exports verification records as valid JSON for the curation pipeline", () => {
    const records: QuestionVerificationRecord[] = [
      {
        questionId: "q_cs_2015_1_25",
        status: "approved",
        decision: "approve",
        solverNotes: "Body and options match GateOverflow exactly.",
        timestamp: 1730000000000,
      },
      {
        questionId: "q_cs_2014_2_10",
        status: "flagged_issue",
        decision: "report_issue",
        issueCategory: "missing_options",
        solverNotes: "Question was an MCQ but choices A-D are omitted.",
        timestamp: 1730000001000,
      },
    ];

    records.forEach(recordVerificationLocal);

    const saved = readLocal<Record<string, QuestionVerificationRecord>>("gg:verifications", {});

    // Structure of export payload
    const exportPayload = {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      solverVerificationCount: Object.keys(saved).length,
      verifications: Object.values(saved),
    };

    expect(exportPayload.solverVerificationCount).toBe(2);
    expect(exportPayload.verifications.some((v) => v.status === "approved")).toBe(true);
    expect(exportPayload.verifications.some((v) => v.status === "flagged_issue")).toBe(true);

    const jsonString = JSON.stringify(exportPayload, null, 2);
    expect(JSON.parse(jsonString)).toEqual(exportPayload);
  });
});
