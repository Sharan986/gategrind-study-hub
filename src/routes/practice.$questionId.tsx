import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Bookmark, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { QuestionView, SolutionPanel, type Response } from "@/components/gg/QuestionView";
import { QuestionMeta } from "@/components/gg/primitives";
import { isCorrect, questionById, questions } from "@/data/questions";
import { subjectById, topicName } from "@/data/subjects";
import { useAttempts, useBookmarks } from "@/hooks/use-local-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/practice/$questionId")({
  loader: ({ params }) => {
    const q = questionById(params.questionId);
    if (!q) throw notFound();
    return { q };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `GATE ${loaderData.q.year} Q${loaderData.q.number} · ${subjectById(loaderData.q.subjectId)?.short} — GATE Grind` },
          { name: "description", content: `Practise this ${loaderData.q.type} question from GATE CSE ${loaderData.q.year}, with a worked solution.` },
          { property: "og:title", content: `GATE ${loaderData.q.year} Q${loaderData.q.number} — GATE Grind` },
          { property: "og:description", content: "Answer it and check the worked solution." },
        ]
      : [{ title: "Question unavailable — GATE Grind" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: () => (
    <div className="neo-box mx-auto max-w-md text-center">
      <h1 className="text-xl">Question not found</h1>
      <Link to="/pyq" className="neo-btn mt-4">Back to PYQs</Link>
    </div>
  ),
  component: Practice,
});

function Practice() {
  const { q } = Route.useLoaderData();
  const navigate = useNavigate();
  const [, setAttempts] = useAttempts();
  const [attempts] = useAttempts();
  const { has, toggle } = useBookmarks();
  const [response, setResponse] = useState<Response>(undefined);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setResponse(undefined);
    setRevealed(false);
  }, [q.id]);

  const idx = questions.findIndex((x) => x.id === q.id);
  const prev = questions[idx - 1];
  const next = questions[idx + 1];
  const hasAnswer = Array.isArray(response) ? response.length > 0 : !!response;
  const correct = revealed && isCorrect(q, response);

  const submit = () => {
    if (!hasAnswer || revealed) return;
    setRevealed(true);
    setAttempts((a) => ({ ...a, [q.id]: { qid: q.id, correct: isCorrect(q, response), at: Date.now() } }));
  };
  const go = (id?: string) => id && navigate({ to: "/practice/$questionId", params: { questionId: id } });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select")) {
        if (e.key === "Enter") submit();
        return;
      }
      const k = e.key.toUpperCase();
      if (q.options && ["A", "B", "C", "D"].includes(k) && !revealed) {
        setResponse((r) => {
          const sel = Array.isArray(r) ? r : [];
          return q.type === "MCQ" ? [k] : sel.includes(k) ? sel.filter((x) => x !== k) : [...sel, k];
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
    <div className="grid gap-8 lg:grid-cols-[1fr_260px]">
      <div className="min-w-0">
        <nav className="mb-4 flex items-center gap-2 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link to="/pyq" className="hover:text-text-h">PYQ</Link>/
          <Link to="/pyq" search={{ subject: q.subjectId }} className="hover:text-text-h">{subjectById(q.subjectId)?.short}</Link>/
          <span className="text-text-h">{topicName(q.subjectId, q.topicId)}</span>
        </nav>

        <article className="neo-box">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
            <div>
              <h1 className="mb-2 text-xl">Question {q.number}</h1>
              <QuestionMeta q={q} />
            </div>
            <button onClick={() => toggle(q.id)} className={cn("neo-btn px-2.5", has(q.id) && "neo-btn-primary")} aria-pressed={has(q.id)} aria-label="Bookmark">
              <Bookmark className={cn("size-4", has(q.id) && "fill-current")} />
            </button>
          </div>
          <QuestionView q={q} response={response} onChange={setResponse} revealed={revealed} />
        </article>

        <div className="sticky bottom-0 z-10 -mx-4 mt-4 flex flex-wrap items-center gap-2 border-t border-border bg-background px-4 py-3 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
          <button className="neo-btn" onClick={() => go(prev?.id)} disabled={!prev}><ArrowLeft className="size-4" /> Prev</button>
          {revealed ? (
            <button className="neo-btn" onClick={() => { setResponse(undefined); setRevealed(false); }}><RotateCcw className="size-4" /> Retry</button>
          ) : (
            <button className="neo-btn neo-btn-primary" onClick={submit} disabled={!hasAnswer}>Check answer</button>
          )}
          {!revealed && <button className="neo-btn neo-btn-ghost" onClick={() => setRevealed(true)}>Show solution</button>}
          <button className="neo-btn ml-auto" onClick={() => go(next?.id)} disabled={!next}>Next <ArrowRight className="size-4" /></button>
        </div>

        {revealed && <SolutionPanel q={q} correct={correct} response={response} />}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="neo-box p-4">
          <div className="neo-label mb-3">Question navigator</div>
          <div className="grid grid-cols-6 gap-1.5">
            {questions.map((x, i) => {
              const a = attempts[x.id];
              return (
                <Link
                  key={x.id}
                  to="/practice/$questionId"
                  params={{ questionId: x.id }}
                  aria-label={`Question ${i + 1}`}
                  aria-current={x.id === q.id ? "true" : undefined}
                  className={cn(
                    "flex aspect-square items-center justify-center border border-border text-[11px]",
                    x.id === q.id && "bg-primary text-primary-foreground",
                    x.id !== q.id && a?.correct && "border-success bg-success-bg text-success",
                    x.id !== q.id && a && !a.correct && "border-danger bg-danger-bg text-danger",
                  )}
                >
                  {i + 1}
                </Link>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
            <span><span className="mr-1 inline-block size-2 border border-success bg-success-bg" />correct</span>
            <span><span className="mr-1 inline-block size-2 border border-danger bg-danger-bg" />wrong</span>
          </div>
        </div>
        <div className="neo-box hidden p-4 text-xs lg:block">
          <div className="neo-label mb-2">Keyboard</div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
            {[["A–D", "select option"], ["Enter", "check answer"], ["N / →", "next"], ["P / ←", "previous"], ["S", "bookmark"], ["/", "search"]].map(([k, v]) => (
              <div key={k} className="contents"><dt><kbd className="neo-pill">{k}</kbd></dt><dd>{v}</dd></div>
            ))}
          </dl>
        </div>
      </aside>
    </div>
  );
}
