import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Check, Minus, X, Award } from "lucide-react";
import { useState } from "react";
import { QuestionView, SolutionPanel } from "@/components/gg/QuestionView";
import {
  EmptyState,
  PageHeader,
  ProgressBar,
  Stat,
  SubjectBadge,
} from "@/components/gg/primitives";
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
      {
        title: loaderData
          ? `${loaderData.test.title} · Result — GATE Grind`
          : "Result unavailable — GATE Grind",
      },
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
  if (!r)
    return (
      <EmptyState
        title="No test results recorded yet"
        description="Attempt this test to generate your performance scorecard."
        action={
          <Link to="/mocks" className="neo-btn neo-btn-primary font-black">
            Go to Mocks
          </Link>
        }
      />
    );

  const qs = test.questionIds
    .map((id) => questionById(id))
    .filter((q): q is NonNullable<typeof q> => !!q);
  const max = qs.reduce((n, q) => n + q.marks, 0);
  const score = qs.reduce((n, q) => n + scoreFor(q, r.responses[q.id]), 0);
  const attempted = qs.filter(
    (q) =>
      r.responses[q.id] !== undefined &&
      r.responses[q.id] !== "" &&
      !(Array.isArray(r.responses[q.id]) && (r.responses[q.id] as string[]).length === 0),
  );
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
      <PageHeader
        eyebrow="Examination Scorecard"
        title={test.title}
        description={`Submitted ${new Date(r.at).toLocaleString()} · Official GATE Scoring`}
      >
        <Link
          to="/mocks/$testId/attempt"
          params={{ testId: test.id }}
          className="neo-btn font-bold"
        >
          Retake Test
        </Link>
        <Link to="/mocks" className="neo-btn neo-btn-primary font-black">
          More Mock Tests →
        </Link>
      </PageHeader>

      <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat
          label="Total Marks"
          value={`${score.toFixed(2)} / ${max}`}
          hint="Calculated with negative marking"
          color="yellow"
        />
        <Stat
          label="Accuracy"
          value={`${attempted.length ? Math.round((right.length / attempted.length) * 100) : 0}%`}
          hint={`${right.length} of ${attempted.length} correct`}
          color="green"
        />
        <Stat
          label="Attempted"
          value={`${attempted.length} / ${qs.length}`}
          hint={`${qs.length - attempted.length} skipped`}
          color="pink"
        />
        <Stat
          label="Duration Taken"
          value={`${Math.floor(r.timeTakenSec / 60)}m ${r.timeTakenSec % 60}s`}
          color="cyan"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-[290px_1fr]">
        <section className="neo-box h-fit border-2 border-border bg-surface shadow-[4px_4px_0_var(--border)]">
          <div className="flex items-center gap-2 mb-4">
            <Award className="size-5 text-neo-yellow" />
            <h2 className="text-xl font-black tracking-tight">Sectional Score</h2>
          </div>
          <ul className="space-y-3.5">
            {[...bySub.entries()].map(([id, e]) => (
              <li
                key={id}
                className="border-2 border-border p-3 bg-subtle/50 shadow-[1.5px_1.5px_0_var(--border)]"
              >
                <div className="mb-1.5 flex justify-between text-xs font-bold">
                  <span className="text-text-h">{subjectById(id)?.short}</span>
                  <span className="neo-pill bg-neo-yellow text-black border-border shadow-[1px_1px_0_var(--border)] font-black text-[10px]">
                    {e.s.toFixed(1)}/{e.m}
                  </span>
                </div>
                <ProgressBar
                  value={(Math.max(0, e.s) / e.m) * 100}
                  label={`${subjectById(id)?.short} score`}
                  color="green"
                />
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="mb-3.5 flex items-center justify-between">
            <h2 className="text-xl font-black tracking-tight">Question Review & Solutions</h2>
            <span className="neo-pill bg-neo-yellow text-black border-border shadow-[1px_1px_0_var(--border)] font-bold text-xs">
              {qs.length} Questions
            </span>
          </div>
          <ol className="space-y-2.5">
            {qs.map((q, n) => {
              const resp = r.responses[q.id];
              const att = attempted.includes(q);
              const ok = att && isCorrect(q, resp);
              const sc = scoreFor(q, resp);
              return (
                <li
                  key={q.id}
                  className="neo-box-sm border-2 border-border bg-surface shadow-[3px_3px_0_var(--border)]"
                >
                  <button
                    className="flex w-full items-center gap-3.5 p-3.5 text-left text-sm cursor-pointer hover:bg-subtle transition-colors"
                    onClick={() => setOpen(open === q.id ? null : q.id)}
                    aria-expanded={open === q.id}
                  >
                    <span
                      className={cn(
                        "flex size-6.5 shrink-0 items-center justify-center border-2 border-border font-black text-xs shadow-[1px_1px_0_var(--border)]",
                        ok
                          ? "bg-neo-green text-black"
                          : att
                            ? "bg-neo-pink text-white"
                            : "bg-surface text-muted-foreground",
                      )}
                    >
                      {ok ? (
                        <Check className="size-4 stroke-[3]" />
                      ) : att ? (
                        <X className="size-4 stroke-[3]" />
                      ) : (
                        <Minus className="size-4 stroke-[3]" />
                      )}
                    </span>
                    <span className="w-9 font-mono text-xs font-black text-muted-foreground">
                      Q{n + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-text-h font-medium">
                      {q.body.replace(/\$|\\/g, "")}
                    </span>
                    <span
                      className={cn(
                        "neo-pill font-black text-xs border-border shadow-[1px_1px_0_var(--border)]",
                        sc > 0
                          ? "bg-neo-green text-black"
                          : sc < 0
                            ? "bg-neo-pink text-white"
                            : "bg-surface text-text-h",
                      )}
                    >
                      {sc > 0 ? "+" : ""}
                      {sc.toFixed(2)}
                    </span>
                  </button>
                  {open === q.id && (
                    <div className="border-t-2 border-border p-5 bg-subtle/30">
                      <QuestionView q={q} response={resp} onChange={() => {}} revealed />
                      <SolutionPanel q={q} correct={ok} response={resp} />
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
