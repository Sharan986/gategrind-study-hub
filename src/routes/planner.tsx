import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Plus, Trash2, Calendar, Target } from "lucide-react";
import { useState } from "react";
import { PageHeader, Pill, ProgressBar, SubjectBadge } from "@/components/gg/primitives";
import { questionById } from "@/data/questions";
import { subjectById, subjects } from "@/data/subjects";
import { useAttempts, useLocalStore } from "@/hooks/use-local-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "Study planner — GATE Grind" },
      {
        name: "description",
        content: "Plan your GATE CSE week, set daily goals and see which topics need more work.",
      },
      { property: "og:title", content: "GATE study planner — GATE Grind" },
      { property: "og:description", content: "A weekly GATE CSE study plan with daily goals." },
    ],
  }),
  component: Planner,
});

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
interface Task {
  id: string;
  day: number;
  subjectId: string;
  text: string;
  done: boolean;
}

const DEFAULT: Task[] = [
  { id: "1", day: 0, subjectId: "os", text: "Scheduling PYQs (20 questions)", done: false },
  { id: "2", day: 0, subjectId: "ga", text: "10 quant aptitude drills", done: true },
  { id: "3", day: 1, subjectId: "dbms", text: "Normal forms & B+ tree revision", done: false },
  { id: "4", day: 2, subjectId: "toc", text: "Pumping lemma & closure problems", done: false },
  { id: "5", day: 3, subjectId: "cn", text: "Subnetting & TCP congestion drill", done: false },
  { id: "6", day: 5, subjectId: "algo", text: "Full length mock test analysis", done: false },
];

function Planner() {
  const [tasks, setTasks] = useLocalStore<Task[]>("gg:planner", DEFAULT);
  const [attempts] = useAttempts();
  const [day, setDay] = useState((new Date().getDay() + 6) % 7);
  const [text, setText] = useState("");
  const [sub, setSub] = useState("pds");
  const done = tasks.filter((t) => t.done).length;

  const add = () => {
    if (!text.trim()) return;
    setTasks((t) => [
      ...t,
      { id: String(Date.now()), day, subjectId: sub, text: text.trim(), done: false },
    ]);
    setText("");
  };

  const stats = new Map<string, { n: number; c: number }>();
  Object.values(attempts).forEach((a) => {
    const q = questionById(a.qid);
    if (!q) return;
    const s = stats.get(q.subjectId) ?? { n: 0, c: 0 };
    s.n++;
    if (a.correct) s.c++;
    stats.set(q.subjectId, s);
  });
  const recs = subjects
    .map((s) => ({ s, st: stats.get(s.id) }))
    .sort((a, b) => (a.st ? a.st.c / a.st.n : -1) - (b.st ? b.st.c / b.st.n : -1))
    .slice(0, 4);

  return (
    <>
      <PageHeader
        eyebrow="Weekly Schedule"
        title="Study Planner"
        description="Structure your preparation targets subject by subject. Syncs with your local progress."
      >
        <div className="w-64 border-2 border-border bg-surface p-3 shadow-[3px_3px_0_var(--border)]">
          <div className="mb-1.5 flex justify-between text-xs font-black">
            <span>Weekly Target</span>
            <span className="neo-pill bg-neo-yellow text-black border-border shadow-[1px_1px_0_var(--border)] font-black text-[10px]">
              {done}/{tasks.length} Done
            </span>
          </div>
          <ProgressBar
            value={tasks.length ? (done / tasks.length) * 100 : 0}
            label="Weekly progress"
            color="green"
          />
        </div>
      </PageHeader>

      <div className="grid gap-8 lg:grid-cols-[1fr_310px]">
        <div>
          {/* Day Tabs */}
          <div className="grid grid-cols-7 border-l-2 border-t-2 border-border bg-surface shadow-[4px_4px_0_var(--border)]">
            {DAYS.map((d, i) => {
              const n = tasks.filter((t) => t.day === i);
              const isSel = day === i;
              return (
                <button
                  key={d}
                  onClick={() => setDay(i)}
                  aria-pressed={isSel}
                  className={cn(
                    "border-b-2 border-r-2 border-border p-3 text-left transition-all cursor-pointer",
                    isSel ? "bg-neo-yellow text-black font-black" : "hover:bg-subtle",
                  )}
                >
                  <div className="text-xs font-black">{d}</div>
                  <div className="mt-1 text-[10.5px] font-bold opacity-80">
                    {n.filter((t) => t.done).length}/{n.length}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Daily Tasks Card */}
          <div className="neo-box mt-6 border-2 border-border bg-surface shadow-[6px_6px_0_var(--border)]">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="size-5 text-neo-pink" />
              <h2 className="text-xl font-black text-text-h">{DAYS[day]}'s Plan</h2>
            </div>
            <form
              className="mb-5 flex flex-col gap-2.5 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                add();
              }}
            >
              <select
                className="neo-input font-bold sm:w-44"
                value={sub}
                onChange={(e) => setSub(e.target.value)}
                aria-label="Subject"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.short}
                  </option>
                ))}
              </select>
              <input
                className="neo-input font-medium"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. 20 PYQs on Paging & TLB"
                aria-label="Task description"
              />
              <button className="neo-btn neo-btn-primary font-black px-5 shrink-0" type="submit">
                <Plus className="size-4 stroke-[3]" /> Add Task
              </button>
            </form>
            {tasks.filter((t) => t.day === day).length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground font-semibold border-2 border-dashed border-border p-4 bg-subtle/50">
                No tasks scheduled for {DAYS[day]} yet. Add a focus topic above!
              </div>
            ) : (
              <ul className="divide-y-2 divide-border border-y-2 border-border">
                {tasks
                  .filter((t) => t.day === day)
                  .map((t) => (
                    <li key={t.id} className="flex items-center gap-3 py-3">
                      <button
                        role="checkbox"
                        aria-checked={t.done}
                        aria-label={t.text}
                        onClick={() =>
                          setTasks((l) =>
                            l.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)),
                          )
                        }
                        className={cn(
                          "flex size-5.5 items-center justify-center border-2 border-border font-black transition-all cursor-pointer",
                          t.done
                            ? "bg-neo-green text-black border-border shadow-[1px_1px_0_var(--border)]"
                            : "bg-surface hover:bg-neo-yellow/30",
                        )}
                      >
                        {t.done && <Check className="size-3.5 stroke-[3]" />}
                      </button>
                      <SubjectBadge subjectId={t.subjectId} />
                      <span
                        className={cn(
                          "flex-1 text-sm font-semibold",
                          t.done
                            ? "text-muted-foreground line-through decoration-2"
                            : "text-text-h",
                        )}
                      >
                        {t.text}
                      </span>
                      <button
                        onClick={() => setTasks((l) => l.filter((x) => x.id !== t.id))}
                        aria-label="Delete task"
                        className="text-muted-foreground hover:text-danger cursor-pointer transition-colors p-1"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="neo-box h-fit border-2 border-border bg-surface shadow-[4px_4px_0_var(--border)]">
          <div className="flex items-center gap-2 mb-2">
            <Target className="size-5 text-neo-cyan" />
            <h2 className="text-xl font-black tracking-tight">Recommended Focus</h2>
          </div>
          <p className="mb-4 text-xs text-muted-foreground font-medium leading-relaxed">
            Prioritized by your historical accuracy and unattempted syllabus units.
          </p>
          <ul className="space-y-3">
            {recs.map(({ s, st }) => (
              <li
                key={s.id}
                className="neo-box-sm p-3.5 border-2 border-border bg-subtle/60 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--border)] transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-text-h">{s.name}</span>
                  <span
                    className={cn(
                      "neo-pill font-black text-[10px] border-border shadow-[1px_1px_0_var(--border)]",
                      st
                        ? st.c / st.n < 0.5
                          ? "bg-neo-pink text-white"
                          : "bg-neo-green text-black"
                        : "bg-neo-yellow text-black",
                    )}
                  >
                    {st ? `${Math.round((st.c / st.n) * 100)}% Acc` : "Untested"}
                  </span>
                </div>
                <Link
                  to="/pyq"
                  search={{ subject: s.id }}
                  className="mt-2.5 inline-block text-xs font-bold underline underline-offset-4 text-text-h hover:text-neo-pink"
                >
                  Practise {s.short} PYQs →
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}
