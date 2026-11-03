import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Check, Minus, X } from "lucide-react";
import { useState } from "react";
import { QuestionView, SolutionPanel } from "@/components/gg/QuestionView";
import { EmptyState, PageHeader, ProgressBar, Stat } from "@/components/gg/primitives";
import { getTest } from "@/data/catalog";
import { isCorrect, questionById, scoreFor } from "@/data/questions";
import { subjectById } from "@/data/subjects";
import { useMockResults } from "@/hooks/use-local-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mocks_/$testId/result")({
  loader: ({ params }) => {
    const test = getTest(params.testId);
    if (!test) throw notFound();
    return { test };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.test.title} · Result — GATE Grind` : "Result unavailable — GATE Grind" },
      { name: "description", content: "Mock test score, accuracy and a review of every question." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Result,
});

function Result() {
  const { test } = Route.useLoaderData();
  const [results, , ready] = useMockResults();
  const [open, setOpen] = useState<string | null>(null);
  const r = results[test.id];
  if (!ready) return null;
  if (!r) return <EmptyState title="No result yet" description="Take this test to see your score here." action={<Link to="/mocks" className="neo-btn">Go to mocks</Link>} />;

  const qs = test.questionIds.map((id) => questionById(id)!);
  const max = qs.reduce((n, q) => n + q.marks, 0);
  const score = qs.reduce((n, q) => n + scoreFor(q, r.responses[q.id]), 0);
  const attempted = qs.filter((q) => r.responses[q.id] !== undefined && r.responses[q.id] !== "" && !(Array.isArray(r.responses[q.id]) && r.responses[q.id].length === 0));
  const right = attempted.filter((q) => isCorrect(q, r.responses[q.id]));
  const bySub = new Map<string, { s: number; m: number }>();
  qs.forEach((q) => {
    const e = bySub.get(q.subjectId) ?? { s: 0, m: 0 };
    e.s += scoreFor(q, r.responses[q.id]);
    e.m += q.marks;
    bySub.set(q.subjectId, e);
  });

  return (
    <>
      <PageHeader eyebrow="Result" title={test.title} description={`Submitted ${new Date(r.at).toLocaleString()}`}>
        <Link to="/mocks/$testId/attempt" params={{ testId: test.id }} className="neo-btn">Retake</Link>
        <Link to="/mocks" className="neo-btn neo-btn-primary">More tests</Link>
      </PageHeader>
      <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Score" value={`${score.toFixed(2)} / ${max}`} />
        <Stat label="Accuracy" value={`${attempted.length ? Math.round((right.length / attempted.length) * 100) : 0}%`} hint={`${right.length} of ${attempted.length} attempted`} />
        <Stat label="Attempted" value={`${attempted.length} / ${qs.length}`} />
        <Stat label="Time taken" value={`${Math.floor(r.timeTakenSec / 60)}m ${r.timeTakenSec % 60}s`} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <section className="neo-box h-fit">
          <h2 className="mb-4 text-lg">By subject</h2>
          <ul className="space-y-3">
            {[...bySub.entries()].map(([id, e]) => (
              <li key={id}>
                <div className="mb-1 flex justify-between text-xs"><span className="text-text-h">{subjectById(id)?.short}</span><span>{e.s.toFixed(1)}/{e.m}</span></div>
                <ProgressBar value={(Math.max(0, e.s) / e.m) * 100} label={`${subjectById(id)?.short} score`} />
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="mb-3 text-lg">Question review</h2>
          <ol className="space-y-2">
            {qs.map((q, n) => {
              const resp = r.responses[q.id];
              const att = attempted.includes(q);
              const ok = att && isCorrect(q, resp);
              const sc = scoreFor(q, resp);
              return (
                <li key={q.id} className="neo-box-sm">
                  <button className="flex w-full items-center gap-3 p-3 text-left text-sm" onClick={() => setOpen(open === q.id ? null : q.id)} aria-expanded={open === q.id}>
                    <span className={cn("flex size-6 items-center justify-center border", ok ? "border-success text-success" : att ? "border-danger text-danger" : "border-border")}>
                      {ok ? <Check className="size-3.5" /> : att ? <X className="size-3.5" /> : <Minus className="size-3.5" />}
                    </span>
                    <span className="w-8 text-muted-foreground">Q{n + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-text-h">{q.body.replace(/\$|\\/g, "")}</span>
                    <span className={cn("text-xs tabular-nums", sc > 0 ? "text-success" : sc < 0 ? "text-danger" : "")}>{sc > 0 ? "+" : ""}{sc.toFixed(2)}</span>
                  </button>
                  {open === q.id && (
                    <div className="border-t border-border p-4">
                      <QuestionView q={q} response={resp} onChange={() => {}} revealed />
                      <SolutionPanel q={q} correct={ok} />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </>
  );
}
