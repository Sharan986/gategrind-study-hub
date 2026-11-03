import { questionById, scoreFor } from "@/data/questions";
import { getTest, syllabus } from "@/data/catalog";
import { subjects, topicName } from "@/data/subjects";
import type { Attempt, HistoryEntry, MockResult } from "@/hooks/use-local-store";

const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10);

export function computeStreak(days: Set<string>, now = Date.now()): number {
  let streak = 0;
  let t = now;
  if (!days.has(dayKey(t))) t -= 86400000; // today not done yet still keeps yesterday's streak
  while (days.has(dayKey(t))) {
    streak++;
    t -= 86400000;
  }
  return streak;
}

export function computeAnalytics(input: {
  attempts: Record<string, Attempt>;
  history: HistoryEntry[];
  mocks: Record<string, MockResult>;
  syllabusDone: string[];
  now?: number;
}) {
  const now = input.now ?? Date.now();
  const latest = Object.values(input.attempts);
  const solved = latest.length;
  const correct = latest.filter((a) => a.correct).length;
  const history = input.history.length ? input.history : latest;
  const activeDays = new Set(history.map((h) => dayKey(h.at)));

  // 12-week heatmap (84 days, oldest first)
  const perDay = new Map<string, number>();
  history.forEach((h) => perDay.set(dayKey(h.at), (perDay.get(dayKey(h.at)) ?? 0) + 1));
  const heatmap = Array.from({ length: 84 }, (_, i) => {
    const d = dayKey(now - (83 - i) * 86400000);
    return { day: d, count: perDay.get(d) ?? 0 };
  });

  const group = <K extends string>(keyOf: (qid: string) => K | undefined) => {
    const m = new Map<K, { attempted: number; correct: number }>();
    latest.forEach((a) => {
      const k = keyOf(a.qid);
      if (!k) return;
      const e = m.get(k) ?? { attempted: 0, correct: 0 };
      e.attempted++;
      if (a.correct) e.correct++;
      m.set(k, e);
    });
    return m;
  };
  const acc = (e: { attempted: number; correct: number }) => (e.attempted ? Math.round((e.correct / e.attempted) * 100) : 0);

  const bySubject = group((id) => questionById(id)?.subjectId);
  const subjectsOut = subjects
    .map((s) => {
      const e = bySubject.get(s.id) ?? { attempted: 0, correct: 0 };
      return { id: s.id, name: s.short, attempted: e.attempted, correct: e.correct, accuracy: acc(e) };
    })
    .filter((s) => s.attempted > 0);

  const byTopic = group((id) => {
    const q = questionById(id);
    return q ? `${q.subjectId}:${q.topicId}` : undefined;
  });
  const topics = [...byTopic.entries()]
    .map(([k, e]) => {
      const [sid = "", tid = ""] = k.split(":");
      return { subjectId: sid, name: topicName(sid, tid), attempted: e.attempted, accuracy: acc(e) };
    })
    .sort((a, b) => a.accuracy - b.accuracy || b.attempted - a.attempted);

  const byType = group((id) => questionById(id)?.type);
  const byDiff = group((id) => questionById(id)?.difficulty);

  const mocks = Object.values(input.mocks)
    .map((m) => {
      const t = getTest(m.testId);
      if (!t) return null;
      const qs = t.questionIds.map((id) => questionById(id)).filter((q): q is NonNullable<typeof q> => !!q);
      const max = qs.reduce((n, q) => n + q.marks, 0);
      const score = qs.reduce((n, q) => n + scoreFor(q, m.responses[q.id]), 0);
      return { testId: m.testId, title: t.title, at: m.at, score: Math.round(score * 100) / 100, max, pct: max ? Math.round((Math.max(0, score) / max) * 100) : 0 };
    })
    .filter((m): m is NonNullable<typeof m> => !!m)
    .sort((a, b) => a.at - b.at);

  const syllabusOut = syllabus.map((u) => {
    const keys = u.sections.flatMap((s) => s.items.map((it) => `${u.subjectId}:${it}`));
    const done = keys.filter((k) => input.syllabusDone.includes(k)).length;
    return { subjectId: u.subjectId, done, total: keys.length, pct: Math.round((done / keys.length) * 100) };
  });

  return {
    solved,
    correct,
    accuracy: solved ? Math.round((correct / solved) * 100) : 0,
    totalAttempts: history.length,
    streak: computeStreak(activeDays, now),
    studyDays: activeDays.size,
    heatmap,
    subjects: subjectsOut,
    topics,
    byType: (["MCQ", "MSQ", "NAT"] as const).map((k) => ({ label: k, ...(byType.get(k) ?? { attempted: 0, correct: 0 }), accuracy: acc(byType.get(k) ?? { attempted: 0, correct: 0 }) })),
    byDifficulty: (["Easy", "Medium", "Hard"] as const).map((k) => ({ label: k, ...(byDiff.get(k) ?? { attempted: 0, correct: 0 }), accuracy: acc(byDiff.get(k) ?? { attempted: 0, correct: 0 }) })),
    mocks,
    avgMock: mocks.length ? Math.round(mocks.reduce((n, m) => n + m.pct, 0) / mocks.length) : 0,
    syllabus: syllabusOut,
    syllabusPct: Math.round((syllabusOut.reduce((n, s) => n + s.done, 0) / Math.max(1, syllabusOut.reduce((n, s) => n + s.total, 0))) * 100),
  };
}
