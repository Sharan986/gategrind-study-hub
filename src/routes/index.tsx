import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { ProgressBar, Stat } from "@/components/gg/primitives";
import { useAttempts, useBookmarks } from "@/hooks/use-local-store";
import { questions, questionById } from "@/data/questions";
import { subjects, subjectById, totalQuestions } from "@/data/subjects";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GATE Grind — Your GATE CSE study desk" },
      { name: "description", content: "Practise GATE CSE previous-year questions by subject, take mock tests and track your preparation." },
      { property: "og:title", content: "GATE Grind — Your GATE CSE study desk" },
      { property: "og:description", content: "PYQs, papers, mocks and syllabus tracking for GATE CSE." },
    ],
  }),
  component: Home,
});

const DAILY_GOAL = 15;

function Home() {
  const [attempts] = useAttempts();
  const { bookmarks } = useBookmarks();
  const list = Object.values(attempts).sort((a, b) => b.at - a.at);
  const solved = list.length;
  const correct = list.filter((a) => a.correct).length;
  const accuracy = solved ? Math.round((correct / solved) * 100) : 0;
  const today = list.filter((a) => new Date(a.at).toDateString() === new Date().toDateString()).length;
  const next = questions.find((q) => !attempts[q.id]) ?? questions[0]!;

  // weak areas: subjects with lowest accuracy among attempted
  const bySub = new Map<string, { n: number; c: number }>();
  list.forEach((a) => {
    const q = questionById(a.qid);
    if (!q) return;
    const s = bySub.get(q.subjectId) ?? { n: 0, c: 0 };
    s.n++;
    if (a.correct) s.c++;
    bySub.set(q.subjectId, s);
  });
  const weak = [...bySub.entries()].map(([id, s]) => ({ id, acc: Math.round((s.c / s.n) * 100) })).sort((a, b) => a.acc - b.acc).slice(0, 3);

  return (
    <div className="space-y-14">
      {/* Hero */}
      <section className="grid gap-8 border-b border-border pb-12 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div>
          <div className="neo-label mb-3">GATE CSE · 2027 cycle</div>
          <h1 className="text-4xl leading-[1.05] md:text-6xl">
            Grind every PYQ.<br />
            <span className="bg-primary px-2 text-primary-foreground">Know</span> every topic.
          </h1>
          <p className="mt-5 max-w-xl text-sm text-muted-foreground">
            Previous-year questions sorted by subject and topic, full papers, timed mock tests and syllabus tracking, all in one quiet place.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/practice/$questionId" params={{ questionId: next.id }} className="neo-btn neo-btn-primary">
              Start practising <ArrowRight className="size-4" />
            </Link>
            <Link to="/browse" className="neo-btn">Browse subjects</Link>
          </div>
        </div>
        <div className="neo-box relative">
          <span className="absolute -top-4 right-4 rotate-2 bg-background px-1 font-hand text-xl text-text-h">today's target</span>
          <div className="flex items-baseline justify-between">
            <span className="font-heading text-5xl font-semibold text-text-h">{today}<span className="text-2xl text-muted-foreground">/{DAILY_GOAL}</span></span>
            <span className="neo-pill">questions</span>
          </div>
          <ProgressBar value={(today / DAILY_GOAL) * 100} className="mt-4" label="Daily target" />
          <p className="mt-3 text-xs text-muted-foreground">{today >= DAILY_GOAL ? "Target met. Keep the streak going." : `${DAILY_GOAL - today} more to hit today's goal.`}</p>
        </div>
      </section>

      {/* Overview */}
      <section>
        <h2 className="mb-4 text-xl">Overview</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Solved" value={solved} hint={`of ${questions.length} demo questions`} />
          <Stat label="Accuracy" value={`${accuracy}%`} hint={`${correct} correct`} />
          <Stat label="Bookmarked" value={bookmarks.length} hint="saved for revision" />
          <Stat label="Subjects" value={subjects.length} hint="GATE CSE + aptitude" />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {/* Continue learning */}
        <div className="neo-box lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl">Continue learning</h2>
            <Link to="/pyq" className="text-xs underline underline-offset-4 hover:text-text-h">all questions</Link>
          </div>
          <Link to="/practice/$questionId" params={{ questionId: next.id }} className="neo-box-sm block p-4 hover:-translate-y-px">
            <div className="neo-label">{subjectById(next.subjectId)?.name} · GATE {next.year}</div>
            <p className="mt-1 line-clamp-2 text-sm text-text-h">{next.body.replace(/\$/g, "")}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-text-h">Resume <ArrowRight className="size-3" /></span>
          </Link>
          <h3 className="mb-2 mt-6 text-sm">Recent activity</h3>
          {list.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing here yet. Questions you attempt will show up here.</p>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {list.slice(0, 5).map((a) => {
                const q = questionById(a.qid)!;
                return (
                  <li key={a.qid} className="flex items-center justify-between py-2 text-xs">
                    <Link to="/practice/$questionId" params={{ questionId: q.id }} className="truncate text-text-h hover:underline">
                      {subjectById(q.subjectId)?.code} · Q{q.number} · GATE {q.year}
                    </Link>
                    <span className={a.correct ? "text-success" : "text-danger"}>{a.correct ? "correct" : "wrong"}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Weak areas */}
        <div className="neo-box">
          <h2 className="mb-4 text-xl">Weak areas</h2>
          {weak.length === 0 ? (
            <p className="text-xs text-muted-foreground">Attempt a few questions and your weakest subjects will show up here.</p>
          ) : (
            <ul className="space-y-4">
              {weak.map((w) => (
                <li key={w.id}>
                  <div className="mb-1 flex justify-between text-xs"><span className="text-text-h">{subjectById(w.id)?.name}</span><span>{w.acc}%</span></div>
                  <ProgressBar value={w.acc} label={`${subjectById(w.id)?.name} accuracy`} />
                </li>
              ))}
            </ul>
          )}
          <Link to="/planner" className="neo-btn mt-6 w-full">Open planner</Link>
        </div>
      </section>

      {/* Quick access */}
      <section>
        <h2 className="mb-4 text-xl">Quick access</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { to: "/pyq", t: "Previous year questions", d: "Filter by year, subject and type" },
            { to: "/papers", t: "Full papers", d: "Attempt GATE papers year by year" },
            { to: "/mocks", t: "Mock tests", d: "Timed tests with GATE marking" },
            { to: "/syllabus", t: "Syllabus tracker", d: "Tick off topics as you go" },
          ].map((c) => (
            <Link key={c.to} to={c.to} className="neo-box-sm group p-4 hover:-translate-y-0.5">
              <h3 className="text-base">{c.t}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{c.d}</p>
              <ArrowRight className="mt-3 size-4 text-text-h transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      </section>

      {/* Subjects strip */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl">Continue studying</h2>
          <Link to="/browse" className="text-xs underline underline-offset-4 hover:text-text-h">all subjects</Link>
        </div>
        <div className="grid grid-cols-2 border-l border-t border-border sm:grid-cols-3 lg:grid-cols-6">
          {subjects.map((s) => (
            <Link key={s.id} to="/pyq" search={{ subject: s.id }} className="border-b border-r border-border p-4 hover:bg-subtle">
              <div className="neo-label">{s.code}</div>
              <div className="mt-1 font-heading text-sm font-semibold text-text-h">{s.short}</div>
              <div className="mt-2 text-[11px] text-muted-foreground">{totalQuestions(s)} Qs</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
