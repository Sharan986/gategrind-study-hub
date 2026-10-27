import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Bookmark, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { QuestionView, SolutionPanel, type Response } from "@/components/gg/QuestionView";
import { QuestionMeta } from "@/components/gg/primitives";
import { isCorrect, questionById, questions } from "@/data/questions";
import { questionOriginLabel } from "@/data/question-origin";
import { subjectById, topicName } from "@/data/subjects";
import { recordAttemptLocal, useAttempts, useBookmarks } from "@/hooks/use-local-store";
import { cn } from "@/lib/utils";
import { fetchQuestion } from "@/lib/catalog.functions";

export const Route = createFileRoute("/practice/$questionId")({
  loader: async ({ params }) => {
    let q = questionById(params.questionId);
    if (!q) {
      try {
        const fetched = await fetchQuestion({ data: { questionId: params.questionId } });
        if (fetched) {
          q = fetched;
        }
      } catch {
        // Fall back to notFound()
      }
    }
    if (!q) throw notFound();
    return { q };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          {
            title: `${questionOriginLabel(loaderData.q)} Q${loaderData.q.number} · ${subjectById(loaderData.q.subjectId)?.short} — GATE Grind`,
          },
          {
            name: "description",
            content: `Practise this ${loaderData.q.type} question from ${questionOriginLabel(loaderData.q)}, with a worked solution.`,
          },
          {
            property: "og:title",
            content: `${questionOriginLabel(loaderData.q)} Q${loaderData.q.number} — GATE Grind`,
          },
          { property: "og:description", content: "Answer it and check the worked solution." },
        ]
      : [{ title: "Question unavailable — GATE Grind" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: () => (
    <div className="neo-box mx-auto max-w-md text-center border-2 border-border shadow-[6px_6px_0_var(--border)]">
      <h1 className="text-xl font-black">Question not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The requested question could not be loaded.
      </p>
      <Link to="/pyq" className="neo-btn neo-btn-primary mt-4 font-bold">
        Back to PYQs
      </Link>
    </div>
  ),
  component: Practice,
});

function Practice() {
  const { q } = Route.useLoaderData();
  const navigate = useNavigate();
  const [attempts] = useAttempts();
  const { has, toggle } = useBookmarks();
  const [response, setResponse] = useState<Response>(undefined);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setResponse(undefined);
    setRevealed(false);
  }, [q.id]);

  // Keep the navigator focused on the study set the learner is currently in,
  // rather than exposing every question in the entire PYQ bank.
  const navigatorQuestions = questions.filter(
    (question) => question.subjectId === q.subjectId && question.topicId === q.topicId,
  );
  const questionSet = navigatorQuestions.length > 0 ? navigatorQuestions : [q];
  const idx = questionSet.findIndex((question) => question.id === q.id);
  const prev = questionSet[idx - 1];
  const next = questionSet[idx + 1];
  const hasAnswer = Array.isArray(response) ? response.length > 0 : !!response;
  const correct = revealed && isCorrect(q, response);

  const submit = () => {
    if (!hasAnswer || revealed) return;
    setRevealed(true);
    recordAttemptLocal(q.id, isCorrect(q, response));
  };
  const go = (id?: string) =>
    id && navigate({ to: "/practice/$questionId", params: { questionId: id } });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select")) {
        if (e.key === "Enter") submit();
        return;
      }
      const k = e.key.toUpperCase();
      if (q.options?.some((option) => option.id === k) && !revealed) {
        setResponse((r) => {
          const sel = Array.isArray(r) ? r : [];
          return q.type === "MCQ"
            ? [k]
            : sel.includes(k)
              ? sel.filter((x) => x !== k)
              : [...sel, k];
        });
      } else if (e.key === "Enter") submit();
      else if (e.key === "ArrowRight" || k === "N") go(next?.id);
      else if (e.key === "ArrowLeft" || k === "P") go(prev?.id);
      else if (k === "S") toggle(q.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_270px]">
      <div className="min-w-0">
        <nav
          className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold text-muted-foreground"
          aria-label="Breadcrumb"
        >
          <Link to="/pyq" className="neo-pill bg-surface text-text-h hover:bg-neo-yellow">
            PYQ
          </Link>
          <span className="font-bold">/</span>
          <Link
            to="/pyq"
            search={{ subject: q.subjectId }}
            className="neo-pill bg-surface text-text-h hover:bg-neo-yellow"
          >
            {subjectById(q.subjectId)?.short}
          </Link>
          <span className="font-bold">/</span>
          <Link
            to="/pyq"
            search={{ subject: q.subjectId, topic: q.topicId }}
            className="text-text-h font-black hover:underline"
          >
            {topicName(q.subjectId, q.topicId)}
          </Link>
        </nav>

        <article className="neo-box border-2 border-border bg-surface shadow-[6px_6px_0_var(--border)]">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b-2 border-border pb-4.5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="neo-sticker bg-neo-yellow text-black rotate-[-1deg] text-xs font-black">
                  QUESTION {q.number}
                </span>
                <span className="text-xs font-extrabold text-muted-foreground">
                  {questionOriginLabel(q)}
                </span>
              </div>
              <QuestionMeta q={q} />
              {q.sourceUrl && (
                <a
                  href={q.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs font-bold underline hover:text-neo-pink"
                >
                  Original question ↗
                </a>
              )}
            </div>
            <button
              onClick={() => toggle(q.id)}
              className={cn(
                "neo-btn px-3 py-1.5 font-bold transition-all",
                has(q.id)
                  ? "bg-neo-purple text-black border-2 border-border shadow-[3px_3px_0_var(--border)]"
                  : "bg-surface hover:bg-subtle",
              )}
              aria-pressed={has(q.id)}
              aria-label="Bookmark question"
            >
              <Bookmark className={cn("size-4", has(q.id) && "fill-current")} />
              <span className="text-xs">{has(q.id) ? "Saved" : "Save"}</span>
            </button>
          </div>
          <QuestionView q={q} response={response} onChange={setResponse} revealed={revealed} />
        </article>

        {/* Action Controls */}
        <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex flex-wrap items-center gap-2.5 border-t-2 border-border bg-background/95 backdrop-blur-md px-4 py-3.5 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
          <button
            className="neo-btn border-2 border-border shadow-[3px_3px_0_var(--border)] font-bold"
            onClick={() => go(prev?.id)}
            disabled={!prev}
          >
            <ArrowLeft className="size-4" /> Prev
          </button>
          {revealed ? (
            <button
              className="neo-btn bg-neo-yellow text-black border-2 border-border shadow-[3px_3px_0_var(--border)] font-black hover:bg-neo-yellow/85"
              onClick={() => {
                setResponse(undefined);
                setRevealed(false);
              }}
            >
              <RotateCcw className="size-4 stroke-[2.5]" /> Try Again
            </button>
          ) : (
            <button
              className="neo-btn neo-btn-primary px-6 border-2 border-border shadow-[3px_3px_0_var(--border)] font-black text-sm hover:shadow-[5px_5px_0_var(--border)]"
              onClick={submit}
              disabled={!hasAnswer}
            >
              Check Answer
            </button>
          )}
          {!revealed && (
            <button
              className="neo-btn border-2 border-border shadow-[2px_2px_0_var(--border)] font-bold text-xs"
              onClick={() => setRevealed(true)}
            >
              Show Solution
            </button>
          )}
          <button
            className="neo-btn ml-auto border-2 border-border shadow-[3px_3px_0_var(--border)] font-bold"
            onClick={() => go(next?.id)}
            disabled={!next}
          >
            Next <ArrowRight className="size-4" />
          </button>
        </div>

        {revealed && <SolutionPanel q={q} correct={correct} response={response} />}
      </div>

      <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
        <div className="neo-box border-2 border-border bg-surface p-4.5 shadow-[4px_4px_0_var(--border)]">
          <div className="neo-label mb-1 font-black text-xs">Question Navigator</div>
          <p className="mb-3 text-[11px] text-muted-foreground">
            {topicName(q.subjectId, q.topicId)} · {questionSet.length} question
            {questionSet.length === 1 ? "" : "s"}
          </p>
          <div className="grid grid-cols-6 gap-1.5">
            {questionSet.map((x, i) => {
              const a = attempts[x.id];
              return (
                <Link
                  key={x.id}
                  to="/practice/$questionId"
                  params={{ questionId: x.id }}
                  aria-label={`Question ${i + 1}`}
                  aria-current={x.id === q.id ? "true" : undefined}
                  className={cn(
                    "flex aspect-square items-center justify-center border-2 border-border text-[11px] font-black transition-all",
                    x.id === q.id &&
                      "bg-neo-yellow text-black scale-110 shadow-[2px_2px_0_var(--border)] z-10",
                    x.id !== q.id && a?.correct && "bg-neo-green text-black",
                    x.id !== q.id && a && !a.correct && "bg-neo-pink text-white",
                    x.id !== q.id && !a && "bg-surface text-text-h hover:bg-subtle",
                  )}
                >
                  {i + 1}
                </Link>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-[10px] font-bold text-muted-foreground border-t-2 border-border pt-2.5">
            <span className="flex items-center gap-1">
              <span className="inline-block size-3 border-2 border-border bg-neo-green" />
              Correct
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block size-3 border-2 border-border bg-neo-pink" />
              Wrong
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block size-3 border-2 border-border bg-neo-yellow" />
              Active
            </span>
          </div>
        </div>

        <div className="neo-box hidden border-2 border-border bg-[#FFF9C4]/35 dark:bg-[#2A240A]/40 p-4.5 text-xs shadow-[4px_4px_0_var(--border)] lg:block">
          <div className="neo-label mb-2.5 font-black text-xs">Quick Shortcuts</div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 font-medium">
            {[
              ["A–D", "Select option"],
              ["Enter", "Check answer"],
              ["N / →", "Next question"],
              ["P / ←", "Previous"],
              ["S", "Bookmark / Save"],
              ["/", "Global search"],
            ].map(([k, v]) => (
              <div key={k} className="contents">
                <dt>
                  <kbd className="neo-pill bg-neo-yellow text-black border-border shadow-[1px_1px_0_var(--border)] font-bold px-1.5">
                    {k}
                  </kbd>
                </dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </aside>
    </div>
  );
}
