import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { QuestionView, type Response } from "@/components/gg/QuestionView";
import { QuestionMeta } from "@/components/gg/primitives";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
      {
        title: loaderData
          ? `${loaderData.test.title} · In progress — GATE Grind`
          : "Test unavailable — GATE Grind",
      },
      { name: "description", content: "GATE-style timed test in progress." },
      { name: "robots", content: "noindex" },
    ],
  }),
  notFoundComponent: () => (
    <div className="neo-box mx-auto max-w-md text-center border-2 border-border shadow-[6px_6px_0_var(--border)]">
      <h1 className="text-xl font-black">Test not found</h1>
      <Link to="/mocks" className="neo-btn neo-btn-primary mt-4 font-black">
        All mocks
      </Link>
    </div>
  ),
  component: Attempt,
});

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

function Attempt() {
  const { test } = Route.useLoaderData();
  const navigate = useNavigate();
  const [, setResults] = useMockResults();
  const qs = test.questionIds
    .map((id) => questionById(id))
    .filter((q): q is NonNullable<typeof q> => !!q);
  const [i, setI] = useState(0);
  const [responses, setResponses] = useState<Record<string, Response>>({});
  const [review, setReview] = useState<Set<string>>(new Set());
  const [visited, setVisited] = useState<Set<string>>(new Set([qs[0]?.id ?? ""]));
  const [left, setLeft] = useState(test.durationMin * 60);
  const [confirm, setConfirm] = useState(false);
  const started = useRef(Date.now());
  const q = qs[i]!;

  const finish = () => {
    const clean: Record<string, string[] | string> = {};
    Object.entries(responses).forEach(([k, v]) => v !== undefined && (clean[k] = v));
    setResults((r) => ({
      ...r,
      [test.id]: {
        testId: test.id,
        responses: clean,
        timeTakenSec: Math.round((Date.now() - started.current) / 1000),
        at: Date.now(),
      },
    }));
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
    setVisited((v) => new Set(v).add(qs[n]!.id));
  };
  const answered = (id: string) => {
    const r = responses[id];
    return Array.isArray(r) ? r.length > 0 : !!r;
  };
  const statusOf = (id: string) =>
    review.has(id) ? "review" : answered(id) ? "answered" : visited.has(id) ? "skipped" : "new";
  const counts = {
    answered: qs.filter((x) => statusOf(x.id) === "answered").length,
    review: review.size,
    skipped: qs.filter((x) => statusOf(x.id) === "skipped").length,
    new: qs.filter((x) => statusOf(x.id) === "new").length,
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-2 border-border bg-neo-yellow px-5 py-3 text-black shadow-[4px_4px_0_var(--border)] font-black">
        <span className="font-heading text-lg tracking-tight">{test.title}</span>
        <span
          className={cn(
            "neo-sticker bg-black text-white px-3 py-1 font-mono text-sm tracking-widest",
            left < 60 && "bg-neo-pink text-white animate-pulse",
          )}
          aria-live="off"
          aria-label="Time left"
        >
          <Clock className="size-4 inline mr-1.5" /> {fmt(Math.max(0, left))}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_290px]">
        <div className="min-w-0">
          <article className="neo-box border-2 border-border bg-surface shadow-[6px_6px_0_var(--border)]">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b-2 border-border pb-3.5">
              <div className="flex items-center gap-2">
                <span className="neo-sticker bg-neo-yellow text-black rotate-[-1deg] text-xs font-black">
                  QUESTION {i + 1}
                </span>
                <span className="text-xs font-extrabold text-muted-foreground">of {qs.length}</span>
              </div>
              <QuestionMeta q={q} />
            </div>
            <QuestionView
              q={q}
              response={responses[q.id]}
              onChange={(r) => setResponses((s) => ({ ...s, [q.id]: r }))}
            />
          </article>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              className="neo-btn font-bold"
              onClick={() => setResponses((s) => ({ ...s, [q.id]: undefined }))}
            >
              Clear Response
            </button>
            <button
              className={cn(
                "neo-btn font-black transition-all",
                review.has(q.id)
                  ? "bg-neo-purple text-black border-2 border-border shadow-[3px_3px_0_var(--border)]"
                  : "bg-surface",
              )}
              onClick={() =>
                setReview((r) => {
                  const n = new Set(r);
                  if (n.has(q.id)) {
                    n.delete(q.id);
                  } else {
                    n.add(q.id);
                  }
                  return n;
                })
              }
            >
              {review.has(q.id) ? "★ Marked for Review" : "Mark for Review"}
            </button>
            <div className="ml-auto flex gap-2">
              <button className="neo-btn font-bold" disabled={i === 0} onClick={() => goto(i - 1)}>
                Previous
              </button>
              <button
                className="neo-btn neo-btn-primary font-black"
                disabled={i === qs.length - 1}
                onClick={() => goto(i + 1)}
              >
                Save & Next →
              </button>
            </div>
          </div>
        </div>

        <aside className="neo-box h-fit border-2 border-border bg-surface p-4.5 shadow-[4px_4px_0_var(--border)] lg:sticky lg:top-20">
          <div className="neo-label mb-3 font-black text-xs">Question Palette</div>
          <div className="grid grid-cols-5 gap-1.5">
            {qs.map((x, n) => {
              const st = statusOf(x.id);
              const isActive = n === i;
              return (
                <button
                  key={x.id}
                  onClick={() => goto(n)}
                  aria-label={`Question ${n + 1}, ${st}`}
                  className={cn(
                    "relative flex aspect-square items-center justify-center border-2 border-border text-xs font-black transition-all cursor-pointer",
                    st === "answered" && "bg-neo-green text-black",
                    st === "review" && "bg-neo-purple text-black rounded-full",
                    st === "skipped" && "border-danger bg-danger-bg text-danger",
                    st === "new" && "bg-surface text-text-h hover:bg-subtle",
                    isActive &&
                      "outline-3 outline-offset-2 outline-black scale-110 shadow-[2px_2px_0_var(--border)] z-10",
                  )}
                >
                  {n + 1}
                </button>
              );
            })}
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-2 text-[11px] font-bold border-t-2 border-border pt-3">
            <dt className="flex items-center gap-1.5">
              <span className="size-2.5 bg-neo-green border border-border inline-block" /> Answered
            </dt>
            <dd className="text-right font-black">{counts.answered}</dd>
            <dt className="flex items-center gap-1.5">
              <span className="size-2.5 bg-neo-purple border border-border inline-block rounded-full" />{" "}
              For Review
            </dt>
            <dd className="text-right font-black">{counts.review}</dd>
            <dt className="flex items-center gap-1.5">
              <span className="size-2.5 bg-danger-bg border border-danger inline-block" /> Skipped
            </dt>
            <dd className="text-right font-black">{counts.skipped}</dd>
            <dt className="flex items-center gap-1.5">
              <span className="size-2.5 bg-surface border border-border inline-block" /> Not Visited
            </dt>
            <dd className="text-right font-black">{counts.new}</dd>
          </dl>
          <button
            className="neo-btn bg-neo-pink text-white hover:bg-neo-pink/90 font-black mt-5 w-full shadow-[3px_3px_0_var(--border)]"
            onClick={() => setConfirm(true)}
          >
            Submit Test
          </button>
        </aside>
      </div>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent className="rounded-none border-2 border-border bg-surface shadow-[6px_6px_0_var(--border)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-2xl font-black">
              Submit examination?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-semibold leading-relaxed">
              You've answered {counts.answered} of {qs.length} questions. {counts.review} questions
              are marked for review, and {counts.skipped + counts.new} remain unattempted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="neo-btn rounded-none font-bold">
              Keep Working
            </AlertDialogCancel>
            <AlertDialogAction
              className="neo-btn neo-btn-primary rounded-none font-black"
              onClick={finish}
            >
              Confirm & Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
