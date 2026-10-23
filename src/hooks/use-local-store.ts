import { useCallback, useEffect, useState } from "react";

// Demo-state persistence in localStorage. Hydration-safe: reads after mount.
const listeners = new Map<string, Set<() => void>>();
let changeHook: ((key: string) => void) | null = null;
/** Registered by the account sync client so local edits get pushed when signed in. */
export function onLocalChange(fn: (key: string) => void) {
  changeHook = fn;
}
export function notifyKey(key: string) {
  listeners.get(key)?.forEach((l) => l());
}
export function readLocal<T>(key: string, fallback: T): T {
  return read(key, fallback);
}
export function writeLocal(key: string, value: unknown, silent = false) {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(key, JSON.stringify(value));
  if (!silent) {
    const meta = read<Record<string, number>>("gg:meta", {});
    meta[key] = Date.now();
    window.localStorage.setItem("gg:meta", JSON.stringify(meta));
    changeHook?.(key);
  }
  notifyKey(key);
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined" || !window.localStorage) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function useLocalStore<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setValue(read(key, fallback));
    setReady(true);
    const fn = () => setValue(read(key, fallback));
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(fn);
    return () => void listeners.get(key)?.delete(fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = read(key, fallback);
      const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      writeLocal(key, v);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  return [value, update, ready] as const;
}

export interface Attempt {
  qid: string;
  correct: boolean;
  at: number;
}

export function useAttempts() {
  return useLocalStore<Record<string, Attempt>>("gg:attempts", {});
}
export interface HistoryEntry {
  qid: string;
  correct: boolean;
  at: number;
}
/** Records an attempt: latest result per question plus an append-only history for analytics. */
export function recordAttemptLocal(qid: string, correct: boolean) {
  const at = Date.now();
  const attempts = read<Record<string, Attempt>>("gg:attempts", {});
  writeLocal("gg:attempts", { ...attempts, [qid]: { qid, correct, at } });
  const hist = read<HistoryEntry[]>("gg:history", []);
  writeLocal("gg:history", [...hist, { qid, correct, at }].slice(-5000));
}

export function useHistory() {
  return useLocalStore<HistoryEntry[]>("gg:history", []);
}

export function useBookmarks() {
  const [list, set] = useLocalStore<string[]>("gg:bookmarks", []);
  const toggle = (id: string) =>
    set((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  return { bookmarks: list, toggle, has: (id: string) => list.includes(id) };
}
export function useSyllabusProgress() {
  const [done, set] = useLocalStore<string[]>("gg:syllabus", []);
  const toggle = (k: string) => set((l) => (l.includes(k) ? l.filter((x) => x !== k) : [...l, k]));
  return { done, toggle };
}
export interface MockResult {
  testId: string;
  responses: Record<string, string[] | string>;
  timeTakenSec: number;
  at: number;
}
export function useMockResults() {
  return useLocalStore<Record<string, MockResult>>("gg:mocks", {});
}

export type SolverVerificationDecision = "approve" | "report_issue";
export type SolverIssueCategory =
  "wrong_answer_key" | "missing_options" | "typo_latex" | "truncated_body" | "other";

export interface QuestionVerificationRecord {
  questionId: string;
  status: "approved" | "flagged_issue";
  decision: SolverVerificationDecision;
  solverNotes?: string | undefined;
  issueCategory?: SolverIssueCategory | undefined;
  proposedAnswer?: string | undefined;
  timestamp: number;
}

export function useQuestionVerifications() {
  const [records, setRecords] = useLocalStore<Record<string, QuestionVerificationRecord>>(
    "gg:verifications",
    {},
  );
  return {
    verifications: records,
    isApproved: (qid: string) => records[qid]?.status === "approved",
    isFlagged: (qid: string) => records[qid]?.status === "flagged_issue",
    getRecord: (qid: string) => records[qid],
    approve: (qid: string, notes?: string) => {
      recordVerificationLocal({
        questionId: qid,
        status: "approved",
        decision: "approve",
        solverNotes: notes,
        timestamp: Date.now(),
      });
    },
    flagIssue: (
      qid: string,
      category: SolverIssueCategory,
      notes?: string,
      proposedAnswer?: string,
    ) => {
      recordVerificationLocal({
        questionId: qid,
        status: "flagged_issue",
        decision: "report_issue",
        issueCategory: category,
        solverNotes: notes,
        proposedAnswer,
        timestamp: Date.now(),
      });
    },
    revoke: (qid: string) => {
      removeVerificationLocal(qid);
    },
  };
}

export function recordVerificationLocal(record: QuestionVerificationRecord) {
  const all = read<Record<string, QuestionVerificationRecord>>("gg:verifications", {});
  writeLocal("gg:verifications", { ...all, [record.questionId]: record });
}

export function removeVerificationLocal(questionId: string) {
  const all = read<Record<string, QuestionVerificationRecord>>("gg:verifications", {});
  const next = { ...all };
  delete next[questionId];
  writeLocal("gg:verifications", next);
}
