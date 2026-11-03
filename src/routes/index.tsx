import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Flame, Sparkles, Target, Zap } from "lucide-react";
import { ProgressBar, Stat, SUBJECT_COLORS } from "@/components/gg/primitives";
import { useAttempts, useBookmarks } from "@/hooks/use-local-store";
import { questions, questionById } from "@/data/questions";
import { subjects, subjectById, totalQuestions } from "@/data/subjects";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GATE Grind — The Neo-Brutalist GATE CSE Study Hub" },
      {
        name: "description",
        content:
          "Practise GATE CSE and IT previous-year questions by subject, take timed mock exams and track your preparation.",
      },
      { property: "og:title", content: "GATE Grind — The Neo-Brutalist GATE CSE Study Hub" },
      {
        property: "og:description",
        content: "PYQs, past papers, timed mocks and syllabus tracking for GATE CSE.",
      },
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
  const today = list.filter(
    (a) => new Date(a.at).toDateString() === new Date().toDateString(),
  ).length;
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
  const weak = [...bySub.entries()]
    .map(([id, s]) => ({ id, acc: Math.round((s.c / s.n) * 100) }))
    .sort((a, b) => a.acc - b.acc)
    .slice(0, 3);

  return (
    <div className="space-y-14">
      {/* Hero Section */}
      <section className="grid gap-8 border-b-2 border-border pb-12 lg:grid-cols-[1.35fr_1fr] lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="neo-sticker bg-neo-yellow text-black rotate-[-1deg] text-[10.5px]">
              ★ GATE CSE + IT · 2027 CYCLE
            </span>
            <span className="neo-sticker bg-neo-cyan text-black rotate-[1deg] text-[10.5px]">
              ⚡ {questions.length.toLocaleString()} SOURCE-LINKED PYQS
            </span>
          </div>
          <h1 className="text-4xl font-black leading-[1.05] tracking-tight md:text-6xl text-text-h">
            Grind every PYQ.
            <br />
            <span className="inline-block border-2 border-border bg-neo-yellow px-2.5 py-0.5 text-black shadow-[4px_4px_0_var(--border)] rotate-[-1deg] mr-2">
              Know
            </span>
            every topic.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground font-medium">
            {questions.length.toLocaleString()} CSE and IT previous-year questions sorted by
            subject, topic and paper year. Timed practice, a syllabus checklist, and source links
            for verification.
          </p>
          <div className="mt-7 flex flex-wrap gap-3.5">
            <Link
              to="/practice/$questionId"
              params={{ questionId: next.id }}
              className="neo-btn neo-btn-primary text-sm px-5 py-2.5 shadow-[4px_4px_0_var(--border)] hover:shadow-[6px_6px_0_var(--border)] font-black"
            >
              Start practising <ArrowRight className="size-4 stroke-[2.5]" />
            </Link>
            <Link
              to="/browse"
              className="neo-btn bg-neo-cyan text-black hover:bg-neo-cyan/85 px-5 py-2.5 shadow-[4px_4px_0_var(--border)] font-black"
            >
              Browse subjects
            </Link>
          </div>
        </div>

        {/* Today's Target Card */}
        <div className="neo-box border-2 border-border shadow-[6px_6px_0_var(--border)] bg-[#FFFDF0] dark:bg-surface relative">
          <span className="absolute -top-3.5 right-4 rotate-2 bg-neo-pink px-2.5 py-0.5 font-hand text-base font-bold text-white border-2 border-border shadow-[2px_2px_0_var(--border)]">
            daily goal
          </span>
          <div className="flex items-baseline justify-between">
            <span className="font-heading text-5xl font-black text-text-h tracking-tight">
              {today}
              <span className="text-2xl text-muted-foreground font-bold">/{DAILY_GOAL}</span>
            </span>
            <span className="neo-pill bg-neo-yellow text-black border-border shadow-[1.5px_1.5px_0_var(--border)] font-black text-xs">
              questions
            </span>
          </div>
          <ProgressBar
            value={(today / DAILY_GOAL) * 100}
            className="mt-4"
            label="Daily target"
            color="green"
          />
          <p className="mt-3 text-xs font-semibold text-muted-foreground">
            {today >= DAILY_GOAL
              ? "🔥 Target met! Keep the streak going."
              : `🎯 ${DAILY_GOAL - today} more questions to hit today's goal.`}
          </p>
        </div>
      </section>

      {/* Overview Stats */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="size-5 text-neo-yellow fill-neo-yellow" />
          <h2 className="text-2xl font-black tracking-tight">Overview</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat
            label="Solved"
            value={solved}
            hint={`of ${questions.length} questions`}
            color="yellow"
          />
          <Stat label="Accuracy" value={`${accuracy}%`} hint={`${correct} correct`} color="green" />
          <Stat
            label="Bookmarked"
            value={bookmarks.length}
            hint="saved for revision"
            color="pink"
          />
          <Stat label="Subjects" value={subjects.length} hint="GATE CSE + Aptitude" color="cyan" />
        </div>
      </section>

      {/* Middle Grid: Continue learning & Weak areas */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Continue learning */}
        <div className="neo-box border-2 border-border shadow-[6px_6px_0_var(--border)] lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-3 bg-neo-green border-2 border-border inline-block shadow-[1px_1px_0_var(--border)]" />
              <h2 className="text-xl font-extrabold tracking-tight">Continue learning</h2>
            </div>
            <Link
              to="/pyq"
              className="text-xs font-bold underline underline-offset-4 hover:text-neo-pink"
            >
              all {questions.length.toLocaleString()} questions →
            </Link>
          </div>
          <Link
            to="/practice/$questionId"
            params={{ questionId: next.id }}
            className="neo-box-sm block p-4.5 border-2 border-border bg-[#FFF9C4]/30 dark:bg-[#2A240A]/30 hover:-translate-x-0.5 hover:-translate-y-1 hover:shadow-[5px_5px_0_var(--border)] transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="neo-label text-xs font-black">
                {subjectById(next.subjectId)?.name} · GATE {next.year}
              </div>
              <span className="neo-pill bg-neo-yellow text-black border-border shadow-[1px_1px_0_var(--border)] font-bold text-[10px]">
                {next.type}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-text-h font-medium">
              {next.body.replace(/\$/g, "")}
            </p>
            <span className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-black text-text-h">
              Resume Question <ArrowRight className="size-3.5 stroke-[3]" />
            </span>
          </Link>

          <h3 className="mb-2.5 mt-6 text-xs uppercase tracking-wider font-extrabold text-muted-foreground">
            Recent activity
          </h3>
          {list.length === 0 ? (
            <p className="text-xs text-muted-foreground font-medium">
              Nothing attempted yet. Questions you solve will appear here.
            </p>
          ) : (
            <ul className="divide-y-2 divide-border border-y-2 border-border">
              {list
                .map((a) => ({ a, q: questionById(a.qid) }))
                .filter(
                  (
                    item,
                  ): item is {
                    a: (typeof list)[number];
                    q: NonNullable<ReturnType<typeof questionById>>;
                  } => !!item.q,
                )
                .slice(0, 5)
                .map(({ a, q }) => {
                  return (
                    <li key={a.qid} className="flex items-center justify-between py-2.5 text-xs">
                      <Link
                        to="/practice/$questionId"
                        params={{ questionId: q.id }}
                        className="truncate text-text-h font-bold hover:underline"
                      >
                        {subjectById(q.subjectId)?.code} · Q{q.number} · GATE {q.year}
                      </Link>
                      <span
                        className={cn(
                          "neo-pill font-black text-[10px]",
                          a.correct
                            ? "bg-neo-green text-black border-border shadow-[1px_1px_0_var(--border)]"
                            : "bg-neo-pink text-white border-border shadow-[1px_1px_0_var(--border)]",
                        )}
                      >
                        {a.correct ? "CORRECT" : "WRONG"}
                      </span>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>

        {/* Weak areas */}
        <div className="neo-box border-2 border-border shadow-[6px_6px_0_var(--border)]">
          <div className="flex items-center gap-2 mb-4">
            <Target className="size-5 text-neo-pink" />
            <h2 className="text-xl font-extrabold tracking-tight">Weak areas</h2>
          </div>
          {weak.length === 0 ? (
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
              Attempt a few questions and your weakest subjects will automatically calibrate here.
            </p>
          ) : (
            <ul className="space-y-4">
              {weak.map((w) => (
                <li
                  key={w.id}
                  className="border-2 border-border p-3 bg-surface shadow-[2px_2px_0_var(--border)]"
                >
                  <div className="mb-1.5 flex justify-between text-xs font-bold">
                    <span className="text-text-h">{subjectById(w.id)?.name}</span>
                    <span className="text-neo-pink font-extrabold">{w.acc}%</span>
                  </div>
                  <ProgressBar
                    value={w.acc}
                    label={`${subjectById(w.id)?.name} accuracy`}
                    color={w.acc < 50 ? "pink" : "primary"}
                  />
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/planner"
            className="neo-btn bg-neo-yellow text-black hover:bg-neo-yellow/85 mt-6 w-full font-black shadow-[3px_3px_0_var(--border)]"
          >
            Open study planner →
          </Link>
        </div>
      </section>

      {/* Quick access cards */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="size-5 text-neo-cyan" />
          <h2 className="text-2xl font-black tracking-tight">Quick access</h2>
        </div>
        <div className="grid gap-4.5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              to: "/pyq",
              t: "Previous Year Questions",
              d: `Filter ${questions.length.toLocaleString()} CSE and IT questions by year, subject, and topic`,
              tag: `${questions.length.toLocaleString()} Qs`,
              color: "bg-[#FFF9C4]/40 dark:bg-[#2A240A]/40",
              tagColor: "bg-neo-yellow",
            },
            {
              to: "/papers",
              t: "Full Past Papers",
              d: "Official GATE papers year-by-year with exact sets",
              tag: "2015–2025",
              color: "bg-[#E0F7FA]/40 dark:bg-[#082832]/40",
              tagColor: "bg-neo-cyan",
            },
            {
              to: "/mocks",
              t: "Timed Mock Tests",
              d: "65-question / 100-mark mock exams with GATE scoring",
              tag: "Exam Mode",
              color: "bg-[#FFE4E8]/40 dark:bg-[#34111A]/40",
              tagColor: "bg-neo-pink text-white",
            },
            {
              to: "/syllabus",
              t: "Syllabus Tracker",
              d: "Track your revision checklist across all 12 modules",
              tag: "Checklist",
              color: "bg-[#DCFCE7]/40 dark:bg-[#0F2E1E]/40",
              tagColor: "bg-neo-green",
            },
          ].map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className={cn(
                "border-2 border-border p-4.5 shadow-[4px_4px_0_var(--border)] hover:-translate-x-0.5 hover:-translate-y-1 hover:shadow-[6px_6px_0_var(--border)] transition-all flex flex-col justify-between group",
                c.color,
              )}
            >
              <div>
                <span
                  className={cn(
                    "neo-sticker text-[9.5px] font-black rotate-[-1deg] mb-3 inline-block",
                    c.tagColor,
                  )}
                >
                  {c.tag}
                </span>
                <h3 className="text-base font-extrabold text-text-h">{c.t}</h3>
                <p className="mt-1.5 text-xs text-muted-foreground font-medium leading-relaxed">
                  {c.d}
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-black text-text-h">
                <span>Explore</span>
                <ArrowRight className="size-3.5 stroke-[3] transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Continue studying: All Subjects with authentic color badges */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="size-5 text-neo-orange" />
            <h2 className="text-2xl font-black tracking-tight">Continue studying</h2>
          </div>
          <Link
            to="/browse"
            className="text-xs font-bold underline underline-offset-4 hover:text-neo-pink"
          >
            browse all subjects →
          </Link>
        </div>
        <div className="grid grid-cols-2 border-l-2 border-t-2 border-border sm:grid-cols-3 lg:grid-cols-6 bg-surface shadow-[4px_4px_0_var(--border)]">
          {subjects.map((s) => {
            const conf = SUBJECT_COLORS[s.id] ?? {
              bg: "bg-surface",
              badge: "bg-neo-yellow text-black",
            };
            return (
              <Link
                key={s.id}
                to="/pyq"
                search={{ subject: s.id }}
                className="border-b-2 border-r-2 border-border p-4 hover:bg-subtle transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "neo-pill font-black text-[10px] border-border shadow-[1px_1px_0_var(--border)]",
                      conf.badge,
                    )}
                  >
                    {s.code}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {totalQuestions(s)} Qs
                  </span>
                </div>
                <div className="mt-2.5 font-heading text-sm font-bold text-text-h group-hover:underline">
                  {s.short}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
