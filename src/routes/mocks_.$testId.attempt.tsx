import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { QuestionView, type Response } from "@/components/gg/QuestionView";
import { QuestionMeta } from "@/components/gg/primitives";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getTest } from "@/data/catalog";
import { questionById } from "@/data/questions";
import { useMockResults } from "@/hooks/use-local-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mocks_/$testId/attempt")({
  loader: ({ params }) => {
    const test = getTest(params.testId);
    if (!test) throw notFound();
    return { test };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.test.title} · In progress — GATE Grind` : "Test unavailable — GATE Grind" },
      { name: "description", content: "GATE-style timed test in progress." },
      { name: "robots", content: "noindex" },
    ],
  }),
  notFoundComponent: () => <div className="neo-box mx-auto max-w-md text-center"><h1 className="text-xl">Test not found</h1><Link to="/mocks" className="neo-btn mt-4">All mocks</Link></div>,
  component: Attempt,
});

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

function Attempt() {
  const { test } = Route.useLoaderData();
  const navigate = useNavigate();
  const [, setResults] = useMockResults();
  const qs = test.questionIds.map((id) => questionById(id)!);
  const [i, setI] = useState(0);
  const [responses, setResponses] = useState<Record<string, Response>>({});
  const [review, setReview] = useState<Set<string>>(new Set());
  const [visited, setVisited] = useState<Set<string>>(new Set([qs[0]?.id]));
  const [left, setLeft] = useState(test.durationMin * 60);
  const [confirm, setConfirm] = useState(false);
  const started = useRef(Date.now());
  const q = qs[i];

  const finish = () => {
    const clean: Record<string, string[] | string> = {};
    Object.entries(responses).forEach(([k, v]) => v !== undefined && (clean[k] = v));
    setResults((r) => ({ ...r, [test.id]: { testId: test.id, responses: clean, timeTakenSec: Math.round((Date.now() - started.current) / 1000), at: Date.now() } }));
    navigate({ to: "/mocks/$testId/result", params: { testId: test.id }, replace: true });
  };

  useEffect(() => {
    const t = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (left <= 0) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  const goto = (n: number) => {
    setI(n);
    setVisited((v) => new Set(v).add(qs[n].id));
  };
  const answered = (id: string) => {
    const r = responses[id];
    return Array.isArray(r) ? r.length > 0 : !!r;
  };
  const statusOf = (id: string) => (review.has(id) ? "review" : answered(id) ? "answered" : visited.has(id) ? "skipped" : "new");
  const counts = { answered: qs.filter((x) => statusOf(x.id) === "answered").length, review: review.size, skipped: qs.filter((x) => statusOf(x.id) === "skipped").length, new: qs.filter((x) => statusOf(x.id) === "new").length };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-border bg-primary px-4 py-2 text-primary-foreground">
        <span className="font-heading font-semibold">{test.title}</span>
        <span className={cn("flex items-center gap-2 font-bold tabular-nums", left < 60 && "animate-pulse")} aria-live="off" aria-label="Time left">
          <Clock className="size-4" /> {fmt(Math.max(0, left))}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0">
          <article className="neo-box">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <h1 className="text-lg">Question {i + 1} <span className="text-sm text-muted-foreground">/ {qs.length}</span></h1>
              <QuestionMeta q={q} />
            </div>
            <QuestionView q={q} response={responses[q.id]} onChange={(r) => setResponses((s) => ({ ...s, [q.id]: r }))} />
          </article>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="neo-btn" onClick={() => setResponses((s) => ({ ...s, [q.id]: undefined }))}>Clear response</button>
            <button className={cn("neo-btn", review.has(q.id) && "neo-btn-primary")} onClick={() => setReview((r) => { const n = new Set(r); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; })}>
              {review.has(q.id) ? "Unmark review" : "Mark for review"}
            </button>
            <div className="ml-auto flex gap-2">
              <button className="neo-btn" disabled={i === 0} onClick={() => goto(i - 1)}>Previous</button>
              <button className="neo-btn neo-btn-primary" disabled={i === qs.length - 1} onClick={() => goto(i + 1)}>Save & next</button>
            </div>
          </div>
        </div>

        <aside className="neo-box h-fit p-4 lg:sticky lg:top-20">
          <div className="neo-label mb-3">Question palette</div>
          <div className="grid grid-cols-5 gap-1.5">
            {qs.map((x, n) => {
              const st = statusOf(x.id);
              return (
                <button key={x.id} onClick={() => goto(n)} aria-label={`Question ${n + 1}, ${st}`} className={cn(
                  "relative flex aspect-square items-center justify-center border border-border text-xs",
                  st === "answered" && "bg-primary text-primary-foreground",
                  st === "review" && "rounded-full border-warning bg-warning-bg text-warning",
                  st === "skipped" && "border-danger text-danger",
                  n === i && "outline-2 outline-offset-2 outline-focus",
                )}>{n + 1}</button>
              );
            })}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-1 text-[11px]">
            <dt>Answered</dt><dd className="text-right text-text-h">{counts.answered}</dd>
            <dt>For review</dt><dd className="text-right text-text-h">{counts.review}</dd>
            <dt>Skipped</dt><dd className="text-right text-text-h">{counts.skipped}</dd>
            <dt>Not visited</dt><dd className="text-right text-text-h">{counts.new}</dd>
          </dl>
          <button className="neo-btn neo-btn-primary mt-4 w-full" onClick={() => setConfirm(true)}>Submit test</button>
        </aside>
      </div>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent className="rounded-none border-border shadow-[4px_4px_0_var(--border)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Submit the test?</AlertDialogTitle>
            <AlertDialogDescription>
              You've answered {counts.answered} of {qs.length}. {counts.review} marked for review, {counts.skipped + counts.new} unanswered. You can't change answers after submitting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="neo-btn rounded-none">Keep going</AlertDialogCancel>
            <AlertDialogAction className="neo-btn neo-btn-primary rounded-none" onClick={finish}>Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
